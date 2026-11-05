const assert = require('node:assert/strict');
const { createRequire, registerHooks } = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const { pathToFileURL } = require('node:url');

const sanityRequire = createRequire(require.resolve('sanity/package.json'));
const { Schema } = sanityRequire('@sanity/schema');
const { builtinTypes } = sanityRequire('@sanity/schema/_internal');
const { validateDocument } = sanityRequire('@sanity/validation');
const authorModule = pathToFileURL(path.resolve(__dirname, '../schemas/author.js')).href;

// The certificate input is JSX used by Studio, not part of schema validation.
// Stub only that UI component so Node can load the actual author schema.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === authorModule && specifier === '../components/CertificateInput') {
      return { url: 'data:text/javascript,export default function CertificateInput() {}', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const noNetwork = () => {
  throw new Error('Author schema validation must not access the network');
};
function offlineClient(slugIsUnique) {
  return {
    fetch(_query, _params, options) {
      if (options?.tag !== 'validation.slug-is-unique') return noNetwork();
      return Promise.resolve(slugIsUnique);
    },
    getDataUrl: noNetwork,
    observable: { fetch: noNetwork, request: noNetwork },
    withConfig() {
      return this;
    },
  };
}

let authorPromise;
function authorDefinition() {
  authorPromise ??= import('../schemas/author.js').then(({ default: author }) => author);
  return authorPromise;
}

let schemaPromise;
function authorSchema() {
  schemaPromise ??= authorDefinition().then((author) =>
    Schema.compile({ name: 'author-test', types: [...builtinTypes, author] }),
  );
  return schemaPromise;
}

function exampleBio() {
  return [{
    _key: 'bio',
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _key: 'span', _type: 'span', text: 'Example biography', marks: [] }],
  }];
}

async function validateAuthor(fields, { slugIsUnique = true } = {}) {
  const document = { _id: 'author-test', _type: 'author', ...fields };
  const result = await validateDocument({
    document,
    schema: await authorSchema(),
    client: offlineClient(slugIsUnique),
    getDocumentExists: async () => true,
  });
  assert.ok(result.markers.every((marker) => marker.code !== 'validation.exception'), JSON.stringify(result.markers));
  return result;
}

test('author schema exposes the existing identity fields alongside bio and certificates', async () => {
  const author = await authorDefinition();
  const fields = Object.fromEntries(author.fields.map((field) => [field.name, field]));
  for (const name of ['name', 'slug', 'image', 'bio', 'certificates']) {
    assert.ok(fields[name], `Missing author field: ${name}`);
  }
  assert.equal(fields.name.type, 'string');
  assert.equal(fields.slug.type, 'slug');
  assert.equal(fields.slug.options.source, 'name');
  assert.equal(fields.slug.options.maxLength, 96);
  assert.equal(fields.image.type, 'image');
  assert.equal(fields.image.options.hotspot, true);
  assert.equal(fields.bio.type, 'array');
  assert.equal(fields.certificates.type, 'array');

  const compiled = await authorSchema();
  const compiledFields = compiled.get('author').fields.map((field) => field.name);
  for (const name of ['name', 'slug', 'image', 'bio', 'certificates']) {
    assert.ok(compiledFields.includes(name), `Missing compiled author field: ${name}`);
  }
});

test('an author can retain identity, biography, and certificates together', async () => {
  const result = await validateAuthor({
    name: 'Example Author',
    slug: { _type: 'slug', current: 'example-author' },
    image: {
      _type: 'image',
      asset: { _type: 'reference', _ref: 'image-abcdef0123456789abcdef0123456789abcdef01-100x100-png' },
    },
    bio: exampleBio(),
    certificates: [{ _key: 'certificate', _type: 'certificate', title: 'Example', kind: 'image' }],
  });
  assert.equal(result.status, 'passed', JSON.stringify(result.markers));
});

test('identity and certificates remain optional when a valid biography exists', async () => {
  const result = await validateAuthor({ bio: exampleBio() });
  assert.equal(result.status, 'passed', JSON.stringify(result.markers));
});

test('slug validation requires a value and warns about duplicates', async (t) => {
  for (const [label, slug, options, expectedLevel, expectedCode] of [
    ['missing current value', { _type: 'slug', current: '' }, {}, 'error'],
    ['duplicate', { _type: 'slug', current: 'example-author' }, { slugIsUnique: false }, 'warning', 'slug.not-unique'],
  ]) {
    await t.test(label, async () => {
      const result = await validateAuthor({ bio: exampleBio(), slug }, options);
      assert.equal(result.status, 'failed', JSON.stringify(result.markers));
      assert.ok(
        result.markers.some((marker) => marker.level === expectedLevel && marker.path[0] === 'slug' &&
          (!expectedCode || marker.code === expectedCode)),
        JSON.stringify(result.markers),
      );
    });
  }
});

test('the existing biography and certificate validation rules remain enforced', async (t) => {
  for (const [label, fields, expectedField] of [
    ['missing biography', {}, 'bio'],
    ['empty biography', { bio: [] }, 'bio'],
    ['certificate missing title', { bio: exampleBio(), certificates: [{ _key: 'cert', _type: 'certificate', kind: 'image' }] }, 'title'],
    ['certificate missing kind', { bio: exampleBio(), certificates: [{ _key: 'cert', _type: 'certificate', title: 'Example' }] }, 'kind'],
  ]) {
    await t.test(label, async () => {
      const result = await validateAuthor(fields);
      assert.equal(result.status, 'failed', JSON.stringify(result.markers));
      assert.ok(
        result.markers.some((marker) => marker.level === 'error' && marker.path.includes(expectedField)),
        JSON.stringify(result.markers),
      );
    });
  }
});
