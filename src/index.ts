import pg from "pg";
import { XataClient } from "./xata.js";
import { faker } from "@faker-js/faker";
import { data, measure, summarizeResults } from "./utils.js";

const xata = new XataClient({
  apiKey: process.env.XATA_API_KEY,
  branch: process.env.XATA_BRANCH,
});

async function tcpTest() {
  const m = measure("tcp");

  const client = new pg.Client({
    connectionString: xata.sql.connectionString,
  });

  await m("connect", () => client.connect());
  await m("query", () =>
    client.query("INSERT INTO my_table (text) VALUES ($1)", [
      faker.location.streetAddress(),
    ]),
  );
  await m("end", () => client.end());
}

async function httpTest() {
  const m = measure("http");
  await m(
    "query",
    () =>
      xata.sql`INSERT INTO my_table (text) VALUES (${faker.location.streetAddress()})`,
  );
}

await tcpTest();

console.log(data);

// const sampleCount = 1000;
// for (let i = 1; i <= sampleCount; i++) {
//   await tcpTest();
//   await httpTest();
//   console.log(
//     "\x1bc",
//     `${i.toString().padStart(sampleCount.toString().length)} / ${sampleCount}\n`,
//     summarizeResults(),
//   );
// }
