import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { QuotaLedger } from "./quota";
const open = [];
export function sqliteStore() {
  const db = new DatabaseSync(":memory:");
  open.push(db);
  return {
    sql: {
      exec(query, ...params) {
        const statement = db.prepare(query);
        return { toArray: () => statement.all(...params) };
      },
    },
    transactionSync(work) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = work();
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
afterEach(() => {
  while (open.length) open.pop().close();
});
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const input = (n, changes = {}) => ({
  visitor: uuid(1),
  requestId: uuid(n),
  fingerprint: "a".repeat(64),
  operation: "theme",
  reservedNeurons: 10,
  ...changes,
});
function setup() {
  let now = Date.parse("2026-10-20T12:00:00Z");
  const store = sqliteStore();
  const ledger = new QuotaLedger(store, { clock: () => now });
  return { ledger, store, advance: (ms) => (now += ms) };
}
it("atomically counts prompts and images, preserves idempotency, and scopes allowances to browser/day", () => {
  const { ledger, advance } = setup();
  for (let n = 1; n <= 10; n++) {
    const reservation = ledger.reserve(
      input(n, { operation: n <= 3 ? "image" : "theme" }),
    );
    expect(reservation.admitted).toBe(true);
    ledger.settle({
      visitor: uuid(1),
      requestId: uuid(n),
      outcome: "complete",
    });
    advance(5000);
  }
  expect(ledger.reserve(input(11)).code).toBe("prompt-limit");
  expect(
    ledger.reserve(input(12, { visitor: uuid(2), operation: "refine" }))
      .admitted,
  ).toBe(true);
  ledger.settle({ visitor: uuid(2), requestId: uuid(12), outcome: "complete" });
  expect(ledger.reserve(input(1)).code).toBe("already-processed");
  expect(ledger.reserve(input(1, { fingerprint: "b".repeat(64) })).code).toBe(
    "idempotency-conflict",
  );
  const snapshot = ledger.snapshot(uuid(1));
  expect(snapshot.remaining.prompts).toBe(0);
  expect(snapshot.remaining.images).toBe(0);
  advance(24 * 60 * 60 * 1000);
  expect(ledger.reserve(input(13)).admitted).toBe(true);
});
it("enforces shared admission and global in-flight bounds across independent visitors", () => {
  const { ledger } = setup();
  expect(ledger.reserve(input(1, { reservedNeurons: 4000 })).admitted).toBe(
    true,
  );
  expect(
    ledger.reserve(input(2, { visitor: uuid(2), reservedNeurons: 4000 }))
      .admitted,
  ).toBe(true);
  expect(ledger.reserve(input(3, { visitor: uuid(3) })).admitted).toBe(false);
  ledger.settle({ visitor: uuid(1), requestId: uuid(1), outcome: "complete" });
  expect(ledger.reserve(input(3, { visitor: uuid(3) })).code).toBe(
    "shared-limit",
  );
});
it("charges the admission day, conservatively holds cross-midnight cost, and reconciles only trusted measurements", () => {
  const { ledger, advance } = setup();
  advance(12 * 60 * 60 * 1000 - 10000);
  expect(ledger.reserve(input(1, { reservedNeurons: 100 })).admitted).toBe(
    true,
  );
  advance(15000);
  ledger.settle({
    visitor: uuid(1),
    requestId: uuid(1),
    outcome: "complete",
    measuredNeurons: 20,
  });
  expect(ledger.snapshot(uuid(1)).sharedRemaining).toBe(7900);
  expect(ledger.snapshot(uuid(1)).remaining.prompts).toBe(10);
});
it("never refunds ambiguous execution and latches closed after an expired reservation or cost overrun", () => {
  const { ledger, advance } = setup();
  ledger.reserve(input(1));
  advance(31000);
  expect(ledger.reserve(input(2, { visitor: uuid(2) })).code).toBe(
    "accounting-uncertain",
  );
  advance(24 * 60 * 60 * 1000);
  expect(ledger.reserve(input(3, { visitor: uuid(3) })).code).toBe(
    "accounting-uncertain",
  );
});
it("keeps provider exhaustion closed for its UTC day, enforces burst limits, and persists across ledger reconstruction", () => {
  const { ledger, advance, store } = setup();
  ledger.reserve(input(1));
  expect(ledger.reserve(input(1)).code).toBe("in-progress");
  ledger.settle({ visitor: uuid(1), requestId: uuid(1), outcome: "complete" });
  expect(ledger.reserve(input(2)).code).toBe("burst-limit");
  advance(5000);
  ledger.reserve(input(2));
  ledger.settle({
    visitor: uuid(1),
    requestId: uuid(2),
    outcome: "provider-exhausted",
  });
  expect(
    new QuotaLedger(store, {
      clock: () => Date.parse("2026-10-20T12:00:05Z"),
    }).snapshot(uuid(1)).available,
  ).toBe(false);
  advance(24 * 60 * 60 * 1000);
  expect(ledger.reserve(input(3)).admitted).toBe(true);
});

it("rejects a fourth image/refinement independently of the remaining prompt allowance", () => {
  const { ledger, advance } = setup();
  for (let n = 1; n <= 3; n++) {
    expect(
      ledger.reserve(input(n, { operation: n === 3 ? "refine" : "image" }))
        .admitted,
    ).toBe(true);
    ledger.settle({
      visitor: uuid(1),
      requestId: uuid(n),
      outcome: "complete",
    });
    advance(5000);
  }
  expect(ledger.reserve(input(4, { operation: "image" })).code).toBe(
    "image-limit",
  );
  expect(ledger.snapshot(uuid(1)).remaining).toEqual({ prompts: 7, images: 0 });
  expect(ledger.reserve(input(4)).admitted).toBe(true);
});
it("bounds concurrent work even when the shared daily allowance has ample room", () => {
  const { ledger } = setup();
  ledger.reserve(input(1));
  ledger.reserve(input(2, { visitor: uuid(2) }));
  expect(ledger.reserve(input(3, { visitor: uuid(3) })).code).toBe("busy");
});
it("rolls back every reservation write on storage failure and refuses an impossible usage measurement", () => {
  const { ledger, store } = setup();
  const execute = store.sql.exec;
  store.sql.exec = (query, ...args) => {
    if (query.startsWith("INSERT INTO reservations"))
      throw Error("storage failed");
    return execute(query, ...args);
  };
  expect(() => ledger.reserve(input(1))).toThrow("storage failed");
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    remaining: { prompts: 10, images: 3 },
    sharedRemaining: 8000,
  });
  store.sql.exec = execute;
  ledger.reserve(input(1));
  expect(
    ledger.settle({
      visitor: uuid(1),
      requestId: uuid(1),
      outcome: "complete",
      measuredNeurons: 11,
    }).settled,
  ).toBe(false);
  expect(ledger.reserve(input(2, { visitor: uuid(2) })).code).toBe(
    "cost-bound-violated",
  );
});

