import { expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import { Experiment, Trial } from "../scripts/contracts";
import { summarize } from "../scripts/results";

const trial = {
  benchmark: "oab-bench",
  version: "0.2.0",
  caseId: "retry",
  trial: 1,
  model: "fixed-model",
  harness: "fixed-harness",
  fixtureDigest: "fixed-fixture",
  status: "passed" as const,
  automaticPassed: true,
  elapsedMs: 100,
  failure: null,
};

test("failed attempts stay in pass-power denominators", async () => {
  const records = [
    trial,
    { ...trial, trial: 2 },
    { ...trial, trial: 3 },
    { ...trial, trial: 4, status: "execution_failed" as const, automaticPassed: null },
  ];
  const summary = await Effect.runPromise(summarize(records));
  expect(summary.cases[0].passPower1).toBe(0.75);
  expect(summary.cases[0].passPower2).toBe(0.5);
  expect(summary.cases[0].passPower4).toBe(0);
  expect(summary.executionFailures).toBe(1);
});

test("insufficient repetitions are unavailable rather than zero", async () => {
  const summary = await Effect.runPromise(summarize([trial]));
  expect(summary.cases[0].passPower2).toBeNull();
  expect(summary.cases[0].passPower4).toBeNull();
});

test("pending legal review is separated from a successful trial", async () => {
  const summary = await Effect.runPromise(
    summarize([{ ...trial, status: "awaiting_review" as const }]),
  );
  expect(summary.successes).toBe(0);
  expect(summary.pendingReview).toBe(1);
});

test("mixed model configurations and duplicate attempts cannot be summarized", async () => {
  expect(await Effect.runPromise(Effect.result(summarize([trial, trial])))).toMatchObject({
    _tag: "Failure",
  });
  expect(
    await Effect.runPromise(
      Effect.result(summarize([trial, { ...trial, trial: 2, model: "other-model" }])),
    ),
  ).toMatchObject({ _tag: "Failure" });
  expect(
    await Effect.runPromise(
      Effect.result(summarize([trial, { ...trial, trial: 2, fixtureDigest: "changed" }])),
    ),
  ).toMatchObject({ _tag: "Failure" });
});

test("the experiment requires commands for all four suites", () => {
  const partial = {
    model: "fixed",
    harness: "fixed",
    trials: 4,
    outputDirectory: "/tmp/experiment",
    commands: { "oab-bench": ["bun", "adapter.ts"] },
  };
  expect(Schema.is(Experiment)(partial)).toBe(false);
  expect(Schema.is(Trial)(trial)).toBe(true);
});

test("configuration keys cannot collide when identities contain separators", async () => {
  const records = [
    { ...trial, model: "a:b", harness: "c" },
    { ...trial, trial: 2, model: "a", harness: "b:c" },
  ];
  expect(await Effect.runPromise(Effect.result(summarize(records)))).toMatchObject({
    _tag: "Failure",
  });
});
