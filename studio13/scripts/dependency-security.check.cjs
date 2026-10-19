const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { createRequire } = require('node:module');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { once } = require('node:events');

const codegenRequire = createRequire(require.resolve('@sanity/codegen'));
const chokidarRequire = createRequire(codegenRequire.resolve('chokidar'));
const globbyRequire = createRequire(codegenRequire.resolve('globby'));
const globRequire = createRequire(globbyRequire.resolve('fast-glob'));
const matchRequire = createRequire(globRequire.resolve('micromatch'));
const braces = chokidarRequire('braces');
const micromatch = globRequire('micromatch');
const yamlRequire = createRequire(require.resolve('js-yaml'));

test('both glob consumers resolve the reviewed depth-guard fork', () => {
  for (const consumer of [chokidarRequire, matchRequire]) {
    const pkg = consumer('braces/package.json');
    assert.equal(pkg.name, '@dieub/braces-depth-guard');
    assert.equal(pkg.version, '3.0.3-pn.3');
  }
});

test('deep braces, parentheses and mixed nesting fail before recursive walkers', () => {
  for (const [open, close] of [['{', '}'], ['(', ')'], ['{(', ')}']]) {
    const pattern = open.repeat(2000) + 'x' + close.repeat(2000);
    for (const operation of [braces, braces.parse, braces.compile, braces.expand, braces.stringify]) {
      assert.throws(() => operation(pattern), { name: 'SyntaxError', message: /exceeds max depth/ });
      assert.throws(() => operation(pattern, { maxDepth: Infinity }), /exceeds max depth/);
    }
  }
  assert.throws(() => micromatch.braceExpand('{'.repeat(2000) + 'x' + '}'.repeat(2000)), /exceeds max depth/);
});

test('caller-supplied ASTs cannot bypass traversal depth guards', () => {
  const deepAst = () => {
    const root = { type: 'root', nodes: [] };
    let node = root;
    for (let i = 0; i < 2000; i++) {
      const child = { type: 'paren', nodes: [], parent: node };
      node.nodes.push(child);
      node = child;
    }
    return root;
  };
  for (const operation of [braces.compile, braces.expand, braces.stringify]) {
    assert.throws(() => operation(deepAst()), { name: 'RangeError', message: /exceeds max depth/ });
  }
});

test('ordinary lists, ranges, escaping, nesting and AST workflows still work', () => {
  assert.deepEqual(braces.expand('src/{a,b}.js'), ['src/a.js', 'src/b.js']);
  assert.deepEqual(braces.expand('{01..03}'), ['01', '02', '03']);
  assert.deepEqual(braces.expand('a{b,{c,d}}e'), ['abe', 'ace', 'ade']);
  assert.deepEqual(braces.expand('a\\{b,c}'), ['a{b,c}']);
  assert.equal(braces.compile('src/{a,b}.js'), 'src/(a|b).js');
  assert.equal(braces.stringify(braces.parse('src/{a,b}.js')), 'src/{a,b}.js');
  assert.deepEqual(micromatch(['a.js', 'b.ts', 'c.css'], '*.{js,ts}'), ['a.js', 'b.ts']);
});

test('sprintf-js is absent from the entire locked dependency graph', () => {
  const lock = require('../package-lock.json');
  for (const [name, pkg] of Object.entries(lock.packages)) {
    assert.ok(!/(^|\/)node_modules\/sprintf-js$/.test(name), name);
    assert.ok(!pkg.dependencies?.['sprintf-js'], name);
    if (/(^|\/)node_modules\/braces$/.test(name)) {
      assert.equal(pkg.name, '@dieub/braces-depth-guard', name);
      assert.equal(pkg.version, '3.0.3-pn.3', name);
    }
  }
  assert.equal(yamlRequire('argparse/package.json').version, '2.0.1');
  assert.throws(() => yamlRequire.resolve('sprintf-js'), { code: 'MODULE_NOT_FOUND' });
});

test('js-yaml safeLoad API and legacy CLI options remain compatible', () => {
  assert.deepEqual(require('js-yaml').safeLoad('project:\n  name: studio\n'), { project: { name: 'studio' } });
  const cli = yamlRequire.resolve('js-yaml/bin/js-yaml.js');
  const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { input, encoding: 'utf8', timeout: 5000 });
  const help = run(['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--compact/);
  const version = run(['--version']);
  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stdout.trim(), require('js-yaml/package.json').version);
  const parsed = run(['-c', '-j', '-t'], 'name: studio\n');
  assert.equal(parsed.status, 0, parsed.stderr);
  assert.deepEqual(JSON.parse(parsed.stdout), { name: 'studio' });
  const dumped = run([], '{"name":"studio"}');
  assert.equal(dumped.status, 0, dumped.stderr);
  assert.deepEqual(require('js-yaml').safeLoad(dumped.stdout), { name: 'studio' });
  const invalid = run(['-c'], 'name: [\n');
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /unexpected end/);
});

test('codegen globs and chokidar brace-pattern watches still discover files', { timeout: 15000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'studio-dependencies-'));
  let watcher;
  try {
    await writeFile(path.join(directory, 'a.js'), '');
    await writeFile(path.join(directory, 'b.ts'), '');
    await writeFile(path.join(directory, 'c.css'), '');
    const globby = codegenRequire('globby');
    assert.deepEqual((await globby('*.{js,ts}', { cwd: directory })).sort(), ['a.js', 'b.ts']);
    const chokidar = codegenRequire('chokidar');
    watcher = chokidar.watch(path.join(directory, '*.{js,ts}').replaceAll('\\', '/'), { ignoreInitial: true });
    await once(watcher, 'ready', { signal: AbortSignal.timeout(5000) });
    const added = once(watcher, 'add', { signal: AbortSignal.timeout(5000) });
    await writeFile(path.join(directory, 'new.ts'), '');
    assert.equal(path.basename((await added)[0]), 'new.ts');
  } finally {
    await watcher?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