it("atomically stops the 5,001st monthly transformation across visitors without charging other counters", () => {
  const { ledger } = setup();
  for (let n = 1; n <= 2500; n++) {
    const request = input(n, {
      visitor: uuid(n),
      operation: "refine",
      reservedNeurons: 1,
      imageTransforms: 2,
    });
    expect(ledger.reserve(request).admitted).toBe(true);
    ledger.settle({
      visitor: request.visitor,
      requestId: request.requestId,
      outcome: "complete",
    });
  }
  const before = ledger.snapshot(uuid(2501));
  expect(before).toMatchObject({
    month: "2026-10",
    imageTransformsRemaining: 0,
    sharedRemaining: 5500,
    remaining: { prompts: 10, images: 3 },
  });
  expect(
    ledger.reserve(
      input(2501, {
        visitor: uuid(2501),
        operation: "image",
        reservedNeurons: 1,
        imageTransforms: 1,
      }),
    ),
  ).toMatchObject({
    admitted: false,
    code: "image-transform-limit",
    status: 429,
    retryAfter: 993600,
  });
  expect(ledger.snapshot(uuid(2501))).toEqual(before);
  expect(
    ledger.reserve(
      input(1, {
        visitor: uuid(1),
        operation: "refine",
        reservedNeurons: 1,
        imageTransforms: 2,
      }),
    ).code,
  ).toBe("already-processed");
  expect(
    ledger.reserve(input(2502, { visitor: uuid(2501), reservedNeurons: 1 }))
      .admitted,
  ).toBe(true);
  expect(ledger.snapshot(uuid(2501)).imageTransformsRemaining).toBe(0);
}, 20000);

