import { loadCase, manifest } from "./cases";

let failed = false;
for (const id of manifest.cases) {
  const data = await loadCase(id);
  const documents = data.sessions.flatMap((session) => session.documents);
  const expected = data.sessions.flatMap((session) => session.expected);
  const questions = data.sessions.flatMap((session) => session.questions);
  const sequential = data.sessions.every((session, index) => session.expected.every((fact) => fact.sources.every((source) => data.sessions.slice(0, index + 1).some((prior) => prior.documents.some((doc) => doc.id === source)))));
  if (!sequential || data.sessions.length < 3 || new Set(data.sessions.map((s) => s.id)).size !== data.sessions.length) failed = true;
  const docIds = documents.map((doc) => doc.id);
  if (data.id !== id || new Set(docIds).size !== docIds.length || questions.length !== expected.length || new Set(questions.map((q) => q.id)).size !== questions.length || new Set(expected.map((e) => e.id)).size !== expected.length) failed = true;
  for (const fact of expected) {
    if (!questions.some((question) => question.id === fact.id)) failed = true;
    if (!fact.sources.every((source) => docIds.includes(source))) failed = true;
    if (fact.value === null && fact.sources.length !== 0) failed = true;
    if (fact.value !== null && fact.sources.length === 0) failed = true;
  }
  console.log(JSON.stringify({ id, documents: documents.length, questions: questions.length }));
}
if (failed) process.exitCode = 1;
