import { Schema } from "effect";
import { AgentConfig } from "@minutei/benchmark/contracts";

export const Experiment = Schema.Struct({
  model: AgentConfig.fields.model,
  harness: AgentConfig.fields.harness,
  timeoutMs: AgentConfig.fields.timeoutMs,
  trials: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(100)),
  outputDirectory: Schema.NonEmptyString,
  commands: Schema.Struct({
    "oab-bench": AgentConfig.fields.command,
    "legal-task-bench": AgentConfig.fields.command,
    "legal-memory-bench": AgentConfig.fields.command,
    "legal-longcase-bench": AgentConfig.fields.command,
  }),
});
export const Trial = Schema.Struct({
  benchmark: Schema.NonEmptyString,
  version: Schema.NonEmptyString,
  caseId: Schema.NonEmptyString,
  trial: Schema.Int,
  model: Schema.NonEmptyString,
  harness: Schema.NonEmptyString,
  fixtureDigest: Schema.NonEmptyString,
  status: Schema.Literals(["passed", "failed", "awaiting_review", "execution_failed"]),
  automaticPassed: Schema.NullOr(Schema.Boolean),
  elapsedMs: Schema.NullOr(Schema.Number),
  failure: Schema.NullOr(Schema.String),
});
export const Summary = Schema.Struct({
  trials: Schema.Int,
  successes: Schema.Int,
  pendingReview: Schema.Int,
  executionFailures: Schema.Int,
  cases: Schema.Array(
    Schema.Struct({
      benchmark: Schema.String,
      caseId: Schema.String,
      trials: Schema.Int,
      successes: Schema.Int,
      passPower1: Schema.Number,
      passPower2: Schema.NullOr(Schema.Number),
      passPower4: Schema.NullOr(Schema.Number),
    }),
  ),
});

export const ExperimentRecord = Schema.Struct({
  config: Experiment,
  expectedTrials: Schema.Int,
  results: Schema.Array(Trial),
  summary: Schema.NullOr(Summary),
});
