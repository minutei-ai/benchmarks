import { Clock, Effect, Schema } from "effect";
import { AgentConfig } from "./contracts";

export class AdapterExit extends Schema.TaggedError<AdapterExit>()("AdapterExit", {
  code: Schema.Int,
  elapsedMs: Schema.Number,
  stderrPath: Schema.String,
}) {}

export class AdapterOutputLimit extends Schema.TaggedError<AdapterOutputLimit>()(
  "AdapterOutputLimit",
  {
    limitBytes: Schema.Int,
  },
) {}

export const runProcess = Effect.fn("benchmark.process")(function* (
  config: typeof AgentConfig.Type,
  directory: string,
  payload: string,
  stderrPath: string,
  outputLimitBytes = 2097152,
) {
  const started = yield* Clock.currentTimeMillis;
  const child = yield* Effect.acquireRelease(
    Effect.try(() =>
      Bun.spawn([...config.command], {
        cwd: directory,
        stdin: new Blob([payload]),
        stdout: "pipe",
        stderr: "pipe",
        timeout: config.timeoutMs ?? 300000,
        killSignal: "SIGKILL",
      }),
    ),
    (process) =>
      Effect.promise(async () => {
        process.kill("SIGKILL");
        await process.exited;
      }),
  );
  const chunks: Uint8Array[] = [];
  const state = { bytes: 0 };
  const output = yield* Effect.all(
    [
      Effect.tryPromise(async () => {
        for await (const chunk of child.stdout) {
          state.bytes += chunk.byteLength;
          if (state.bytes > outputLimitBytes) return false;
          chunks.push(chunk);
        }
        return true;
      }).pipe(
        Effect.flatMap((withinLimit) => {
          if (!withinLimit)
            return Effect.fail(new AdapterOutputLimit({ limitBytes: outputLimitBytes }));
          return Effect.succeed(new TextDecoder().decode(Buffer.concat(chunks)));
        }),
      ),
      Effect.tryPromise(() => Bun.write(stderrPath, child.stderr)),
    ],
    { concurrency: "unbounded" },
  );
  const code = yield* Effect.promise(() => child.exited);
  const elapsedMs = (yield* Clock.currentTimeMillis) - started;
  return { output: output[0], code, elapsedMs, stderrPath };
});
