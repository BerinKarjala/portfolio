const assert = require('node:assert/strict');
const { registerHooks } = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const { pathToFileURL } = require('node:url');

// Load the real configuration offline while substituting only Studio's runtime
// and the shared UI/schema modules. No Sanity client or network is involved.
const configUrl = pathToFileURL(path.resolve(__dirname, '../content-agent-test/sanity.config.js')).href;
const cliUrl = pathToFileURL(path.resolve(__dirname, '../content-agent-test/sanity.cli.js')).href;
const modules = {
  sanity: 'export const defineConfig = value => value',
  'sanity/desk': 'export const deskTool = options => ({name: "desk", options})',
  '@sanity/vision': 'export const visionTool = () => ({name: "vision"})',
  '../schemas': 'export const schemaTypes = [{name: "shared-schema-sentinel"}]',
  '../deskStructure': 'export const structure = () => "shared-structure-sentinel"',
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === configUrl && Object.hasOwn(modules, specifier)) {
      return { url: `data:text/javascript,${encodeURIComponent(modules[specifier])}`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

test('test Studio selects only the explicitly identified test dataset and shared schema', async () => {
  const oldDataset = process.env.SANITY_STUDIO_DATASET;
  const oldProject = process.env.SANITY_STUDIO_PROJECT_ID;
  process.env.SANITY_STUDIO_DATASET = 'production';
  process.env.SANITY_STUDIO_PROJECT_ID = 'wrong-project';
  let config;
  try {
    ({ default: config } = await import(configUrl));
  } finally {
    if (oldDataset === undefined) delete process.env.SANITY_STUDIO_DATASET;
    else process.env.SANITY_STUDIO_DATASET = oldDataset;
    if (oldProject === undefined) delete process.env.SANITY_STUDIO_PROJECT_ID;
    else process.env.SANITY_STUDIO_PROJECT_ID = oldProject;
  }
  assert.ok(!Array.isArray(config), 'must not include a production workspace');
  assert.equal(config.projectId, 'umy7f73e');
  assert.equal(config.dataset, 'content-agent-test');
  assert.match(config.name, /test/i);
  assert.match(config.title, /test/i);
  assert.deepEqual(config.schema.types, [{ name: 'shared-schema-sentinel' }]);
  assert.equal(config.plugins.find((plugin) => plugin.name === 'desk').options.structure(), 'shared-structure-sentinel');
});

test('test CLI defaults to the same explicitly identified dataset', async () => {
  const { default: config } = await import(cliUrl);
  assert.deepEqual(config.api, { projectId: 'umy7f73e', dataset: 'content-agent-test' });
});

test('the installed Sanity CLI finds the test Studio before the parent Studio', async () => {
  const { findProjectRoot } = await import('@sanity/cli-core');
  const directory = path.resolve(__dirname, '../content-agent-test');
  const root = await findProjectRoot(directory);
  assert.equal(root.type, 'studio');
  assert.equal(root.directory, directory);
  assert.equal(root.path, path.join(directory, 'sanity.config.js'));
});
