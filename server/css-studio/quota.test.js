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
