import { loadCase, manifest } from "./cases";

const failures: string[] = [];
if (new Set(manifest.cases).size !== manifest.cases.length) failures.push("Duplicate case ID");
for (const id of manifest.cases) {
  const data = await loadCase(id);
  const documentIds = data.sessions.flatMap((session) =>
    session.documents.map((document) => document.id),
  );
  const checks = {
    identity: data.id === id,
    sessions:
      data.sessions.length >= 3 &&
      new Set(data.sessions.map((session) => session.id)).size === data.sessions.length,
    documents: new Set(documentIds).size === documentIds.length,
    chronology: data.sessions.every((session, index) => {
      const available = data.sessions
        .slice(0, index + 1)
        .flatMap((prior) => prior.documents.map((document) => document.id));
      const questions = session.questions.map((question) => question.id);
      const expected = session.expected.map((fact) => fact.id);
      return (
        new Set(questions).size === questions.length &&
        new Set(expected).size === expected.length &&
        questions.length === expected.length &&
        session.expected.every((fact) => {
          if (!questions.includes(fact.id)) return false;
          if (fact.value === null) return fact.sources.length === 0;
          return (
            fact.sources.length > 0 &&
            new Set(fact.sources).size === fact.sources.length &&
            fact.sources.every((source) => available.includes(source))
          );
        })
      );
    }),
  };
  if (!Object.values(checks).every(Boolean)) failures.push(id);
  console.log(
    JSON.stringify({ id, sessions: data.sessions.length, documents: documentIds.length, checks }),
  );
}
if (failures.length) process.exitCode = 1;
