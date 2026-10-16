import { Schema, Struct } from "effect";
import { DatasetMetadata, Expected, Rubric, WorkCase } from "@minutei/benchmark/contracts";
import { caseDigest } from "@minutei/benchmark/evaluate";
import { loadCase, manifest } from "./cases";

const Item = Schema.Struct({
  client_item_id: Schema.String,
  input: Schema.Struct({
    caseId: Schema.String,
    ...Struct.pick(WorkCase.fields, ["title", "request", "questions", "deliverables", "documents"]),
  }),
  expected_output: Schema.Struct({
    facts: Schema.Array(Expected),
    rubric: Schema.Array(Rubric),
    scoring: Schema.Literal("automatic_facts_and_recorded_review_all_pass"),
  }),
  metadata: DatasetMetadata,
});

for (const id of manifest.cases) {
  const data = await loadCase(id);
  const input = {
    caseId: id,
    title: data.title,
    request: data.request,
    questions: data.questions,
    deliverables: data.deliverables,
    documents: data.documents,
  };
  const expected_output = {
    facts: data.expected,
    rubric: data.rubric,
    scoring: "automatic_facts_and_recorded_review_all_pass" as const,
  };
  console.log(
    Schema.encodeSync(Schema.fromJsonString(Item))({
      client_item_id: `${manifest.name}-${manifest.version}-${id}`,
      input,
      expected_output,
      metadata: {
        benchmark: manifest.name,
        version: manifest.version,
        case_id: id,
        synthetic: true,
        legal_review: "pending",
        fixture_sha256: caseDigest(data),
        repository: "https://github.com/minutei-ai/benchmarks",
        source: `benchmarks/${manifest.name}/cases/${id}.json`,
        execution: "external_agent_adapter",
        results: "not_run",
      },
    }),
  );
}
