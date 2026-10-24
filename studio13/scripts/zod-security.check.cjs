const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { test } = require('node:test');

const lock = require('../package-lock.json');

function assertPatched(version, context) {
  assert.match(version, /^\d+\.\d+\.\d+$/, context);
  const [major, minor, patch] = version.split('.').map(Number);
  assert.ok(major > 4 || (major === 4 && (minor > 6 || (minor === 6 && patch >= 6))),
    `${context} resolves vulnerable Zod ${version}`);
}

test('the locked graph and each Zod consumer resolve the collection-size fix', () => {
  let copies = 0;
  let consumers = 0;
  for (const [location, pkg] of Object.entries(lock.packages)) {
    if (/(^|\/)node_modules\/zod$/.test(location)) {
      assertPatched(pkg.version, location);
      copies++;
    }
    if (pkg.dependencies?.zod || pkg.peerDependencies?.zod) {
      const consumer = createRequire(path.resolve(__dirname, '..', location, 'package.json'));
      assertPatched(consumer('zod/package.json').version, location);
      consumers++;
    }
  }
  assert.ok(copies > 0, 'expected a locked Zod installation');
  assert.ok(consumers > 0, 'expected installed Zod consumers');
});

const entries = Array.from({ length: 32 }, (_, index) => index);
const collections = [
  {
    name: 'array',
    schema: (z, element) => z.array(element),
    bound: (z, exact) => exact ? z.length(2) : z.maxLength(2),
    input: values => values,
    trim: values => values.slice(0, 2),
  },
  {
    name: 'set',
    schema: (z, element) => z.set(element),
    bound: (z, exact) => exact ? z.size(2) : z.maxSize(2),
    input: values => new Set(values),
    trim: values => new Set([...values].slice(0, 2)),
  },
  {
    name: 'map',
    schema: (z, element) => z.map(element, element),
    bound: (z, exact) => exact ? z.size(2) : z.maxSize(2),
    input: values => new Map(values.map(value => [value, value])),
    trim: values => new Map([...values].slice(0, 2)),
  },
];

function assertSizeError(result, context) {
  assert.equal(result.success, false, context);
  assert.equal(result.error.issues.length, 1, context);
  assert.equal(result.error.issues[0].code, 'too_big', context);
  assert.deepEqual(result.error.issues[0].path, ['items'], context);
}

// Sanity uses Mini; ESLint consumers use v4. Exercise their public aliases too.
for (const entry of ['zod', 'zod/v4', 'zod/mini', 'zod/v4/mini', 'zod/v4-mini']) {
  const z = require(entry);
  for (const mode of ['runtime', 'compiled']) {
    const prepare = schema => mode === 'compiled' ? z.compile(schema, { strict: true }) : schema;

    test(`${entry} ${mode}: oversized invalid collections have bounded errors`, async () => {
      for (const collection of collections) {
        for (const exact of [false, true]) {
          const context = `${collection.name} ${exact ? 'exact' : 'maximum'}`;
          const schema = prepare(z.object({
            items: collection.schema(z, z.string()).check(collection.bound(z, exact)),
          }));
          const input = { items: collection.input(entries) };
          assertSizeError(z.safeParse(schema, input), context);
          assertSizeError(await z.safeParseAsync(schema, input), context);
        }
      }
    });

    test(`${entry} ${mode}: size limits reject before visiting elements`, async () => {
      for (const collection of collections) {
        for (const exact of [false, true]) {
          let visits = 0;
          const element = z.string().check(z.refine(() => { visits++; return true; }));
          const schema = prepare(z.object({
            items: collection.schema(z, element).check(collection.bound(z, exact)),
          }));
          const input = { items: collection.input(entries.map(String)) };
          assertSizeError(z.safeParse(schema, input), collection.name);
          assert.equal(visits, 0, collection.name);
          assertSizeError(await z.safeParseAsync(schema, input), collection.name);
          assert.equal(visits, 0, collection.name);

          const valid = { items: collection.input(['a', 'b']) };
          assert.deepEqual(z.parse(schema, valid), valid);
          assert.ok(visits > 0, 'valid collection still validates its elements');
          assert.deepEqual(await z.parseAsync(schema, valid), valid);
        }
      }
    });

    test(`${entry} ${mode}: bounds preserve preceding collection rewrites`, async () => {
      for (const collection of collections) {
        const schema = prepare(collection.schema(z, z.string()).check(
          z.overwrite(collection.trim), collection.bound(z, false),
        ));
        const input = collection.input(entries.map(String));
        const expected = collection.trim(input);
        assert.deepEqual(z.parse(schema, input), expected);
        assert.deepEqual(await z.parseAsync(schema, input), expected);
      }
    });
  }
}
