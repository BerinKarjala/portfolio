import {expect, test} from 'vitest';
import {execFile} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const root = new URL('../../', import.meta.url);
const lock = JSON.parse(readFileSync(new URL('package-lock.json', root), 'utf8'));
const packages = Object.entries(lock.packages);
const consumers = packages.filter(([, pkg]) => pkg.dependencies?.undici).map(([name]) => name);
const run = promisify(execFile);

test('every locked undici copy excludes GHSA-xjj6-f33q-929c', () => {
  const copies = packages.filter(([name]) => /(^|\/)node_modules\/undici$/.test(name));
  expect(copies.length).toBeGreaterThan(0);
  for (const [name, pkg] of copies) {
    const [major, minor, patch] = pkg.version.split('.').map(Number);
    const affected = (major === 6 && minor >= 23 && (minor < 29 || (minor === 29 && patch < 1)))
      || (major === 7 && minor >= 18 && (minor < 30 || (minor === 30 && patch < 1)))
      || (major === 8 && (minor < 12 || (minor === 12 && patch < 2)));
    expect(affected, `${name}: ${pkg.version}`).toBe(false);
  }
});

// Isolate each fetch: an orphaned response stream used to crash the process even
// when the caller caught the rejection. A rejected promise alone is insufficient.
const probe = String.raw`
  const assert = require('node:assert/strict');
  const {createServer} = require('node:net');
  const {gzipSync, deflateSync} = require('node:zlib');
  const {setTimeout: delay} = require('node:timers/promises');
  const {fetch} = require(process.argv[1]);
  const mode = process.argv[2];
  const sockets = new Set();
  const server = createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.once('data', () => {
      if (mode === 'valid') {
        const body = deflateSync(gzipSync(Buffer.from('ordinary compressed response')));
        socket.end(Buffer.concat([
          Buffer.from('HTTP/1.1 200 OK\r\nContent-Encoding: gzip, deflate\r\nContent-Length: ' + body.length + '\r\nConnection: close\r\n\r\n'),
          body,
        ]));
      } else {
        const codings = mode === 'repeated' ? Array(6).fill('gzip').join(', ')
          : 'gzip, deflate, x-gzip, br, gzip, deflate, gzip';
        socket.end('HTTP/1.1 200 OK\r\nContent-Encoding: ' + codings + '\r\nContent-Length: 100\r\nConnection: close\r\n\r\n');
      }
    });
  });
  (async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const request = fetch('http://127.0.0.1:' + server.address().port, {signal: AbortSignal.timeout(3000)});
      if (mode === 'valid') {
        const response = await request;
        assert.equal(response.status, 200);
        assert.equal(await response.text(), 'ordinary compressed response');
      } else {
        await assert.rejects(request, error => error instanceof TypeError
          && /too many content-encodings/.test(error.cause?.message));
        await delay(150);
      }
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise(resolve => server.close(resolve));
    }
    console.log('completed');
  })().catch(error => {console.error(error); process.exitCode = 1;});
`;

test.each(consumers)('%s: excessive encodings cannot crash fetch and ordinary decoding works', async name => {
  const consumer = createRequire(fileURLToPath(new URL(`${name}/package.json`, root)));
  const entry = consumer.resolve('undici');
  for (const mode of ['repeated', 'mixed', 'valid']) {
    const result = await run(process.execPath, ['-e', probe, entry, mode], {timeout: 10000})
      .then(output => ({...output, status: 0}), error => ({...error, status: error.code}));
    expect(result.status, `${name} ${mode}: ${result.stderr}`).toBe(0);
    expect(result.stdout.trim()).toBe('completed');
  }
}, 40000);
