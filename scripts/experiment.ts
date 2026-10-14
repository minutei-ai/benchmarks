import oabMetadata from "../benchmarks/oab-bench/package.json";
import { Cause, Effect, Match, Schema } from "effect";
import { appendFile, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { runProcess } from "@minutei/benchmark/adapter";
import { AgentConfig, Manifest, WorkRecord } from "@minutei/benchmark/contracts";
import { caseDigest } from "@minutei/benchmark/evaluate";
import { Record as OabRecord, RunConfig, TaskId } from "../benchmarks/oab-bench/src/contracts";
import { createEnvironment } from "../benchmarks/oab-bench/src/environment";
import { Record as MemoryRecord } from "../benchmarks/legal-memory-bench/src/contracts";
import {
  caseDigest as memoryCaseDigest,
  loadCase as loadMemory,
} from "../benchmarks/legal-memory-bench/src/cases";
import { loadCase as loadTask } from "../benchmarks/legal-task-bench/src/cases";
import { loadCase as loadLong } from "../benchmarks/legal-longcase-bench/src/cases";
import { Experiment, ExperimentRecord, Summary, Trial } from "./contracts";
import { InvalidExperiment, summarize } from "./results";

const persistExperiment = Effect.fn("benchmark.persist_experiment")(function* (
  path: string,
  record: typeof ExperimentRecord.Type,
) {
  const pending = `${path}.pending`;
  yield* Effect.tryPromise(() =>
    Bun.write(pending, Schema.encodeSync(Schema.fromJsonString(ExperimentRecord))(record)),
  );
  yield* Effect.tryPromise(() => rename(pending, path));
});

const run = Effect.fn("benchmark.experiment")(function* () {
  const configPath = process.argv[2];
  if (!configPath)
    return yield* Effect.fail("Usage: bun run experiment /absolute/path/to/experiment.json");
  const config = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Experiment))(
    yield* Effect.tryPromise(() => Bun.file(configPath).text()),
  );
  const outputDirectory = resolve(config.outputDirectory);
  const manifestPath = join(outputDirectory, "experiment.json");
  if (yield* Effect.tryPromise(() => Bun.file(manifestPath).exists()))
    return yield* Effect.fail(
      "An experiment already exists in outputDirectory; use a new directory",
    );
  yield* Effect.tryPromise(() => mkdir(dirname(outputDirectory), { recursive: true }));
  yield* Effect.tryPromise(() => mkdir(outputDirectory));
  const root = new URL("../", import.meta.url).pathname;
  const suites = yield* Effect.forEach(Object.entries(config.commands), ([benchmark, command]) =>
    Effect.gen(function* () {
      if (benchmark === "oab-bench")
        return { benchmark, command, version: oabMetadata.version, cases: TaskId.literals };
      const manifest = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Manifest))(
        yield* Effect.tryPromise(() =>
          Bun.file(join(root, "benchmarks", benchmark, "benchmark.json")).text(),
        ),
      );
      return { benchmark, command, version: manifest.version, cases: manifest.cases };
    }),
  );
  const expectedTrials = suites.reduce((sum, suite) => sum + suite.cases.length * config.trials, 0);
  const results: Array<typeof Trial.Type> = [];
  yield* persistExperiment(manifestPath, { config, expectedTrials, results, summary: null });
  const ledgerPath = join(outputDirectory, "trials.jsonl");
  const directory = yield* Effect.acquireRelease(
    Effect.tryPromise(() => mkdtemp(join(tmpdir(), "minutei-experiment-"))),
    (path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
  );
  for (const suite of suites) {
    for (const caseId of suite.cases) {
      const fixtureDigest = yield* Match.value(suite.benchmark).pipe(
        Match.when("oab-bench", () =>
          Effect.succeed(createEnvironment(Schema.decodeUnknownSync(TaskId)(caseId)).fixtureDigest),
        ),
        Match.when("legal-memory-bench", () =>
          Effect.tryPromise(() => loadMemory(caseId)).pipe(Effect.map(memoryCaseDigest)),
        ),
        Match.when("legal-task-bench", () =>
          Effect.tryPromise(() => loadTask(caseId)).pipe(Effect.map(caseDigest)),
        ),
        Match.orElse(() => Effect.tryPromise(() => loadLong(caseId)).pipe(Effect.map(caseDigest))),
      );
      for (const index of Array.from({ length: config.trials }, (_, value) => value)) {
        const outputPath = join(outputDirectory, `${suite.benchmark}-${caseId}-${index + 1}.json`);
        const invocationPath = join(directory, "run.json");
        const invocation = {
          caseId,
          model: config.model,
          harness: config.harness,
          command: suite.command,
          output: outputPath,
          timeoutMs: config.timeoutMs,
        };
        const suiteDirectory = join(root, "benchmarks", suite.benchmark);
        const script = Match.value(suite.benchmark).pipe(
          Match.when("oab-bench", () => "src/cli.ts"),
          Match.orElse(() => "src/run.ts"),
        );
        if (suite.benchmark === "oab-bench")
          yield* Effect.tryPromise(() =>
            Bun.write(
              invocationPath,
              Schema.encodeSync(Schema.fromJsonString(RunConfig))({
                task: Schema.decodeUnknownSync(TaskId)(caseId),
                model: config.model,
                harness: config.harness,
                seed: index,
                command: suite.command,
              }),
            ),
          );
        else
          yield* Effect.tryPromise(() =>
            Bun.write(
              invocationPath,
              Schema.encodeSync(Schema.fromJsonString(AgentConfig))(invocation),
            ),
          );
        const base = {
          benchmark: suite.benchmark,
          version: suite.version,
          caseId,
          trial: index + 1,
          model: config.model,
          harness: config.harness,
          fixtureDigest,
        };
        const record = yield* Effect.scoped(
          Effect.gen(function* () {
            const process = yield* runProcess(
              {
                ...invocation,
                timeoutMs: 3600000,
                command: ["bun", "--no-orphans", script, invocationPath],
              },
              suiteDirectory,
              "",
              `${outputPath}.runner.stderr.log`,
              8388608,
            );
            if (suite.benchmark === "oab-bench") {
              const outcome = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(OabRecord))(
                process.output,
              );
              if (
                outcome.fixtureDigest !== fixtureDigest ||
                outcome.config.task !== caseId ||
                outcome.config.model !== config.model ||
                outcome.config.harness !== config.harness ||
                outcome.version !== suite.version
              )
                return yield* Effect.fail(
                  new InvalidExperiment({
                    reason: "OAB trial provenance changed during execution",
                  }),
                );
              yield* Effect.tryPromise(() =>
                Bun.write(outputPath, Schema.encodeSync(Schema.fromJsonString(OabRecord))(outcome)),
              );
              const status = Match.value(outcome).pipe(
                Match.when({ passed: true }, () => "passed" as const),
                Match.when(
                  (outcome) => outcome.failure === null,
                  () => "failed" as const,
                ),
                Match.orElse(() => "execution_failed" as const),
              );
              return {
                ...base,
                status,
                automaticPassed: outcome.passed,
                elapsedMs: outcome.elapsedMs,
                failure: outcome.failure,
              };
            }
            if (suite.benchmark === "legal-memory-bench") {
              const outcome = yield* Schema.decodeUnknownEffect(
                Schema.fromJsonString(MemoryRecord),
              )(process.output);
              if (
                outcome.fixtureDigest !== fixtureDigest ||
                outcome.config.caseId !== caseId ||
                outcome.config.model !== config.model ||
                outcome.config.harness !== config.harness ||
                outcome.version !== suite.version
              )
                return yield* Effect.fail(
                  new InvalidExperiment({
                    reason: "Memory trial provenance changed during execution",
                  }),
                );
              const status = Match.value(outcome).pipe(
                Match.when({ status: "execution_failed" }, () => "execution_failed" as const),
                Match.when({ report: { passed: true } }, () => "passed" as const),
                Match.orElse(() => "failed" as const),
              );
              return {
                ...base,
                status,
                automaticPassed: outcome.report?.passed ?? null,
                elapsedMs: outcome.elapsedMs,
                failure: outcome.failure,
              };
            }
            const outcome = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(WorkRecord))(
              process.output,
            );
            if (
              outcome.fixtureDigest !== fixtureDigest ||
              outcome.config.caseId !== caseId ||
              outcome.config.model !== config.model ||
              outcome.config.harness !== config.harness ||
              outcome.version !== suite.version
            )
              return yield* Effect.fail(
                new InvalidExperiment({ reason: "Work trial provenance changed during execution" }),
              );
            const status = Match.value(outcome).pipe(
              Match.when({ status: "execution_failed" }, () => "execution_failed" as const),
              Match.when({ report: { passed: true } }, () => "passed" as const),
              Match.when(
                { report: { status: "awaiting_review" } },
                () => "awaiting_review" as const,
              ),
              Match.orElse(() => "failed" as const),
            );
            return {
              ...base,
              status,
              automaticPassed: outcome.report?.automaticPassed ?? null,
              elapsedMs: outcome.elapsedMs,
              failure: outcome.failure,
            };
          }),
        ).pipe(
          Effect.catchCause((cause) =>
            Effect.gen(function* () {
              const failure = Cause.pretty(cause);
              yield* Effect.tryPromise(() => Bun.write(`${outputPath}.failure.log`, failure));
              return {
                ...base,
                status: "execution_failed" as const,
                automaticPassed: null,
                elapsedMs: null,
                failure,
              };
            }),
          ),
        );
        const indexed = { ...record, failure: record.failure?.slice(0, 8192) ?? null };
        yield* Effect.tryPromise(() =>
          appendFile(ledgerPath, Schema.encodeSync(Schema.fromJsonString(Trial))(indexed) + "\n"),
        );
        results.push(indexed);
        console.error(
          `${record.benchmark} ${record.caseId} trial ${record.trial}: ${record.status}`,
        );
      }
    }
  }
  const summary = yield* summarize(results);
  yield* persistExperiment(manifestPath, { config, expectedTrials, results, summary });
  console.log(Schema.encodeSync(Schema.fromJsonString(Summary))(summary));
  if (summary.successes !== expectedTrials) process.exitCode = 1;
});

await Effect.runPromise(Effect.scoped(run()));
