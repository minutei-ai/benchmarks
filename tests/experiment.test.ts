import { expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Experiment, ExperimentRecord, Summary, Trial } from "../scripts/contracts";

test(
  "a full experiment records every failed attempt and refuses to overwrite it",
  () =>
    Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const directory = yield* Effect.acquireRelease(
            Effect.promise(() => mkdtemp(join(tmpdir(), "minutei-experiment-test-"))),
            (path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
          );
          const configPath = join(directory, "config.json");
          const outputDirectory = join(directory, "results");
          const command = ["bun", "-e", "process.exit(7);"];
          yield* Effect.promise(() =>
            Bun.write(
              configPath,
              Schema.encodeSync(Schema.fromJsonString(Experiment))({
                model: "protocol-control-no-model",
                harness: "failure-control",
                trials: 1,
                timeoutMs: 1000,
                outputDirectory,
                commands: {
                  "oab-bench": command,
                  "legal-task-bench": command,
                  "legal-memory-bench": command,
                  "legal-longcase-bench": command,
                },
              }),
            ),
          );
          const script = new URL("../scripts/experiment.ts", import.meta.url).pathname;
          const child = yield* Effect.acquireRelease(
            Effect.sync(() =>
              Bun.spawn(["bun", script, configPath], {
                stdout: "pipe",
                stderr: "pipe",
                timeout: 30000,
              }),
            ),
            (process) =>
              Effect.promise(async () => {
                process.kill();
                await process.exited;
              }),
          );
          const summary = Schema.decodeUnknownSync(Schema.fromJsonString(Summary))(
            yield* Effect.promise(() => new Response(child.stdout).text()),
          );
          expect(yield* Effect.promise(() => child.exited)).toBe(1);
          expect(summary.trials).toBe(28);
          expect(summary.executionFailures).toBe(28);
          expect(summary.successes).toBe(0);
          const persisted = Schema.decodeUnknownSync(Schema.fromJsonString(ExperimentRecord))(
            yield* Effect.promise(() => Bun.file(join(outputDirectory, "experiment.json")).text()),
          );
          expect(persisted.expectedTrials).toBe(28);
          expect(persisted.results).toHaveLength(28);
          const ledger = (yield* Effect.promise(() =>
            Bun.file(join(outputDirectory, "trials.jsonl")).text(),
          ))
            .trim()
            .split("\n")
            .map((line) => Schema.decodeUnknownSync(Schema.fromJsonString(Trial))(line));
          expect(persisted.results).toEqual(ledger);
          const second = yield* Effect.acquireRelease(
            Effect.sync(() =>
              Bun.spawn(["bun", script, configPath], {
                stdout: "pipe",
                stderr: "pipe",
                timeout: 10000,
              }),
            ),
            (process) =>
              Effect.promise(async () => {
                process.kill();
                await process.exited;
              }),
          );
          expect(yield* Effect.promise(() => second.exited)).toBe(1);
          expect(yield* Effect.promise(() => new Response(second.stderr).text())).toContain(
            "An experiment already exists",
          );
          expect(
            Schema.decodeUnknownSync(Schema.fromJsonString(ExperimentRecord))(
              yield* Effect.promise(() =>
                Bun.file(join(outputDirectory, "experiment.json")).text(),
              ),
            ),
          ).toEqual(persisted);
        }),
      ),
    ),
  30000,
);

test(
  "an experiment executes the real suite runners and distinguishes failed work from infrastructure",
  () =>
    Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const directory = yield* Effect.acquireRelease(
            Effect.promise(() => mkdtemp(join(tmpdir(), "minutei-observed-experiment-"))),
            (path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
          );
          const configPath = join(directory, "config.json");
          const command = [
            "bun",
            "-e",
            'const input = await Bun.stdin.json(); if ("sessionId" in input) console.log(JSON.stringify({sessionId:input.sessionId,answers:[]})); if ("documentsFile" in input) console.log(JSON.stringify({caseId:input.caseId,answers:[],artifacts:[]}));',
          ];
          const oab = [
            "bun",
            new URL("../benchmarks/oab-bench/tests/fixtures/observed-adapter.ts", import.meta.url)
              .pathname,
          ];
          yield* Effect.promise(() =>
            Bun.write(
              configPath,
              Schema.encodeSync(Schema.fromJsonString(Experiment))({
                model: "protocol-control-no-model",
                harness: "observed-control",
                trials: 1,
                timeoutMs: 5000,
                outputDirectory: join(directory, "results"),
                commands: {
                  "oab-bench": oab,
                  "legal-task-bench": command,
                  "legal-memory-bench": command,
                  "legal-longcase-bench": command,
                },
              }),
            ),
          );
          const child = yield* Effect.acquireRelease(
            Effect.sync(() =>
              Bun.spawn(
                ["bun", new URL("../scripts/experiment.ts", import.meta.url).pathname, configPath],
                { stdout: "pipe", stderr: "pipe", timeout: 30000 },
              ),
            ),
            (process) =>
              Effect.promise(async () => {
                process.kill();
                await process.exited;
              }),
          );
          const summary = Schema.decodeUnknownSync(Schema.fromJsonString(Summary))(
            yield* Effect.promise(() => new Response(child.stdout).text()),
          );
          expect(yield* Effect.promise(() => child.exited)).toBe(1);
          expect(summary.trials).toBe(28);
          expect(summary.successes).toBe(6);
          expect(summary.executionFailures).toBe(0);
          expect(
            summary.cases
              .filter((item) => item.benchmark === "oab-bench")
              .every((item) => item.successes === 1),
          ).toBe(true);
        }),
      ),
    ),
  30000,
);
