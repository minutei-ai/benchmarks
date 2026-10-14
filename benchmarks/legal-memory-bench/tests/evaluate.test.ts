import { expect, test } from "bun:test";
import { loadCase, manifest } from "../src/cases";
import { evaluate } from "../src/evaluate";

for (const id of manifest.cases) {
  test(`${id}: validates chronological facts and source provenance`, async () => {
    const data = await loadCase(id);
    const docs = data.sessions.flatMap((session) => session.documents);
    const submission = { caseId: id, sessions: data.sessions.map((session) => ({ sessionId: session.id, answers: session.expected.map((fact) => ({ id: fact.id, value: fact.value, citations: docs.filter((doc) => fact.sources.includes(doc.id)).map((doc) => ({ documentId: doc.id, quote: doc.text })) })) })) };
    expect(evaluate(data, submission).passed).toBe(true);
    expect(evaluate(data, { ...submission, sessions: [...submission.sessions].reverse() }).passed).toBe(false);
    const stale = { ...submission, sessions: submission.sessions.map((session) => ({ ...session, answers: session.answers.map((answer) => ({ ...answer, value: "stale" })) })) };
    expect(evaluate(data, stale).passed).toBe(false);
  });
}

test("forgotten information cannot be quoted beside an abstention", async () => {
  const data = await loadCase("M03");
  const response = { caseId: data.id, sessions: data.sessions.map((session) => ({ sessionId: session.id, answers: session.expected.map((fact) => ({ id: fact.id, value: fact.value, citations: [{ documentId: "S1-D1", quote: data.sessions[0].documents[0].text }] })) })) };
  const result = evaluate(data, response);
  expect(result.passed).toBe(false);
  expect(result.sessions[2].checks[0].passed).toBe(false);
});

test("correct value with evidence from another matter is rejected", async () => {
  const data = await loadCase("M02");
  const response = { caseId: data.id, sessions: data.sessions.map((session) => ({ sessionId: session.id, answers: session.expected.map((fact) => ({ id: fact.id, value: fact.value, citations: [{ documentId: "S2-D1", quote: data.sessions[1].documents[0].text }] })) })) };
  expect(evaluate(data, response).passed).toBe(false);
});

test("a source from a future session cannot support an earlier answer", async () => {
  const data = await loadCase("M01");
  const expected = { id: "early", value: "4800000", sources: ["S2-D1"], rationale: "Evaluator boundary test" };
  const altered = { ...data, sessions: [{ ...data.sessions[0], expected: [expected] }, ...data.sessions.slice(1)] };
  const response = { caseId: data.id, sessions: [{ sessionId: "S1", answers: [{ id: "early", value: "4800000", citations: [{ documentId: "S2-D1", quote: data.sessions[1].documents[0].text }] }] }] };
  expect(evaluate(altered, response).sessions[0].checks[0].passed).toBe(false);
});

test("missing sessions and invented evidence fail", async () => {
  const data = await loadCase("M01");
  expect(evaluate(data, { caseId: data.id, sessions: [] }).passed).toBe(false);
  const response = { caseId: data.id, sessions: data.sessions.map((session) => ({ sessionId: session.id, answers: session.expected.map((fact) => ({ id: fact.id, value: fact.value, citations: [{ documentId: "S2-D1", quote: "Texto inventado que não está no documento." }] })) })) };
  expect(evaluate(data, response).passed).toBe(false);
});
