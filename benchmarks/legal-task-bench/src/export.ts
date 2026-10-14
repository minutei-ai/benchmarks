import { loadCase, manifest } from "./cases";

for (const id of manifest.cases) {
  const data = await loadCase(id);
  const fixtureDigest = new Bun.CryptoHasher("sha256").update(JSON.stringify(data)).digest("hex");
  const input = { caseId: id, title: data.title, request: data.request, questions: data.questions, deliverables: data.deliverables, documents: data.documents };
  const expected_output = { facts: data.expected, rubric: data.rubric, scoring: "automatic_facts_and_recorded_review" };
  console.log(JSON.stringify({ client_item_id: `${manifest.name}-${manifest.version}-${id}`, input, expected_output, metadata: { benchmark: manifest.name, version: manifest.version, case_id: id, synthetic: true, legal_review: "pending", fixture_sha256: fixtureDigest, repository: `https://github.com/minutei-ai/${manifest.name}`, source: `cases/${id}.json`, execution: "external_agent_adapter", results: "not_run" } }));
}
