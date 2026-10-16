import { expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Record, TaskId } from "../src/contracts";

test("CLI rejects a completion with no saved work through a real subprocess", async () => {
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const directory = yield* Effect.acquireRelease(
          Effect.promise(() => mkdtemp(join(tmpdir(), "oab-bench-"))),
          (path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
        );
        const config = join(directory, "run.json");
        yield* Effect.promise(() =>
          writeFile(
            config,
            JSON.stringify({
              task: "evidence",
              model: "protocol-test-no-model",
              harness: "empty-completion",
              seed: 0,
              command: ["bun", "-e", 'console.log(JSON.stringify({type:"finish",message:"Done"}))'],
            }),
          ),
        );
        const proc = yield* Effect.acquireRelease(
          Effect.sync(() =>
            Bun.spawn(["bun", "src/cli.ts", config], {
              cwd: new URL("../", import.meta.url).pathname,
              stdout: "pipe",
              stderr: "pipe",
              timeout: 10000,
            }),
          ),
          (child) =>
            Effect.promise(async () => {
              child.kill();
              await child.exited;
            }),
        );
        const output = yield* Effect.promise(() => new Response(proc.stdout).json());
        const exitCode = yield* Effect.promise(() => proc.exited);
        expect(exitCode).toBe(1);
        expect(output.passed).toBe(false);
        expect(output.checks.singleDraft).toBe(false);
        expect(output.trace).toHaveLength(1);
      }),
    ),
  );
});

for (const task of TaskId.literals) {
  test(`${task}: a real protocol adapter can complete the observed environment`, async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const directory = yield* Effect.acquireRelease(
            Effect.promise(() => mkdtemp(join(tmpdir(), "oab-control-"))),
            (path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
          );
          const config = join(directory, "run.json");
          yield* Effect.promise(() =>
            writeFile(
              config,
              JSON.stringify({
                task,
                model: "protocol-control-no-model",
                harness: "observed-control",
                seed: 0,
                command: ["bun", new URL("fixtures/observed-adapter.ts", import.meta.url).pathname],
              }),
            ),
          );
          const process = yield* Effect.acquireRelease(
            Effect.sync(() =>
              Bun.spawn(["bun", "src/cli.ts", config], {
                cwd: new URL("../", import.meta.url).pathname,
                stdout: "pipe",
                stderr: "pipe",
                timeout: 10000,
              }),
            ),
            (child) =>
              Effect.promise(async () => {
                child.kill();
                await child.exited;
              }),
          );
          const output = yield* Effect.promise(() => new Response(process.stdout).text());
          const record = Schema.decodeUnknownSync(Schema.fromJsonString(Record))(output);
          expect(yield* Effect.promise(() => process.exited)).toBe(0);
          expect(record.passed).toBe(true);
          expect(record.legalQuality).toBe("not_evaluated");
          expect(record.trace.length).toBeLessThanOrEqual(20);
        }),
      ),
    );
  });
}
