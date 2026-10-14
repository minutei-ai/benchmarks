import { expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentConfig, Execution } from "../src/contracts";

const execute = Effect.fn("test.runner")(function* (
  suite: string,
  caseId: string,
  source: string,
  timeoutMs = 1000,
) {
  const directory = yield* Effect.acquireRelease(
    Effect.promise(() => mkdtemp(join(tmpdir(), "benchmark-failure-"))),
    (path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
  );
  const output = join(directory, "result.json");
  const configPath = join(directory, "config.json");
  yield* Effect.promise(() =>
    Bun.write(
      configPath,
      Schema.encodeSync(Schema.fromJsonString(AgentConfig))({
        caseId,
        model: "protocol-control-no-model",
        harness: "failure-control",
        command: ["bun", "-e", source],
        output,
        timeoutMs,
      }),
    ),
  );
  const runner = new URL(`../../../benchmarks/${suite}/src/run.ts`, import.meta.url).pathname;
  const child = yield* Effect.acquireRelease(
    Effect.sync(() =>
      Bun.spawn(["bun", runner, configPath], { stdout: "pipe", stderr: "pipe", timeout: 10000 }),
    ),
    (process) =>
      Effect.promise(async () => {
        process.kill();
        await process.exited;
      }),
  );
  const stdout = yield* Effect.promise(() => new Response(child.stdout).text());
  const record = Schema.decodeUnknownSync(Schema.fromJsonString(Execution))(stdout);
  const persisted = Schema.decodeUnknownSync(Schema.fromJsonString(Execution))(
    yield* Effect.promise(() => Bun.file(output).text()),
  );
  expect(yield* Effect.promise(() => child.exited)).toBe(1);
  expect(persisted.status).toBe(record.status);
  expect(persisted.status).toBe("execution_failed");
  return { record, output };
});

for (const [suite, caseId] of [
  ["legal-task-bench", "T01"],
  ["legal-longcase-bench", "C01"],
  ["legal-memory-bench", "M01"],
] as const) {
  test(`${suite}: process failures preserve the result and stderr`, () =>
    Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const result = yield* execute(
            suite,
            caseId,
            'console.error("adapter-diagnostic"); process.exit(7);',
          );
          expect(result.record.failure).toContain("AdapterExit");
          const path = (() => {
            if (suite === "legal-memory-bench") return `${result.output}.S1.stderr.log`;
            return `${result.output}.stderr.log`;
          })();
          expect(yield* Effect.promise(() => Bun.file(path).text())).toContain(
            "adapter-diagnostic",
          );
        }),
      ),
    ));

  test(`${suite}: malformed JSON is retained as a protocol failure`, () =>
    Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const result = yield* execute(suite, caseId, 'console.log("not valid json");');
          expect(result.record.failure).toContain("SchemaError");
        }),
      ),
    ));
}

test("stdout overflow is bounded and remains a failed recorded trial", () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const result = yield* execute(
          "legal-task-bench",
          "T01",
          'console.log("x".repeat(2100000));',
        );
        expect(result.record.failure).toContain("AdapterOutputLimit");
      }),
    ),
  ));

test("an adapter timeout remains in the experiment denominator", () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const result = yield* execute("legal-task-bench", "T01", "await Bun.sleep(5000);");
        expect(result.record.failure).toContain("AdapterExit");
        expect(result.record.elapsedMs).toBeGreaterThanOrEqual(1000);
      }),
    ),
  ));

const MemoryPartial = Schema.Struct({
  submission: Schema.Struct({
    caseId: Schema.String,
    sessions: Schema.Array(Schema.Struct({ sessionId: Schema.String })),
  }),
});

test("a later memory failure preserves the already completed session", () =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const source =
          'const task = await Bun.stdin.json(); if (task.sessionId === "S2") process.exit(7); console.log(JSON.stringify({sessionId: task.sessionId, answers: []}));';
        const result = yield* execute("legal-memory-bench", "M01", source);
        const partial = Schema.decodeUnknownSync(Schema.fromJsonString(MemoryPartial))(
          yield* Effect.promise(() => Bun.file(result.output).text()),
        );
        expect(partial.submission.sessions.map((session) => session.sessionId)).toEqual(["S1"]);
      }),
    ),
  ));
