import assert from "node:assert/strict";
import { test } from "node:test";
import { normalize } from "../src/adapters/bilibili.js";

test("normalizes Bilibili job requirements and links", () => {
  const payload = normalize([
    {
      job_id: "29021",
      title: "Backend Leader",
      url: "https://jobs.bilibili.com/social/positions/29021",
      description: "Build backend systems",
      job_require: "Go and distributed systems",
    },
  ]);

  assert.equal(payload.source, "bilibili");
  assert.equal(payload.total, 1);
  assert.equal(payload.items[0].requirement, "Go and distributed systems");
  assert.equal(payload.items[0].url, "https://jobs.bilibili.com/social/positions/29021");
});
