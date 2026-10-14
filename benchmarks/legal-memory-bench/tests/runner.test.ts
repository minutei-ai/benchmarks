import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("real adapter processes preserve only their persisted state across three sessions", async () => {
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const dir = yield* Effect.acquireRelease(Effect.promise(() => mkdtemp(join(tmpdir(), "memory-bench-test-"))), (path) => Effect.promise(() => rm(path, { recursive: true, force: true })));
    const adapter = join(dir, "probe.ts");
    yield* Effect.promise(() => writeFile(adapter, `const task = await Bun.stdin.json();
if ("expected" in task || "sessions" in task) process.exit(8);
const state = Bun.file("counter.txt");
let previous = 0;
if (await state.exists()) previous = Number(await state.text());
if (task.sessionId !== "S" + (previous + 1)) process.exit(9);
await Bun.write("counter.txt", String(previous + 1));
console.log(JSON.stringify({ sessionId: task.sessionId, answers: [] }));`));
    const output = join(dir, "result.json");
    const config = join(dir, "config.json");
    yield* Effect.promise(() => writeFile(config, JSON.stringify({ caseId: "M01", model: "protocol-control-no-model", harness: "session-probe", command: ["bun", adapter], output })));
    const proc = yield* Effect.acquireRelease(Effect.sync(() => Bun.spawn(["bun", "src/run.ts", config], { stdout: "pipe", stderr: "pipe", timeout: 10000 })), (child) => Effect.promise(async () => { child.kill(); await child.exited; }));
    const code = yield* Effect.promise(() => proc.exited);
    const result = yield* Effect.promise(() => Bun.file(output).json());
    expect(code).toBe(1);
    expect(result.submission.sessions.map((session: { sessionId: string }) => session.sessionId)).toEqual(["S1", "S2", "S3"]);
    expect(result.report.passed).toBe(false);
  })));
});
