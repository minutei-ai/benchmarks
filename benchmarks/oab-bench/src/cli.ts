import { Effect, Schema } from "effect";
import { Call, RunConfig } from "./contracts";
import { createEnvironment } from "./environment";

const program = Effect.fn("bench.run")(function* () {
  const configPath = process.argv[2];
  if (!configPath) return yield* Effect.fail("Usage: bun run bench path/to/run.json");
  const raw = yield* Effect.tryPromise(() => Bun.file(configPath).text());
  const config = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(RunConfig))(raw);
  if (!config.command.length || !config.model.trim() || !config.harness.trim()) return yield* Effect.fail("command, model and harness must be nonempty");
  const environment = createEnvironment(config.task);
  const start = performance.now();
  const proc = yield* Effect.acquireRelease(
    Effect.sync(() => Bun.spawn([...config.command], { stdin: "pipe", stdout: "pipe", stderr: "inherit", timeout: 60000, killSignal: "SIGKILL" })),
    (child) => Effect.promise(async () => { child.kill("SIGKILL"); await child.exited; }),
  );
  const reader = yield* Effect.acquireRelease(
    Effect.sync(() => proc.stdout.getReader()),
    (stream) => Effect.promise(async () => { await stream.cancel(); stream.releaseLock(); }),
  );
  yield* Effect.tryPromise(async () => {
    proc.stdin.write(JSON.stringify({ type: "task", ...environment.task, model: config.model, seed: config.seed }) + "\n");
    await proc.stdin.flush();
  });
  let buffer = "";
  let done = false;
  const trace: Array<{ call: typeof Call.Type; result: ReturnType<typeof environment.call> }> = [];
  const decoder = new TextDecoder();
  let failure: string | null = null;
  yield* Effect.gen(function* () {
    while (!done && trace.length < 20) {
      const chunk = yield* Effect.tryPromise(() => reader.read());
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      if (buffer.length > 131072) return yield* Effect.fail("Protocol buffer exceeds 128 KiB");
      let boundary = buffer.indexOf("\n");
      while (boundary >= 0 && !done && trace.length < 20) {
        const line = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 1);
        const call = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Call))(line);
        const result = environment.call(call);
        trace.push({ call, result });
        if (call.type === "finish") done = true;
        if (!done) {
          yield* Effect.tryPromise(async () => {
            proc.stdin.write(JSON.stringify({ type: "result", result }) + "\n");
            await proc.stdin.flush();
          });
        }
        boundary = buffer.indexOf("\n");
      }
    }
  }).pipe(Effect.catch((error) => Effect.sync(() => { failure = String(error); })));
  if (!done && failure === null) failure = "Harness exited, timed out, or exhausted its message budget before finishing";
  const evaluation = environment.evaluate();
  const passed = evaluation.passed && failure === null;
  console.log(JSON.stringify({ version: "0.1.0", config, elapsedMs: performance.now() - start, ...evaluation, passed, failure, trace }, null, 2));
  if (!passed) process.exitCode = 1;
});

await Effect.runPromise(Effect.scoped(program()));
