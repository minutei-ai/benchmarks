import metadata from "../package.json";
import { Cause, Clock, Effect, Schema } from "effect";
import { Call, Record, RunConfig, ResultMessage, TaskMessage, TraceEntry } from "./contracts";
import { createEnvironment } from "./environment";

const program = Effect.fn("bench.run")(function* () {
  const configPath = process.argv[2];
  if (!configPath) return yield* Effect.fail("Usage: bun run bench path/to/run.json");
  const raw = yield* Effect.tryPromise(() => Bun.file(configPath).text());
  const config = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(RunConfig))(raw);
  if (!config.command.length || !config.model.trim() || !config.harness.trim())
    return yield* Effect.fail("command, model and harness must be nonempty");
  const environment = createEnvironment(config.task);
  const start = yield* Clock.currentTimeMillis;
  const trace: Array<typeof TraceEntry.Type> = [];
  const failures: string[] = [];
  const state = { buffer: "", done: false };
  yield* Effect.scoped(
    Effect.gen(function* () {
      const process = yield* Effect.acquireRelease(
        Effect.try(() =>
          Bun.spawn([...config.command], {
            stdin: "pipe",
            stdout: "pipe",
            stderr: "inherit",
            timeout: environment.task.budget.timeoutMs,
            killSignal: "SIGKILL",
          }),
        ),
        (child) =>
          Effect.promise(async () => {
            child.kill("SIGKILL");
            await child.exited;
          }),
      );
      const reader = yield* Effect.acquireRelease(
        Effect.sync(() => process.stdout.getReader()),
        (stream) =>
          Effect.promise(async () => {
            await stream.cancel();
            stream.releaseLock();
          }),
      );
      yield* Effect.tryPromise(async () => {
        process.stdin.write(
          Schema.encodeSync(Schema.fromJsonString(TaskMessage))({
            type: "task",
            ...environment.task,
            model: config.model,
            seed: config.seed,
          }) + "\n",
        );
        await process.stdin.flush();
      });
      const decoder = new TextDecoder();
      while (!state.done && trace.length < environment.task.budget.toolCalls) {
        const chunk = yield* Effect.tryPromise(() => reader.read());
        if (chunk.done) break;
        state.buffer += decoder.decode(chunk.value, { stream: true });
        if (Buffer.byteLength(state.buffer) > environment.task.budget.protocolBytes)
          return yield* Effect.fail("Protocol buffer exceeds 128 KiB");
        while (
          state.buffer.includes("\n") &&
          !state.done &&
          trace.length < environment.task.budget.toolCalls
        ) {
          const boundary = state.buffer.indexOf("\n");
          const line = state.buffer.slice(0, boundary);
          state.buffer = state.buffer.slice(boundary + 1);
          const call = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Call))(line);
          const result = environment.call(call);
          trace.push({ call, result });
          if (call.type === "finish") state.done = true;
          if (!state.done) {
            yield* Effect.tryPromise(async () => {
              process.stdin.write(
                Schema.encodeSync(Schema.fromJsonString(ResultMessage))({
                  type: "result",
                  result,
                }) + "\n",
              );
              await process.stdin.flush();
            });
          }
        }
      }
    }),
  ).pipe(
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        failures.push(Cause.pretty(cause));
      }),
    ),
  );
  if (!state.done && !failures.length)
    failures.push("Harness exited, timed out, or exhausted its operation budget before finishing");
  const evaluation = environment.evaluate();
  const record = {
    fixtureDigest: environment.fixtureDigest,
    version: metadata.version,
    config,
    elapsedMs: (yield* Clock.currentTimeMillis) - start,
    ...evaluation,
    passed: evaluation.passed && !failures.length,
    failure: failures.at(0) ?? null,
    trace,
  };
  console.log(Schema.encodeSync(Schema.fromJsonString(Record))(record));
  if (!record.passed) process.exitCode = 1;
});

await Effect.runPromise(Effect.scoped(program()));
