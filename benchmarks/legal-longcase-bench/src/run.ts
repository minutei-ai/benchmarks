import { Effect, Schema } from "effect";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentConfig, Submission } from "./contracts";
import { loadCase, manifest } from "./cases";
import { evaluate } from "./evaluate";

const run = Effect.fn("benchmark.run")(function* () {
  const configPath = process.argv[2];
  if (!configPath) return yield* Effect.fail("Usage: bun run run:agent config.json");
  const raw = yield* Effect.tryPromise(() => Bun.file(configPath).text());
  const config = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(AgentConfig))(raw);
  if (!config.command.length) return yield* Effect.fail("An agent adapter command is required");
  const data = yield* Effect.tryPromise(() => loadCase(config.caseId));
  const directory = yield* Effect.acquireRelease(
    Effect.tryPromise(() => mkdtemp(join(tmpdir(), `${manifest.name}-`))),
    (path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
  );
  const started = performance.now();
  yield* Effect.tryPromise(() => Bun.write(join(directory, "documents.jsonl"), data.documents.map((doc) => JSON.stringify(doc)).join("\n") + "\n"));
  const payload = { benchmark: manifest.name, model: config.model, harness: config.harness, caseId: data.id, request: data.request, questions: data.questions, deliverables: data.deliverables, documentsFile: join(directory, "documents.jsonl"), instruction: "Read documents using your native tools. Return JSON {caseId,answers:[{id,value,citations:[{documentId,quote}]}],artifacts:[{id,body}]}. Do not include review: review belongs to an independent reviewer." };
  const submission = yield* Effect.scoped(Effect.gen(function* () {
    const child = yield* Effect.acquireRelease(
      Effect.sync(() => Bun.spawn([...config.command], { cwd: directory, stdin: new Blob([JSON.stringify(payload)]), stdout: "pipe", stderr: "inherit", timeout: config.timeoutMs ?? 300000, killSignal: "SIGKILL" })),
      (proc) => Effect.promise(async () => { proc.kill("SIGKILL"); await proc.exited; }),
    );
    const output = yield* Effect.tryPromise(() => new Response(child.stdout).text());
    const code = yield* Effect.promise(() => child.exited);
    if (code !== 0) {
        console.error(output);
        return yield* Effect.fail(`Adapter exited with status ${code}`);
      }
    const result = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Submission))(output);
    if (result.review) return yield* Effect.fail("Agent cannot submit its own review");
    return result;
  }));
  const report = evaluate(data, submission);
  const record = { benchmark: manifest.name, version: manifest.version, config, elapsedMs: performance.now() - started, submission, report };
  yield* Effect.tryPromise(() => Bun.write(config.output, JSON.stringify(record, null, 2) + "\n"));
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
});

await Effect.runPromise(Effect.scoped(run()));