it("validates transformation bounds before admission and retains charged transforms for all outcomes", () => {
  for (const imageTransforms of [-1, 0.5, 3, NaN, "1", null]) {
    const { ledger } = setup();
    expect(() =>
      ledger.reserve(input(1, { operation: "image", imageTransforms })),
    ).toThrow(/reservation/i);
    expect(ledger.snapshot(uuid(1)).imageTransformsRemaining).toBe(5000);
  }
  const { ledger } = setup();
  expect(() => ledger.reserve(input(1, { imageTransforms: 1 }))).toThrow(
    /reservation/i,
  );
  for (const [index, outcome] of [
    "complete",
    "provider-exhausted",
    "uncertain",
  ].entries()) {
    const separate = setup();
    expect(
      separate.ledger.reserve(
        input(index + 1, { operation: "refine", imageTransforms: 2 }),
      ).admitted,
    ).toBe(true);
    separate.ledger.settle({
      visitor: uuid(1),
      requestId: uuid(index + 1),
      outcome,
      ...(outcome === "complete" ? { measuredNeurons: 0 } : {}),
    });
    expect(separate.ledger.snapshot(uuid(1)).imageTransformsRemaining).toBe(
      4998,
    );
  }
});

it("carries pending transforms across a calendar-month boundary once and preserves the completed charge", () => {
  const { ledger, store, advance } = setup();
  advance(
    Date.parse("2026-10-31T23:59:50Z") - Date.parse("2026-10-20T12:00:00Z"),
  );
  expect(
    ledger.reserve(input(1, { operation: "image", imageTransforms: 2 }))
      .admitted,
  ).toBe(true);
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    month: "2026-10",
    imageTransformsRemaining: 4998,
  });
  advance(15000);
  ledger.settle({
    visitor: uuid(1),
    requestId: uuid(1),
    outcome: "complete",
    measuredNeurons: 0,
  });
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    month: "2026-11",
    imageTransformsRemaining: 4998,
  });
  const reconstructed = new QuotaLedger(store, {
    clock: () => Date.parse("2026-11-01T00:00:05Z"),
  });
  expect(reconstructed.snapshot(uuid(1)).imageTransformsRemaining).toBe(4998);
  expect(reconstructed.snapshot(uuid(1)).imageTransformsRemaining).toBe(4998);
  advance(31 * 86400000);
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    month: "2026-12",
    imageTransformsRemaining: 5000,
  });
});

it("retains uncertain transforms in each overlapping month without double charging or reopening accounting", () => {
  const { ledger, advance, store } = setup();
  advance(
    Date.parse("2026-10-31T23:59:50Z") - Date.parse("2026-10-20T12:00:00Z"),
  );
  ledger.reserve(input(1, { operation: "refine", imageTransforms: 2 }));
  advance(31000);
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    month: "2026-11",
    available: false,
    imageTransformsRemaining: 4998,
  });
  expect(ledger.snapshot(uuid(1)).imageTransformsRemaining).toBe(4998);
  advance(31 * 86400000);
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    month: "2026-12",
    available: false,
    imageTransformsRemaining: 4998,
  });
  expect(
    ledger.reserve(
      input(2, { visitor: uuid(2), operation: "image", imageTransforms: 1 }),
    ).code,
  ).toBe("accounting-uncertain");
  advance(4 * 86400000);
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    month: "2026-12",
    available: false,
    imageTransformsRemaining: 4998,
  });
  expect(
    store.sql
      .exec("SELECT month FROM transform_carry ORDER BY month")
      .toArray()
      .map((row) => row.month),
  ).toEqual(["2026-12"]);
  expect(
    store.sql
      .exec("SELECT month FROM transform_months ORDER BY month")
      .toArray()
      .map((row) => row.month),
  ).toEqual(["2026-10", "2026-12"]);
  expect(
    store.sql.exec("SELECT * FROM reservation_transforms").toArray(),
  ).toHaveLength(1);
  expect(ledger.snapshot(uuid(1)).imageTransformsRemaining).toBe(4998);
});

