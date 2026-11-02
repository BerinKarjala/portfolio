const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { test } = require('node:test');

// Resolve the validator through Sanity, which declares these dependencies.
const sanityRequire = createRequire(require.resolve('sanity/package.json'));
const { Schema } = sanityRequire('@sanity/schema');
const { validateDocument } = sanityRequire('@sanity/validation');

const noNetwork = () => {
  throw new Error('Project-link validation must not access the network');
};
const offlineClient = {
  fetch: noNetwork,
  getDataUrl: noNetwork,
  observable: { fetch: noNetwork, request: noNetwork },
  withConfig() {
    return this;
  },
};

let schemaPromise;
function projectSchema() {
  schemaPromise ??= import('../schemas/project.js').then(({ default: project }) =>
    Schema.compile({ name: 'project-link-test', types: [project] }),
  );
  return schemaPromise;
}

async function validateLink(link) {
  const document = {
    _id: 'project-link-test',
    _type: 'project',
    name: 'Example project',
    description: 'Synthetic project used for local validation.',
  };
  if (link !== undefined) document.link = link;

  return validateDocument({ document, schema: await projectSchema(), client: offlineClient });
}

test('existing and other internal paths pass project-link validation', async (t) => {
  for (const link of [
    '/projects/SudokuSolver',
    '/projects/Minesweeper',
    '/projects/Minesweeper?level=hard#board',
    'projects/SudokuSolver',
    './projects/SudokuSolver',
    '../projects/Minesweeper',
    '/javascript:example',
  ]) {
    await t.test(link, async () => {
      const result = await validateLink(link);
      assert.equal(result.status, 'passed', JSON.stringify(result.markers));
    });
  }
});

test('HTTP(S) links and absent optional links remain valid', async (t) => {
  for (const link of ['https://example.com/project', 'http://localhost:3000/project', '', undefined]) {
    await t.test(String(link), async () => {
      const result = await validateLink(link);
      assert.equal(result.status, 'passed', JSON.stringify(result.markers));
    });
  }
});

test('unsafe schemes and disguised external paths are rejected', async (t) => {
  for (const link of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    '  javascript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,example',
    'ftp://example.com/project',
    'mailto:person@example.com',
    'https://user:password@example.com/project',
    '//example.com/project',
    '  //example.com/project',
    '///example.com/project',
    '\\example.com/project',
    '/\\example.com/project',
    '\\\\example.com\\project',
    'https://example.com\\@other.example/project',
    '/\n/example.com/project',
  ]) {
    await t.test(JSON.stringify(link), async () => {
      const result = await validateLink(link);
      assert.equal(result.status, 'failed', JSON.stringify(result.markers));
      assert.ok(
        result.markers.some((marker) => marker.level === 'error' && marker.path[0] === 'link'),
        JSON.stringify(result.markers),
      );
    });
  }
});
