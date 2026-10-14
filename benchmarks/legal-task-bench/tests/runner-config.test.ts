import { expect, test } from "bun:test";
import { Schema } from "effect";
import { AgentConfig } from "../src/contracts";

const config = { caseId: "sample", model: "sample", harness: "sample", command: ["bun", "adapter.ts"], output: "/tmp/result.json" };

test("runner accepts its default budget and a bounded custom timeout", () => {
  expect(Schema.is(AgentConfig)(config)).toBe(true);
  expect(Schema.is(AgentConfig)({ ...config, timeoutMs: 1800000 })).toBe(true);
  expect(Schema.is(AgentConfig)({ ...config, timeoutMs: 0 })).toBe(false);
  expect(Schema.is(AgentConfig)({ ...config, timeoutMs: 3600001 })).toBe(false);
});
