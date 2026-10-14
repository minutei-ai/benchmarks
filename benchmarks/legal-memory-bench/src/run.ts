import { Cause, Clock, Effect, Schema } from "effect";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AgentConfig } from "@minutei/benchmark/contracts";
import { AdapterExit, runProcess } from "@minutei/benchmark/adapter";
import { caseDigest, loadCase, manifest } from "./cases";
import { evaluate } from "./evaluate";
import { Record, SessionInput, SessionResponse } from "./contracts";

const run = Effect.fn("benchmark.run")(function* () {
  const configPath = process.argv[2];
  if (!configPath) return yield* Effect.fail("Usage: bun run run:agent config.json");
  const raw = yield* Effect.tryPromise(() => Bun.file(configPath).text());
  const config = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(AgentConfig))(raw);
  if (!config.command.length) return yield* Effect.fail("An agent adapter command is required");
  const data = yield* Effect.tryPromise(() => loadCase(config.caseId));
  const outputPath = resolve(config.output);
  const started = yield* Clock.currentTimeMillis;
  const sessions: Array<typeof SessionResponse.Type> = [];
  const metadata = {
    benchmark: manifest.name,
    version: manifest.version,
    config,
    fixtureDigest: caseDigest(data),
  };
  const record = yield* Effect.scoped(
    Effect.gen(function* () {
      const directory = yield* Effect.acquireRelease(
        Effect.tryPromise(() => mkdtemp(join(tmpdir(), `${manifest.name}-`))),
        (path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
      );
      for (const session of data.sessions) {
        const payload = Schema.encodeSync(Schema.fromJsonString(SessionInput))({
          benchmark: manifest.name,
          model: config.model,
          harness: config.harness,
          caseId: data.id,
          sessionId: session.id,
          matter: session.matter,
          message: session.message,
          questions: session.questions,
          documents: session.documents,
          memoryDirectory: directory,
          instruction:
            "Use only this session and your persisted memory. Store memory inside memoryDirectory. Return JSON {sessionId, answers:[{id,value,citations:[{documentId,quote}]}]}. Sessions without questions return answers: [].",
        });
        const response = yield* Effect.scoped(
          Effect.gen(function* () {
            const result = yield* runProcess(
              config,
              directory,
              payload,
              `${outputPath}.${session.id}.stderr.log`,
            );
            if (result.code !== 0)
              return yield* Effect.fail(
                new AdapterExit({
                  code: result.code,
                  elapsedMs: result.elapsedMs,
                  stderrPath: result.stderrPath,
                }),
              );
            return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(SessionResponse))(
              result.output,
            );
          }),
        );
        if (response.sessionId !== session.id) return yield* Effect.fail("Wrong session response");
        sessions.push(response);
      }
      const submission = { caseId: data.id, sessions };
      const report = evaluate(data, submission);
      return {
        ...metadata,
        status: "completed" as const,
        elapsedMs: (yield* Clock.currentTimeMillis) - started,
        submission,
        report,
        failure: null,
      };
    }),
  ).pipe(
    Effect.catchCause((cause) =>
      Effect.gen(function* () {
        return {
          ...metadata,
          status: "execution_failed" as const,
          elapsedMs: (yield* Clock.currentTimeMillis) - started,
          submission: { caseId: data.id, sessions },
          report: null,
          failure: Cause.pretty(cause),
        };
      }),
    ),
  );
  yield* Effect.tryPromise(() =>
    Bun.write(outputPath, Schema.encodeSync(Schema.fromJsonString(Record))(record) + "\n"),
  );
  console.log(Schema.encodeSync(Schema.fromJsonString(Record))(record));
  if (record.status === "execution_failed" || !record.report?.passed) process.exitCode = 1;
});

await Effect.runPromise(Effect.scoped(run()));
