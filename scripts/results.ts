import { Effect, Schema } from "effect";
import { Trial } from "./contracts";

export class InvalidExperiment extends Schema.TaggedError<InvalidExperiment>()(
  "InvalidExperiment",
  { reason: Schema.String },
) {}

function passPower(successes: number, trials: number, power: number) {
  if (trials < power) return null;
  if (successes < power) return 0;
  return Array.from({ length: power }, (_, index) => (successes - index) / (trials - index)).reduce(
    (product, value) => product * value,
    1,
  );
}

export const summarize = Effect.fn("benchmark.summarize")(function* (
  trials: ReadonlyArray<typeof Trial.Type>,
) {
  if (!trials.length) return yield* Effect.fail(new InvalidExperiment({ reason: "No trials" }));
  const identities = new Set(
    trials.map((trial) => `${trial.benchmark}:${trial.caseId}:${trial.trial}`),
  );
  if (identities.size !== trials.length)
    return yield* Effect.fail(new InvalidExperiment({ reason: "Duplicate trial identity" }));
  const configurations = new Set(trials.map((trial) => `${trial.model}:${trial.harness}`));
  if (configurations.size !== 1)
    return yield* Effect.fail(
      new InvalidExperiment({ reason: "One summary requires one model and harness configuration" }),
    );
  const groups = Map.groupBy(trials, (trial) => `${trial.benchmark}:${trial.caseId}`);
  const cases = yield* Effect.forEach([...groups.values()], (records) =>
    Effect.gen(function* () {
      const revisions = new Set(
        records.map((record) => `${record.version}:${record.fixtureDigest}`),
      );
      if (revisions.size !== 1)
        return yield* Effect.fail(
          new InvalidExperiment({ reason: "Repeated trials must use the same fixture revision" }),
        );
      const successes = records.filter((record) => record.status === "passed").length;
      return {
        benchmark: records[0].benchmark,
        caseId: records[0].caseId,
        trials: records.length,
        successes,
        passPower1: successes / records.length,
        passPower2: passPower(successes, records.length, 2),
        passPower4: passPower(successes, records.length, 4),
      };
    }),
  );
  const successes = trials.filter((trial) => trial.status === "passed").length;
  return {
    trials: trials.length,
    successes,
    pendingReview: trials.filter((trial) => trial.status === "awaiting_review").length,
    executionFailures: trials.filter((trial) => trial.status === "execution_failed").length,
    cases,
  };
});
