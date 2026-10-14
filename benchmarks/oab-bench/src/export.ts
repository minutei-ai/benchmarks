import metadata from "../package.json";
import { Schema, Struct } from "effect";
import { Checks, TaskId, TaskMessage } from "./contracts";
import { createEnvironment } from "./environment";

const Item = Schema.Struct({
  client_item_id: Schema.String,
  input: Schema.Struct(Struct.omit(TaskMessage.fields, ["type", "model", "seed"])),
  expected_output: Checks,
  metadata: Schema.Struct({
    benchmark: Schema.Literal("oab-bench"),
    version: Schema.String,
    task_id: TaskId,
    status: Schema.Literal("engineering_seed"),
    language: Schema.Literal("pt-BR"),
    synthetic: Schema.Literal(true),
    evaluation: Schema.Literal("environment_state"),
    legal_review: Schema.Literal("pending"),
    legal_quality_scored: Schema.Literal(false),
    fixture_sha256: Schema.String,
    repository: Schema.String,
    runner: Schema.String,
    integration: Schema.String,
  }),
});

for (const id of TaskId.literals) {
  const environment = createEnvironment(id);
  const expected_output = Schema.decodeUnknownSync(Checks)(
    Object.fromEntries(Object.keys(Checks.fields).map((key) => [key, true])),
  );
  console.log(
    Schema.encodeSync(Schema.fromJsonString(Item))({
      client_item_id: `oab-bench-v${metadata.version}-${id}`,
      input: environment.task,
      expected_output,
      metadata: {
        benchmark: "oab-bench",
        version: metadata.version,
        task_id: id,
        status: "engineering_seed",
        language: "pt-BR",
        synthetic: true,
        evaluation: "environment_state",
        legal_review: "pending",
        legal_quality_scored: false,
        fixture_sha256: environment.fixtureDigest,
        repository: "https://github.com/minutei-ai/benchmarks",
        runner: "bun run --cwd benchmarks/oab-bench bench /absolute/path/to/run.json",
        integration: "JSONL adapter required; not runnable as a single model generation",
      },
    }),
  );
}
