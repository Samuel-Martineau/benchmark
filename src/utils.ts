import assert from "node:assert/strict";

function roundToOrder(num: number, order: number) {
  const factor = Math.pow(10, -order);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

function summaryStatistics(datums: number[]) {
  const mean = datums.reduce((acc, curr) => acc + curr, 0) / datums.length;
  const standardDeviation = Math.sqrt(
    datums.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) /
      (datums.length - 1),
  );

  const uncertainty = +standardDeviation.toPrecision(1);
  const value = roundToOrder(mean, Math.floor(Math.log10(uncertainty)));

  return `${value} ± ${uncertainty}`;
}

export const nullTerminator = Buffer.alloc(1);
export const emptyBuffer = Buffer.alloc(0);

export function bufferFromChar(str: string) {
  assert(str.length === 1);
  return Buffer.from(str);
}

export function bufferFromString(str: string) {
  return Buffer.concat([Buffer.from(str), Buffer.alloc(1)]);
}

export function bufferFromInt32(int: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(int);
  return buffer;
}

export function constructMessage(
  parts: (string | number)[],
  prefix = emptyBuffer,
) {
  const message = Buffer.concat(
    parts.map((p) =>
      typeof p === "string" ? bufferFromString(p) : bufferFromInt32(p),
    ),
  );
  const length = bufferFromInt32(message.byteLength + 4 + 1);
  return Buffer.concat([prefix, length, message, nullTerminator]);
}
