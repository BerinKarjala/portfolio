// Server-only authority. All counter changes and request transitions share one SQLite transaction.
export const LIMITS = Object.freeze({
  prompts: 10,
  images: 3,
  neurons: 8000,
  inFlight: 2,
  burstMs: 5000,
  requestMs: 30000,
  retentionMs: 72 * 60 * 60 * 1000,
});
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const utcDay = (now) => new Date(now).toISOString().slice(0, 10);
const denied = (code, status = 429, retryAfter = 1) => ({
  admitted: false,
  code,
  status,
  retryAfter,
});
export class QuotaLedger {
  constructor(storage, { clock = Date.now } = {}) {
    this.storage = storage;
    this.clock = clock;
    storage.transactionSync(() => {
      this.exec(
        "CREATE TABLE IF NOT EXISTS days (day TEXT PRIMARY KEY, neurons INTEGER NOT NULL DEFAULT 0, halted INTEGER NOT NULL DEFAULT 0)",
      );
      this.exec(
        "CREATE TABLE IF NOT EXISTS visitors (day TEXT NOT NULL, visitor TEXT NOT NULL, prompts INTEGER NOT NULL, images INTEGER NOT NULL, last_at INTEGER NOT NULL, PRIMARY KEY(day,visitor))",
      );
      this.exec(
        "CREATE TABLE IF NOT EXISTS reservations (visitor TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, operation TEXT NOT NULL, day TEXT NOT NULL, reserved INTEGER NOT NULL, started_at INTEGER NOT NULL, deadline INTEGER NOT NULL, status TEXT NOT NULL, PRIMARY KEY(visitor,request_id))",
      );
      this.exec(
        "CREATE TABLE IF NOT EXISTS carry (visitor TEXT NOT NULL, request_id TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY(visitor,request_id,day))",
      );
      this.exec(
        "CREATE INDEX IF NOT EXISTS reservations_pending ON reservations(status,deadline)",
      );
      this.exec(
        "CREATE INDEX IF NOT EXISTS reservations_age ON reservations(started_at)",
      );
      this.exec(
        "CREATE INDEX IF NOT EXISTS reservations_day ON reservations(day)",
      );
      this.exec("CREATE INDEX IF NOT EXISTS carry_day ON carry(day)");
      this.exec(
        "CREATE TABLE IF NOT EXISTS control (id INTEGER PRIMARY KEY, reason TEXT)",
      );
      this.exec("INSERT OR IGNORE INTO control(id,reason) VALUES(1,NULL)");
    });
  }
  exec(query, ...bindings) {
    return this.storage.sql.exec(query, ...bindings).toArray();
  }
  refresh(now) {
    const day = utcDay(now),
      cutoff = now - LIMITS.retentionMs,
      cutoffDay = utcDay(cutoff);
    this.exec("INSERT OR IGNORE INTO days(day) VALUES(?)", day);
    const expired = this.exec(
      "SELECT request_id FROM reservations WHERE status='pending' AND deadline<=?",
      now,
    );
    if (expired.length) {
      this.exec(
        "UPDATE reservations SET status='uncertain' WHERE status='pending' AND deadline<=?",
        now,
      );
      this.exec("UPDATE control SET reason='accounting-uncertain' WHERE id=1");
    }
    // A previous-day request may consume provider compute after midnight. Hold its full bound in each overlapping day too.
    for (const row of this.exec(
      "SELECT visitor,request_id,reserved FROM reservations WHERE day<>? AND status IN ('pending','uncertain')",
      day,
    )) {
      if (
        !this.exec(
          "SELECT 1 FROM carry WHERE visitor=? AND request_id=? AND day=?",
          row.visitor,
          row.request_id,
          day,
        ).length
      ) {
        this.exec(
          "INSERT INTO carry(visitor,request_id,day) VALUES(?,?,?)",
          row.visitor,
          row.request_id,
          day,
        );
        this.exec(
          "UPDATE days SET neurons=neurons+? WHERE day=?",
          row.reserved,
          day,
        );
      }
    }
    this.exec(
      "DELETE FROM reservations WHERE started_at<? AND status NOT IN ('pending','uncertain')",
      cutoff,
    );
    this.exec("DELETE FROM carry WHERE day<?", cutoffDay);
    this.exec("DELETE FROM visitors WHERE day<?", cutoffDay);
    this.exec(
      "DELETE FROM days WHERE day<? AND NOT EXISTS (SELECT 1 FROM reservations WHERE reservations.day=days.day)",
      cutoffDay,
    );
    return day;
  }
  reserve({ visitor, requestId, fingerprint, operation, reservedNeurons }) {
    if (
      !UUID.test(visitor) ||
      !UUID.test(requestId) ||
      !/^[0-9a-f]{64}$/.test(fingerprint) ||
      !["theme", "image", "refine"].includes(operation) ||
      !Number.isSafeInteger(reservedNeurons) ||
      reservedNeurons < 1 ||
      reservedNeurons > LIMITS.neurons
    )
      throw Error("Invalid reservation");
    return this.storage.transactionSync(() => {
      const now = this.clock(),
        day = this.refresh(now),
        retry = Math.max(
          1,
          Math.ceil((Date.parse(day + "T00:00:00Z") + 86400000 - now) / 1000),
        );
      const prior = this.exec(
        "SELECT * FROM reservations WHERE visitor=? AND request_id=?",
        visitor,
        requestId,
      )[0];
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          return denied("idempotency-conflict", 409);
        return denied(
          prior.status === "pending"
            ? "in-progress"
            : prior.status === "complete"
              ? "already-processed"
              : prior.status,
          prior.status === "pending"
            ? 202
            : prior.status === "complete"
              ? 409
              : 503,
        );
      }
      const halt = this.exec("SELECT reason FROM control WHERE id=1")[0]
        ?.reason;
      if (halt) return denied(halt, 503);
      const shared = this.exec("SELECT * FROM days WHERE day=?", day)[0];
      if (shared.halted) return denied("provider-exhausted", 429, retry);
      const count = this.exec(
        "SELECT * FROM visitors WHERE day=? AND visitor=?",
        day,
        visitor,
      )[0] || { prompts: 0, images: 0, last_at: 0 };
      const image = operation === "theme" ? 0 : 1;
      if (count.prompts >= LIMITS.prompts)
        return denied("prompt-limit", 429, retry);
      if (image && count.images >= LIMITS.images)
        return denied("image-limit", 429, retry);
      if (now - count.last_at < LIMITS.burstMs)
        return denied(
          "burst-limit",
          429,
          Math.ceil((LIMITS.burstMs - now + count.last_at) / 1000),
        );
      if (shared.neurons + reservedNeurons > LIMITS.neurons)
        return denied("shared-limit", 429, retry);
      if (
        this.exec(
          "SELECT COUNT(*) AS count FROM reservations WHERE status='pending'",
        )[0].count >= LIMITS.inFlight
      )
        return denied("busy", 429, 1);
      this.exec(
        "INSERT INTO visitors(day,visitor,prompts,images,last_at) VALUES(?,?,?,?,?) ON CONFLICT(day,visitor) DO UPDATE SET prompts=excluded.prompts,images=excluded.images,last_at=excluded.last_at",
        day,
        visitor,
        count.prompts + 1,
        count.images + image,
        now,
      );
      this.exec(
        "UPDATE days SET neurons=neurons+? WHERE day=?",
        reservedNeurons,
        day,
      );
      this.exec(
        "INSERT INTO reservations(visitor,request_id,fingerprint,operation,day,reserved,started_at,deadline,status) VALUES(?,?,?,?,?,?,?,?,'pending')",
        visitor,
        requestId,
        fingerprint,
        operation,
        day,
        reservedNeurons,
        now,
        now + LIMITS.requestMs,
      );
      return {
        admitted: true,
        day,
        requestId,
        reservedNeurons,
        deadline: now + LIMITS.requestMs,
      };
    });
  }
  settle({ visitor, requestId, outcome, measuredNeurons }) {
    if (
      !UUID.test(visitor) ||
      !UUID.test(requestId) ||
      !["complete", "uncertain", "provider-exhausted"].includes(outcome)
    )
      throw Error("Invalid settlement");
    return this.storage.transactionSync(() => {
      const day = this.refresh(this.clock());
      const row = this.exec(
        "SELECT * FROM reservations WHERE visitor=? AND request_id=?",
        visitor,
        requestId,
      )[0];
      if (!row) throw Error("Unknown reservation");
      if (row.status !== "pending")
        return { settled: false, status: row.status };
      let status = outcome;
      if (
        measuredNeurons !== undefined &&
        (!Number.isSafeInteger(measuredNeurons) ||
          measuredNeurons < 0 ||
          measuredNeurons > row.reserved)
      ) {
        status = "uncertain";
        this.exec("UPDATE control SET reason='cost-bound-violated' WHERE id=1");
      } else if (outcome === "complete" && measuredNeurons !== undefined) {
        this.exec(
          "UPDATE days SET neurons=neurons-? WHERE day=?",
          row.reserved - measuredNeurons,
          row.day,
        );
      }
      if (outcome === "uncertain")
        this.exec(
          "UPDATE control SET reason='accounting-uncertain' WHERE id=1",
        );
      if (outcome === "provider-exhausted")
        this.exec("UPDATE days SET halted=1 WHERE day IN (?,?)", row.day, day);
      this.exec(
        "UPDATE reservations SET status=? WHERE visitor=? AND request_id=?",
        status,
        visitor,
        requestId,
      );
      return { settled: status === outcome, status };
    });
  }
  snapshot(visitor) {
    if (!UUID.test(visitor)) throw Error("Invalid visitor");
    return this.storage.transactionSync(() => {
      const day = this.refresh(this.clock()),
        shared = this.exec("SELECT * FROM days WHERE day=?", day)[0];
      const browser = this.exec(
        "SELECT prompts,images FROM visitors WHERE day=? AND visitor=?",
        day,
        visitor,
      )[0] || { prompts: 0, images: 0 };
      const halt = this.exec("SELECT reason FROM control WHERE id=1")[0]
        ?.reason;
      return {
        day,
        available: !halt && !shared.halted,
        remaining: {
          prompts: Math.max(0, LIMITS.prompts - browser.prompts),
          images: Math.max(0, LIMITS.images - browser.images),
        },
        sharedRemaining: Math.max(0, LIMITS.neurons - shared.neurons),
      };
    });
  }
}
