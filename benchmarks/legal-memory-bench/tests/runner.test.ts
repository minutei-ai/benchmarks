import { expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Record } from "../src/contracts";
import { loadCase, manifest } from "../src/cases";

for (const caseId of manifest.cases) {
  test(`${caseId}: real adapter processes preserve only their persisted state across sessions`, async () => {
    const data = await loadCase(caseId);
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const dir = yield* Effect.acquireRelease(
            Effect.promise(() => mkdtemp(join(tmpdir(), "memory-bench-test-"))),
            (path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
          );
          const adapter = join(dir, "probe.ts");
          yield* Effect.promise(() =>
            writeFile(
              adapter,
              `const task = await Bun.stdin.json();
if ("expected" in task || "sessions" in task) process.exit(8);
const state = Bun.file("counter.txt");
const previous = await state.exists().then(async (exists) => {
  if (exists) return Number(await state.text());
  return 0;
});
if (task.sessionId !== "S" + (previous + 1)) process.exit(9);
await Bun.write("counter.txt", String(previous + 1));
console.log(JSON.stringify({ sessionId: task.sessionId, answers: [] }));`,
            ),
          );
          const output = join(dir, "result.json");
          const config = join(dir, "config.json");
          yield* Effect.promise(() =>
            writeFile(
              config,
              JSON.stringify({
                caseId,
                model: "protocol-control-no-model",
                harness: "session-probe",
                command: ["bun", adapter],
                output,
              }),
            ),
          );
          const proc = yield* Effect.acquireRelease(
            Effect.sync(() =>
              Bun.spawn(["bun", "src/run.ts", config], {
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
          const code = yield* Effect.promise(() => proc.exited);
          const result = Schema.decodeUnknownSync(Schema.fromJsonString(Record))(
            yield* Effect.promise(() => Bun.file(output).text()),
          );
          expect(code).toBe(1);
          expect(result.submission.sessions.map((session) => session.sessionId)).toEqual(
            data.sessions.map((session) => session.id),
          );
          expect(result.report?.passed).toBe(false);
        }),
      ),
    );
  });
}
