import { validateCase } from "@minutei/benchmark/evaluate";
import { loadCase, manifest } from "./cases";

const failures: string[] = [];
if (new Set(manifest.cases).size !== manifest.cases.length) failures.push("Duplicate case ID");
for (const id of manifest.cases) {
  const data = await loadCase(id);
  const checks = validateCase(data);
  if (data.id !== id || !Object.values(checks).every(Boolean)) failures.push(id);
  console.log(
    JSON.stringify({
      id,
      documents: data.documents.length,
      questions: data.questions.length,
      checks,
    }),
  );
}
if (failures.length) process.exitCode = 1;
