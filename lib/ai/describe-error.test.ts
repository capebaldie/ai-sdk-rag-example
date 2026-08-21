import { test } from "node:test";
import assert from "node:assert/strict";
import { describeError } from "./describe-error";

// The real shape: Drizzle hides the connect failure two levels down.
const drizzle = new Error("Failed query: select ... params: [0.1,0.2,...]", {
  cause: Object.assign(new AggregateError([], ""), { code: "ETIMEDOUT" }),
});

test("finds the network code in the cause chain", () => {
  assert.match(describeError(drizzle), /Connection failed/);
});

test("maps a provider quota error", () => {
  const e = new Error("Failed after 3 attempts", {
    cause: new Error("429 RESOURCE_EXHAUSTED: quota exceeded"),
  });
  assert.match(describeError(e), /quota reached/);
});

test("never leaks the SQL dump for an unmapped error", () => {
  const long = new Error("boom ".repeat(200));
  assert.equal(describeError(long).length, 200);
  assert.equal(describeError(undefined), "Something went wrong. Retry.");
});
