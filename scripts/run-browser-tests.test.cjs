const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const policy = () => require('./run-browser-tests.cjs');

test('the production config uses one worker locally and preserves all three cloud browsers', async () => {
  const previous = process.env.CI;
  try {
    delete process.env.CI;
    const local = (await import('../playwright.config.js?policy-local')).default;
    assert.equal(local.workers, 1);
    process.env.CI = 'true';
    const cloud = (await import('../playwright.config.js?policy-cloud')).default;
    assert.equal(cloud.workers, 2);
    assert.equal(cloud.retries, 0);
    assert.deepEqual(cloud.projects.map(project => project.name), ['chromium', 'firefox', 'webkit']);
  } finally {
    if (previous === undefined) delete process.env.CI; else process.env.CI = previous;
  }
});

test('default local command selects bounded smoke checks and rejects resource-expanding flags', () => {
  const {planTests} = policy();
  const plan = planTests([], {ci: false});
  assert.equal(plan.mode, 'local');
  assert.equal(plan.guardMemory, true);
  assert.ok(plan.args.includes('--config=playwright.local.config.js'));
  assert.ok(plan.args.includes('--workers=1'));
  for (const flag of ['--workers=2', '--config=playwright.full.config.js', '--headed', '--ui', '--debug', '--retries=1', '--pass-with-no-tests']) {
    assert.throws(() => planTests([flag], {ci: false}), /local smoke|cloud/i);
  }
});

test('cloud suites require CI, while collection-only discovery is available without a browser', () => {
  const {planTests} = policy();
  assert.throws(() => planTests(['--full'], {ci: false}), /CI/);
  assert.throws(() => planTests(['--cloud'], {ci: false}), /CI/);
  assert.equal(planTests(['--cloud', '--list'], {ci: false}).discovery, true);
  assert.throws(() => planTests(['--cloud', '--list', '--ui'], {ci: false}), /CI/);
  assert.equal(planTests([], {ci: true}).mode, 'cloud');
  const full = planTests(['--full', '--project=webkit'], {ci: true});
  assert.ok(full.args.includes('--config=playwright.full.config.js'));
  assert.ok(full.args.includes('--project=webkit'));
});

test('low available RAM defers local tests without spawning a browser or claiming a pass', async () => {
  const {runWithMemoryGuard, MiB} = policy();
  let launches = 0;
  const result = await runWithMemoryGuard({args: [], guard: true, readFree: () => 512 * MiB, spawnChild: () => {launches++; throw new Error('must not launch');}});
  assert.equal(launches, 0);
  assert.equal(result.code, 75);
  assert.equal(result.reason, 'insufficient-memory');
});

test('sustained memory pressure stops only the owned test process and overrides a false success', async () => {
  const {runWithMemoryGuard, MiB} = policy();
  const child = new EventEmitter();
  child.pid = 987654;
  let reads = 0;
  const stopped = [];
  const result = await runWithMemoryGuard({args: [], guard: true, intervalMs: 5,
    readFree: () => (++reads === 1 ? 2048 : 256) * MiB,
    spawnChild: () => child,
    stopTree: process => {stopped.push(process.pid); queueMicrotask(() => child.emit('close', 0));},
  });
  assert.deepEqual(stopped, [child.pid]);
  assert.equal(result.code, 75);
  assert.equal(result.reason, 'memory-pressure');
});

test('ordinary test failures remain failures and cloud work does not read localhost memory', async () => {
  const {runWithMemoryGuard} = policy();
  const child = new EventEmitter();
  const result = await runWithMemoryGuard({args: [], guard: false,
    readFree: () => {throw new Error('cloud must use its own runner policy');},
    spawnChild: () => {queueMicrotask(() => child.emit('close', 1)); return child;},
  });
  assert.equal(result.code, 1);
  assert.equal(result.reason, 'test-failure');
});

test('local smoke config reuses supplied servers, uses one Chromium worker and avoids traces/videos', async () => {
  const config = (await import('../playwright.local.config.js')).default;
  assert.equal(config.workers, 1);
  assert.equal(config.fullyParallel, false);
  assert.equal(config.retries, 0);
  assert.deepEqual(config.projects.map(project => project.name), ['chromium']);
  assert.equal(config.webServer, undefined);
  assert.equal(config.use.baseURL, 'http://localhost:3000');
  assert.equal(config.use.trace, 'off');
  assert.equal(config.use.video, 'off');
});
