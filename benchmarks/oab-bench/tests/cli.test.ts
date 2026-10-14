import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("CLI rejects a completion with no saved work through a real subprocess", async () => {
  await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const directory = yield* Effect.acquireRelease(
      Effect.promise(() => mkdtemp(join(tmpdir(), "oab-bench-"))),
      (path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
    );
    const config = join(directory, "run.json");
    yield* Effect.promise(() => writeFile(config, JSON.stringify({ task: "evidence", model: "protocol-test-no-model", harness: "empty-completion", seed: 0, command: ["bun", "-e", 'console.log(JSON.stringify({type:"finish",message:"Done"}))'] })));
    const proc = yield* Effect.acquireRelease(
      Effect.sync(() => Bun.spawn(["bun", "src/cli.ts", config], { stdout: "pipe", stderr: "pipe", timeout: 10000 })),
      (child) => Effect.promise(async () => { child.kill(); await child.exited; }),
    );
    const output = yield* Effect.promise(() => new Response(proc.stdout).json());
    const exitCode = yield* Effect.promise(() => proc.exited);
    expect(exitCode).toBe(1);
    expect(output.passed).toBe(false);
    expect(output.checks.singleDraft).toBe(false);
    expect(output.trace).toHaveLength(1);
  })));
});
