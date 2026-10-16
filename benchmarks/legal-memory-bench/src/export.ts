import { Schema, Struct } from "effect";
import { DatasetMetadata } from "@minutei/benchmark/contracts";
import { Case, Session } from "./contracts";
import { caseDigest, loadCase, manifest } from "./cases";

const Item = Schema.Struct({
  client_item_id: Schema.String,
  input: Schema.Struct({
    caseId: Schema.String,
    ...Struct.pick(Case.fields, ["title", "capability"]),
    protocol: Schema.Literal("sequential_sessions"),
    sessions: Schema.Array(Schema.Struct(Struct.omit(Session.fields, ["expected"]))),
  }),
  expected_output: Schema.Struct({
    sessions: Schema.Array(Schema.Struct(Struct.pick(Session.fields, ["id", "expected"]))),
    scoring: Schema.Literal("all_sessions_all_facts"),
  }),
  metadata: DatasetMetadata,
});

for (const id of manifest.cases) {
  const data = await loadCase(id);
  const input = {
    caseId: id,
    title: data.title,
    capability: data.capability,
    protocol: "sequential_sessions" as const,
    sessions: data.sessions.map(({ id, matter, message, documents, questions }) => ({
      id,
      matter,
      message,
      documents,
      questions,
    })),
  };
  const expected_output = {
    sessions: data.sessions.map(({ id, expected }) => ({ id, expected })),
    scoring: "all_sessions_all_facts" as const,
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