it("does not forget a month's completed transformations when old request records are pruned", () => {
  const { ledger, store, advance } = setup();
  ledger.reserve(input(1, { operation: "image", imageTransforms: 1 }));
  ledger.settle({ visitor: uuid(1), requestId: uuid(1), outcome: "complete" });
  advance(4 * 86400000);
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    month: "2026-10",
    imageTransformsRemaining: 4999,
  });
  expect(store.sql.exec("SELECT * FROM reservations").toArray()).toHaveLength(
    0,
  );
  expect(
    store.sql.exec("SELECT * FROM reservation_transforms").toArray(),
  ).toHaveLength(0);
  const reconstructed = new QuotaLedger(store, {
    clock: () => Date.parse("2026-10-24T12:00:00Z"),
  });
  expect(reconstructed.snapshot(uuid(1)).imageTransformsRemaining).toBe(4999);
});

it("rolls back monthly and daily charges together when a transformation reservation cannot be persisted", () => {
  const { ledger, store } = setup();
  const execute = store.sql.exec;
  store.sql.exec = (query, ...params) => {
    if (query.startsWith("INSERT INTO reservation_transforms"))
      throw Error("transform storage failed");
    return execute(query, ...params);
  };
  expect(() =>
    ledger.reserve(input(1, { operation: "image", imageTransforms: 2 })),
  ).toThrow("transform storage failed");
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    imageTransformsRemaining: 5000,
    sharedRemaining: 8000,
    remaining: { prompts: 10, images: 3 },
  });
  expect(store.sql.exec("SELECT * FROM reservations").toArray()).toHaveLength(
    0,
  );
});

it("adds monthly tables to the existing authority without resetting legacy counters or idempotency", () => {
  const store = sqliteStore();
  for (const sql of [
    "CREATE TABLE days (day TEXT PRIMARY KEY, neurons INTEGER NOT NULL DEFAULT 0, halted INTEGER NOT NULL DEFAULT 0)",
    "CREATE TABLE visitors (day TEXT NOT NULL, visitor TEXT NOT NULL, prompts INTEGER NOT NULL, images INTEGER NOT NULL, last_at INTEGER NOT NULL, PRIMARY KEY(day,visitor))",
    "CREATE TABLE reservations (visitor TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, operation TEXT NOT NULL, day TEXT NOT NULL, reserved INTEGER NOT NULL, started_at INTEGER NOT NULL, deadline INTEGER NOT NULL, status TEXT NOT NULL, PRIMARY KEY(visitor,request_id))",
  ])
    store.sql.exec(sql).toArray();
  const now = Date.parse("2026-10-20T12:00:00Z");
  store.sql
    .exec("INSERT INTO days(day,neurons) VALUES(?,?)", "2026-10-20", 1234)
    .toArray();
  store.sql
    .exec(
      "INSERT INTO visitors VALUES(?,?,?,?,?)",
      "2026-10-20",
      uuid(1),
      4,
      2,
      now - 5000,
    )
    .toArray();
  store.sql
    .exec(
      "INSERT INTO reservations VALUES(?,?,?,?,?,?,?,?,?)",
      uuid(1),
      uuid(1),
      "a".repeat(64),
      "theme",
      "2026-10-20",
      10,
      now,
      now + 30000,
      "complete",
    )
    .toArray();
  const ledger = new QuotaLedger(store, { clock: () => now });
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    imageTransformsRemaining: 5000,
    sharedRemaining: 6766,
    remaining: { prompts: 6, images: 1 },
  });
  expect(ledger.reserve(input(1)).code).toBe("already-processed");
  expect(
    ledger.reserve(input(2, { operation: "image", imageTransforms: 1 }))
      .admitted,
  ).toBe(true);
  expect(ledger.snapshot(uuid(1)).imageTransformsRemaining).toBe(4999);
});

