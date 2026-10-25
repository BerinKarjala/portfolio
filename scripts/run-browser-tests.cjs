'use strict';
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const MiB = 1024 * 1024;
const START_FREE = 1024 * MiB;
const MEMORY_FLOOR = 384 * MiB;
const isCI = value => value === true || value === 'true' || value === '1';

function planTests(argv, {ci = isCI(process.env.CI)} = {}) {
  const modes = argv.filter(arg => ['--local', '--cloud', '--full'].includes(arg));
  if (modes.length > 1) throw new Error('Choose one browser tier: local, cloud or full.');
  const mode = modes[0]?.slice(2) || (ci ? 'cloud' : 'local');
  const forwarded = argv.filter(arg => !modes.includes(arg));
  const discovery = forwarded.some(arg => ['--list', '--help', '-h'].includes(arg));
  const interactive = forwarded.some(arg => /^--(?:ui|debug|headed)(?:=|$)/.test(arg));
  if (mode !== 'local' && !ci && (!discovery || interactive)) throw new Error('Cloud browser suites run in CI. Dispatch page-builder.yml; use the local smoke tier here.');
  if (mode === 'local' && forwarded.some(arg => /^--(?:config|project|workers|retries|repeat-each|fully-parallel|ui|headed|debug|pass-with-no-tests|timeout|global-timeout|trace)(?:=|$)/.test(arg))) {
    throw new Error('The local smoke tier fixes its browser, config, worker count and resource limits. Run expanded tests in cloud CI.');
  }
  const args = ['test', ...(mode === 'full' ? ['--config=playwright.full.config.js'] : []), ...forwarded];
  if (mode === 'local') args.push('--config=playwright.local.config.js', '--workers=1');
  if (!discovery) args.push('--retries=0');
  return {mode, args, discovery, guardMemory: mode === 'local' && !discovery};
}

function stopOwnedTree(child) {
  if (!Number.isInteger(child.pid) || child.pid <= 0) throw new Error('Missing owned test process ID.');
  if (process.platform === 'win32') {
    const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
    const result = cp.spawnSync(executable, ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore', timeout: 5000});
    if (result.status !== 0 && child.exitCode === null) child.kill('SIGKILL');
  } else {
    try {process.kill(-child.pid, 'SIGTERM');} catch (error) {if (error.code !== 'ESRCH') throw error;}
    setTimeout(() => {try {process.kill(-child.pid, 'SIGKILL');} catch (error) {if (error.code !== 'ESRCH') console.error(error.message);}}, 2000).unref();
  }
}

async function runWithMemoryGuard({args, guard, readFree = os.freemem, stopTree = stopOwnedTree, intervalMs = 1000,
  spawnChild = flags => {
    const env = {...process.env};
    if (guard) delete env.PWDEBUG;
    return cp.spawn(process.execPath, [...(guard ? ['--max-old-space-size=256'] : []), require.resolve('@playwright/test/cli'), ...flags], {
      stdio: 'inherit', windowsHide: true, detached: process.platform !== 'win32', env,
    });
  },
}) {
  let minFreeBytes = guard ? readFree() : null;
  if (guard && (!Number.isFinite(minFreeBytes) || minFreeBytes < START_FREE)) return {code: 75, reason: 'insufficient-memory', minFreeBytes};
  return new Promise(resolve => {
    let child, timer, pressure = false, lowSamples = 0, settled = false;
    const finish = (code, reason) => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      resolve({code: pressure ? 75 : code, reason: pressure ? 'memory-pressure' : reason, minFreeBytes});
    };
    try {child = spawnChild(args);} catch {finish(1, 'spawn-error'); return;}
    child.once('error', () => finish(1, 'spawn-error'));
    child.once('close', code => finish(code === 0 ? 0 : code || 1, code === 0 ? 'passed' : 'test-failure'));
    if (guard) timer = setInterval(() => {
      const available = readFree();
      minFreeBytes = Math.min(minFreeBytes, available);
      lowSamples = available < MEMORY_FLOOR ? lowSamples + 1 : 0;
      if (lowSamples >= 2 && !pressure) {
        pressure = true;
        clearInterval(timer);
        console.error('Local browser tests stopped: available memory stayed below 384 MiB. Continue the suite in cloud CI.');
        try {stopTree(child);} catch {child.kill?.('SIGKILL');}
      }
    }, intervalMs);
  });
}

async function main() {
  const plan = planTests(process.argv.slice(2));
  let result;
  if (plan.guardMemory && os.freemem() < START_FREE) {
    result = {code: 75, reason: 'insufficient-memory', minFreeBytes: os.freemem()};
  } else {
    if (plan.mode === 'local' && !plan.discovery && process.env.BROWSER_SMOKE_START_SERVERS !== '1') {
      for (const url of ['http://localhost:3000/', 'http://localhost:3333/']) {
        const response = await fetch(url, {signal: AbortSignal.timeout(10000)});
        await response.body?.cancel();
        if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}. Start the existing dev server before local smoke tests.`);
      }
    }
    result = await runWithMemoryGuard({args: plan.args, guard: plan.guardMemory});
  }
  if (plan.mode === 'local' && !plan.discovery) {
    fs.mkdirSync('test-results-local', {recursive: true});
    fs.writeFileSync('test-results-local/resource-result.json', JSON.stringify({tier: plan.mode, ...result,
      targets: ['http://localhost:3000/', 'http://localhost:3333/'],
      targetSource: process.env.BROWSER_SMOKE_START_SERVERS === '1' && isCI(process.env.CI)
        ? 'Isolated cloud dev servers from the tested checkout.'
        : 'Existing dev servers; record their checkout revision separately from the test runner.',
      nodeVersion: process.version,
      platform: process.platform,
      checkedAt: new Date().toISOString(),
    }, null, 2));
    if (result.code === 75) console.error(`LOCAL_BROWSER_DEFERRED: ${Math.floor(result.minFreeBytes / MiB)} MiB free. Start requires 1024 MiB; this is not a test pass. Use the cloud workflow while localhost is memory constrained.`);
  }
  process.exitCode = result.code;
}

module.exports = {planTests, runWithMemoryGuard, isCI, MiB, START_FREE, MEMORY_FLOOR};
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
