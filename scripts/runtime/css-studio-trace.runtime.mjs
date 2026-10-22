import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import WebSocket from "ws";
import { withImagePilotTrace } from "../trace-css-studio-pilot.mjs";

const API =
  "https://api.cloudflare.com/client/v4/accounts/d33da711f0acb00005de85f10c11ab0f/workers/scripts/css-studio-ai/tails";
const ISSUED_URL = "wss://tail.cloudflare.com/local-runtime-fixture";
const TAIL_ID = "a1".repeat(16);
const PILOT_ID = "16db4c34-5da4-4fa3-8df4-e651ac53515a";

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function bounded(promise, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Local fixture timed out.")),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// A raw loopback upgrade peer deliberately ignores every WebSocket frame,
// including CLOSE. The only API implementation is the fake function below.
// Unlike a WebSocketServer, this peer never completes a closing handshake.
test(
  "Node 22 releases the trace TCP handle when its peer ignores CLOSE",
  { timeout: 15000 },
  async () => {
    assert.match(
      process.versions.node,
      /^22\./,
      "Run this fixture with the pinned Node 22 runtime.",
    );
    const connections = new Set();
    const closeFrame = deferred(),
      tcpClosed = deferred();
    let peerError,
      accepted = false,
      closed = false,
      calls = 0,
      runCalls = 0;
    const server = createServer((_request, response) => {
      response.writeHead(404).end();
    });
    server.on("connection", (socket) => {
      connections.add(socket);
      socket.on("error", () => {});
      socket.once("close", () => connections.delete(socket));
    });
    server.on("upgrade", (request, socket) => {
      try {
        assert.equal(request.url, "/trace-runtime");
        assert.equal(request.headers["sec-websocket-protocol"], "trace-v1");
        assert.equal(request.headers.authorization, undefined);
        const accept = createHash("sha1")
          .update(
            request.headers["sec-websocket-key"] +
              "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
          )
          .digest("base64");
        socket.write(
          [
            "HTTP/1.1 101 Switching Protocols",
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Accept: ${accept}`,
            "Sec-WebSocket-Protocol: trace-v1",
            "",
            "",
          ].join("\r\n"),
        );
        accepted = true;
        // HTTP upgrade sockets allow half-open TCP connections. Finish the
        // writable side only after the client's forced TCP shutdown sends FIN;
        // this is not a reply to a WebSocket CLOSE frame.
        socket.once("end", () => socket.end());
        let pending = Buffer.alloc(0);
        socket.on("data", (chunk) => {
          // Inspect framing only. No payload or header values leave this fixture.
          pending = Buffer.concat([pending, chunk]);
          while (pending.length >= 2) {
            const opcode = pending[0] & 15;
            let length = pending[1] & 127,
              offset = 2;
            if (length === 126) {
              if (pending.length < 4) return;
              length = pending.readUInt16BE(2);
              offset = 4;
            } else if (length === 127) {
              peerError = new Error("Unexpected local fixture frame size.");
              socket.destroy();
              return;
            }
            if (pending[1] & 128) offset += 4;
            if (pending.length < offset + length) return;
            if (opcode === 8) closeFrame.resolve();
            pending = pending.subarray(offset + length);
            // Intentionally send neither a CLOSE reply nor any other frame.
          }
        });
        socket.once("close", () => {
          closed = true;
          tcpClosed.resolve();
        });
      } catch (error) {
        peerError = error;
        socket.destroy();
      }
    });
    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      assert.equal(typeof address, "object");
      const localURL = `ws://127.0.0.1:${address.port}/trace-runtime`;
      class LocalOnlySocket extends WebSocket {
        constructor(url, protocol, options) {
          assert.equal(url, ISSUED_URL);
          // This test-only mapping prevents any Cloudflare connection. The
          // production helper still validates the supplied provider URL first.
          super(localURL, protocol, options);
        }
      }
      const started = Date.now();
      const observed = await bounded(
        withImagePilotTrace(
          {
            token: "local-fixture-token-only",
            pilotId: PILOT_ID,
            WebSocket: LocalOnlySocket,
            fetch: async (url, options) => {
              calls++;
              assert.equal(options.redirect, "error");
              if (calls === 1) {
                assert.equal(url, API);
                assert.equal(options.method, "POST");
                return Response.json({
                  success: true,
                  result: { id: TAIL_ID, url: ISSUED_URL },
                });
              }
              assert.equal(calls, 2, "No API retry is permitted.");
              assert.equal(url, `${API}/${TAIL_ID}`);
              assert.equal(options.method, "DELETE");
              await bounded(closeFrame.promise, 1000);
              assert.equal(
                closed,
                false,
                "The peer has ignored CLOSE and kept TCP open.",
              );
              return Response.json({ success: true });
            },
          },
          async () => {
            runCalls++;
            assert.equal(accepted, true);
            return "local-pilot-complete";
          },
        ),
        10000,
      );
      await bounded(tcpClosed.promise, 1000);
      assert.equal(peerError, undefined);
      assert.equal(observed.result, "local-pilot-complete");
      assert.deepEqual(observed.telemetry, {
        cpuMeasured: false,
        reason: "not-observed",
      });
      assert.equal(runCalls, 1);
      assert.equal(calls, 2);
      assert.equal(closed, true);
      assert.ok(
        Date.now() - started < 8000,
        "Hard termination must not wait for ws's 30s close timer.",
      );
    } finally {
      for (const socket of connections) socket.destroy();
      await bounded(new Promise((resolve) => server.close(resolve)), 1000);
    }
  },
);