it("halts only media for the exhausted provider month while text and later months remain usable", () => {
  const { ledger, advance, store } = setup();
  ledger.reserve(input(1, { operation: "refine", imageTransforms: 2 }));
  expect(
    ledger.settle({
      visitor: uuid(1),
      requestId: uuid(1),
      outcome: "image-provider-exhausted",
    }).settled,
  ).toBe(true);
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    available: true,
    imageAvailable: false,
    imageTransformsRemaining: 4998,
  });
  const before = ledger.snapshot(uuid(2));
  expect(
    ledger.reserve(
      input(2, { visitor: uuid(2), operation: "image", imageTransforms: 1 }),
    ),
  ).toMatchObject({ code: "image-provider-exhausted", status: 429 });
  expect(ledger.snapshot(uuid(2))).toEqual(before);
  expect(ledger.reserve(input(2, { visitor: uuid(2) })).admitted).toBe(true);
  ledger.settle({ visitor: uuid(2), requestId: uuid(2), outcome: "complete" });
  const reconstructed = new QuotaLedger(store, {
    clock: () => Date.parse("2026-10-20T12:00:00Z"),
  });
  expect(reconstructed.snapshot(uuid(3))).toMatchObject({
    available: true,
    imageAvailable: false,
  });
  advance(12 * 86400000);
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    month: "2026-11",
    available: true,
    imageAvailable: true,
    imageTransformsRemaining: 5000,
  });
  expect(
    ledger.reserve(input(3, { operation: "image", imageTransforms: 1 }))
      .admitted,
  ).toBe(true);
});

it("holds image-provider exhaustion in both months of a cross-boundary request, without halting text", () => {
  const { ledger, store, advance } = setup();
  advance(
    Date.parse("2026-10-31T23:59:50Z") - Date.parse("2026-10-20T12:00:00Z"),
  );
  ledger.reserve(input(1, { operation: "refine", imageTransforms: 2 }));
  advance(15000);
  ledger.settle({
    visitor: uuid(1),
    requestId: uuid(1),
    outcome: "image-provider-exhausted",
  });
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    month: "2026-11",
    available: true,
    imageAvailable: false,
    imageTransformsRemaining: 4998,
  });
  expect(
    store.sql
      .exec("SELECT month,halted FROM transform_months ORDER BY month")
      .toArray()
      .map((row) => ({ ...row })),
  ).toEqual([
    { month: "2026-10", halted: 1 },
    { month: "2026-11", halted: 1 },
  ]);
});

it("adds a missing monthly halt column without forgetting previous monthly usage", () => {
  const store = sqliteStore();
  store.sql
    .exec(
      "CREATE TABLE transform_months (month TEXT PRIMARY KEY, transforms INTEGER NOT NULL DEFAULT 0)",
    )
    .toArray();
  store.sql
    .exec("INSERT INTO transform_months VALUES(?,?)", "2026-10", 23)
    .toArray();
  const ledger = new QuotaLedger(store, {
    clock: () => Date.parse("2026-10-20T12:00:00Z"),
  });
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    imageAvailable: true,
    imageTransformsRemaining: 4977,
  });
});

it("rolls back cross-month carry markers and counters together when carry charging fails", () => {
  const { ledger, store, advance } = setup();
  advance(
    Date.parse("2026-10-31T23:59:50Z") - Date.parse("2026-10-20T12:00:00Z"),
  );
  ledger.reserve(input(1, { operation: "refine", imageTransforms: 2 }));
  advance(15000);
  const execute = store.sql.exec;
  store.sql.exec = (query, ...params) => {
    if (
      query.startsWith("UPDATE transform_months SET transforms=transforms+") &&
      params[1] === "2026-11"
    )
      throw Error("carry storage failed");
    return execute(query, ...params);
  };
  expect(() => ledger.snapshot(uuid(1))).toThrow("carry storage failed");
  expect(
    store.sql
      .exec("SELECT * FROM transform_carry WHERE month=?", "2026-11")
      .toArray(),
  ).toHaveLength(0);
  expect(
    store.sql
      .exec("SELECT * FROM transform_months WHERE month=?", "2026-11")
      .toArray(),
  ).toHaveLength(0);
  store.sql.exec = execute;
  expect(ledger.snapshot(uuid(1))).toMatchObject({
    month: "2026-11",
    imageTransformsRemaining: 4998,
    sharedRemaining: 7990,
  });
  expect(ledger.snapshot(uuid(1)).imageTransformsRemaining).toBe(4998);
});
