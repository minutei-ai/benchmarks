import { Cause, Clock, Effect, Schema } from "effect";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  AgentConfig,
  Document,
  Submission,
  WorkInput,
  WorkRecord,
} from "@minutei/benchmark/contracts";
import { AdapterExit, runProcess } from "@minutei/benchmark/adapter";
import { caseDigest, evaluate } from "@minutei/benchmark/evaluate";
import { loadCase, manifest } from "./cases";

const run = Effect.fn("benchmark.run")(function* () {
  const configPath = process.argv[2];
  if (!configPath) return yield* Effect.fail("Usage: bun run run:agent config.json");
  const raw = yield* Effect.tryPromise(() => Bun.file(configPath).text());
  const config = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(AgentConfig))(raw);
  if (!config.command.length) return yield* Effect.fail("An agent adapter command is required");
  const data = yield* Effect.tryPromise(() => loadCase(config.caseId));
  const outputPath = resolve(config.output);
  const started = yield* Clock.currentTimeMillis;
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
      const documentsFile = join(directory, "documents.jsonl");
      yield* Effect.tryPromise(() =>
        Bun.write(
          documentsFile,
          data.documents
            .map((document) => Schema.encodeSync(Schema.fromJsonString(Document))(document))
            .join("\n") + "\n",
        ),
      );
      const payload = Schema.encodeSync(Schema.fromJsonString(WorkInput))({
        benchmark: manifest.name,
        model: config.model,
        harness: config.harness,
        caseId: data.id,
        request: data.request,
        questions: data.questions,
        deliverables: data.deliverables,
        documentsFile,
        instruction:
          "Read documents using your native tools. Return JSON {caseId,answers:[{id,value,citations:[{documentId,quote}]}],artifacts:[{id,body}]}. Do not include review: review belongs to an independent reviewer.",
      });
      const result = yield* runProcess(config, directory, payload, `${outputPath}.stderr.log`);
      if (result.code !== 0)
        return yield* Effect.fail(
          new AdapterExit({
            code: result.code,
            elapsedMs: result.elapsedMs,
            stderrPath: result.stderrPath,
          }),
        );
      const submission = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Submission))(
        result.output,
      );
      if (submission.review) return yield* Effect.fail("Agent cannot submit its own review");
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
          submission: null,
          report: null,
          failure: Cause.pretty(cause),
        };
      }),
    ),
  );
  yield* Effect.tryPromise(() =>
    Bun.write(outputPath, Schema.encodeSync(Schema.fromJsonString(WorkRecord))(record) + "\n"),
  );
  console.log(Schema.encodeSync(Schema.fromJsonString(WorkRecord))(record));
  if (record.status === "execution_failed" || !record.report?.passed) process.exitCode = 1;
});

await Effect.runPromise(Effect.scoped(run()));
