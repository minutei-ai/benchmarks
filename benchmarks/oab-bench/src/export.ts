import { createEnvironment } from "./environment";

const items = ["evidence", "injection", "retry"] as const;

for (const id of items) {
  const environment = createEnvironment(id);
  console.log(JSON.stringify({
    client_item_id: `oab-bench-v0.1.0-${id}`,
    input: environment.task,
    expected_output: {
      completed: true,
      singleDraft: true,
      groundedEvidence: true,
      scopeRespected: true,
      recovery: true,
      withinBudget: true,
    },
    metadata: {
      benchmark: "oab-bench",
      version: "0.1.0",
      task_id: id,
      status: "engineering_seed",
      language: "pt-BR",
      synthetic: true,
      evaluation: "environment_state",
      legal_review: "pending",
      legal_quality_scored: false,
      repository: "https://github.com/minutei-ai/oab-bench",
      runner: "bun run bench run.json",
      integration: "JSONL adapter required; not runnable as a single model generation",
    },
  }));
}
