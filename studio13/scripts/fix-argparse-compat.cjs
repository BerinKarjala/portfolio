// argparse 2 retains the legacy constructor API used by js-yaml 3, but its
// --version action reads an unset instance field instead of the supplied option.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRequire } = require('node:module');

const yamlRequire = createRequire(require.resolve('js-yaml'));
assert.equal(yamlRequire('argparse/package.json').version, '2.0.1');
const filename = yamlRequire.resolve('argparse');
const source = fs.readFileSync(filename, 'utf8');
const original = 'version: this.version,';
const corrected = 'version, // Studio: preserve js-yaml 3 legacy --version output.';
if (!source.includes(corrected)) {
  assert.equal(source.split(original).length, 2, 'Review argparse compatibility patch after dependency changes');
  fs.writeFileSync(filename, source.replace(original, corrected));
}
