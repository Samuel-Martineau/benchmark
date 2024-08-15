import { drizzle as drizzleHttp } from "drizzle-orm/xata-http";
import { drizzle as drizzleTcp } from "drizzle-orm/node-postgres";
import pg from "pg";
import { XataClient } from "./xata.js";
import { faker } from "@faker-js/faker";
import {
  PgDatabase,
  PgQueryResultHKT,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

const myTable = pgTable("my_table", {
  text: text("text").notNull(),
  id: text("xata_id").primaryKey().generatedAlwaysAs(null),
});

function sampleMean(datums: number[]) {
  return datums.reduce((acc, curr) => acc + curr, 0) / datums.length;
}

function sampleStandardDeviation(datums: number[]) {
  const mean = sampleMean(datums);
  return Math.sqrt(
    datums.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) /
      (datums.length - 1),
  );
}

async function insert(
  db: PgDatabase<PgQueryResultHKT, Record<string, unknown>>,
) {
  await db
    .insert(myTable)
    .values({ text: faker.location.streetAddress() })
    .execute();
}

async function httpTest() {
  const start = performance.now();

  const xata = new XataClient({
    apiKey: process.env.XATA_API_KEY,
    branch: process.env.XATA_BRANCH,
  });

  const db = drizzleHttp(xata);

  await insert(db);

  const end = performance.now();

  return end - start;
}

async function tcpTest() {
  const start = performance.now();

  const xata = new XataClient({
    apiKey: process.env.XATA_API_KEY,
    branch: process.env.XATA_BRANCH,
  });

  const client = new pg.Client({ connectionString: xata.sql.connectionString });

  await client.connect();

  const db = drizzleTcp(client);

  await insert(db);

  await client.end();

  const end = performance.now();

  return end - start;
}

const sampleCount = 100;

const httpResults = [];
const tcpResults = [];

for (let i = 0; i < sampleCount; i++) {
  httpResults.push(await httpTest());
  tcpResults.push(await tcpTest());
  console.log(
    `${(i + 1).toString().padStart(sampleCount.toString().length)}/${sampleCount} HTTP(${sampleMean(httpResults).toFixed(0)}±${sampleStandardDeviation(httpResults).toFixed(0)}) TCP(${sampleMean(tcpResults).toFixed(0)}±${sampleStandardDeviation(tcpResults).toFixed(0)})`,
  );
}

console.log(
  "HTTP:",
  sampleMean(httpResults),
  sampleStandardDeviation(httpResults),
);
console.log(
  "TCP:",
  sampleMean(tcpResults),
  sampleStandardDeviation(tcpResults),
);
