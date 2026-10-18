import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const root = new URL("../docs/page-builder/", import.meta.url);
const read = (name) => readFileSync(new URL(name, root), "utf8");
const register = JSON.parse(read("decisions.json"));
const rows = (name) =>
  read(name)
    .split("\n")
    .filter((line) => /^\| Q\d{3} \|/.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim().replaceAll("**", "")),
    );
const spec = rows("specification.md");
const trace = rows("requirements-trace.md");
assert.equal(register.totalDecisions, 130);
for (const collection of [register.decisions, spec, trace])
  assert.equal(collection.length, 130);
for (let index = 0; index < 130; index++) {
  const decision = register.decisions[index];
  assert.equal(decision.id, `Q${String(index + 1).padStart(3, "0")}`);
  assert.deepEqual(spec[index].slice(0, 4), [
    decision.id,
    decision.option,
    decision.domain,
    decision.requirement,
  ]);
  assert.deepEqual(trace[index].slice(0, 3), [
    decision.id,
    decision.option,
    decision.requirement,
  ]);
  assert.ok(trace[index][3], `Missing evidence/status for ${decision.id}`);
}
for (let index = 1; index <= 16; index++) {
  const id = `AC-${String(index).padStart(2, "0")}`;
  assert.ok(
    read("m5-release.md").includes(`| ${id} |`),
    `Missing acceptance row ${id}`,
  );
}
console.log(
  "All 130 canonical decisions/options match specification and trace; all 16 acceptance gates are mapped.",
);
