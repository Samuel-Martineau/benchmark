import net from "node:net";
import tls from "node:tls";
import assert from "node:assert";

const nullTerminator = Buffer.alloc(1);
const emptyBuffer = Buffer.alloc(0);

function bufferFromChar(str: string) {
  assert(str.length === 1);
  return Buffer.from(str);
}

function bufferFromString(str: string) {
  return Buffer.concat([Buffer.from(str), Buffer.alloc(1)]);
}

function bufferFromInt32(int: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(int);
  return buffer;
}

function constructMessage(parts: (string | number)[], prefix = emptyBuffer) {
  const message = Buffer.concat(
    parts.map((p) =>
      typeof p === "string" ? bufferFromString(p) : bufferFromInt32(p),
    ),
  );
  const length = bufferFromInt32(message.byteLength + 4 + 1);
  return Buffer.concat([prefix, length, message, nullTerminator]);
}

async function waitForData(client: net.Socket, step: string) {
  const start = performance.now();
  const data = await new Promise<Buffer>((r) => client.once("data", r));
  const end = performance.now();
  console.log(
    Math.round(end - start)
      .toString()
      .padStart(3),
    "ms",
    "—",
    step,
  );
  return data;
}

let client = new net.Socket();

console.time("connect");
await new Promise<void>((r) =>
  client.connect(+process.env.PORT, process.env.HOST, r),
);
console.timeEnd("connect");

// https://www.postgresql.org/docs/current/protocol-message-formats.html#PROTOCOL-MESSAGE-FORMATS-SSLREQUEST
client.write(constructMessage([80877103 /* 1 2 3 4  5 6 7 9*/]));
// https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-SSL
assert(
  (await waitForData(client, "requesting tls")).equals(bufferFromChar("S")),
);

console.time("tls");
client = new tls.TLSSocket(client);
console.timeEnd("tls");

// https://www.postgresql.org/docs/current/protocol-message-formats.html#PROTOCOL-MESSAGE-FORMATS-STARTUPMESSAGE
client.write(
  constructMessage([
    196608 /* 0 0 0 3  0 0 0 0 */,
    "user",
    process.env.USER,
    "database",
    process.env.DATABASE,
    // "options",
    // `endpoint=ep-fragrant-night-a44pe6nu`,
  ]),
);

// https://www.postgresql.org/docs/current/protocol-message-formats.html#PROTOCOL-MESSAGE-FORMATS-PASSWORDMESSAGE
assert(
  (
    await waitForData(
      client,
      "upgrading connection to tls and sending startup message",
    )
  ).equals(
    Buffer.concat([
      bufferFromChar("R"),
      bufferFromInt32(8),
      bufferFromInt32(3),
    ]),
  ),
);

function splitMessages(buffer: Buffer) {
  const messages = [];
  let offset = 0;

  do {
    const length = buffer.readInt32BE(offset + 1);
    messages.push(buffer.subarray(offset, (offset = offset + length + 1)));
  } while (offset < buffer.byteLength);

  return messages;
}

client.write(constructMessage([process.env.PASSWORD], bufferFromChar("p")));
console.log(
  constructMessage([process.env.PASSWORD], bufferFromChar("p")).toString("hex"),
);
assert(
  splitMessages(await waitForData(client, "sending password"))
    .at(-1)
    .equals(
      Buffer.concat([
        bufferFromChar("Z"),
        bufferFromInt32(5),
        bufferFromChar("I"),
      ]),
    ),
);

client.destroy();
