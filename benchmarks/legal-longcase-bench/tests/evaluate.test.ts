import { expect, test } from "bun:test";
import { loadCase, manifest } from "../src/cases";
import { evaluate, submissionDigest } from "../src/evaluate";
import { Schema } from "effect";
import { Submission } from "../src/contracts";

for (const id of manifest.cases) {
  test(`${id}: factual oracle is insufficient without independent review`, async () => {
    const data = await loadCase(id);
    const submission = {
      caseId: id,
      answers: data.expected.map((fact) => ({ id: fact.id, value: fact.value, citations: data.documents.filter((doc) => fact.sources.includes(doc.id)).map((doc) => ({ documentId: doc.id, quote: doc.text })) })),
      artifacts: data.deliverables.map((item) => ({ id: item.id, body: "Conteúdo artificial para exercitar exclusivamente o avaliador. ".repeat(item.minWords) })),
    };
    const report = evaluate(data, submission);
    expect(report.automaticPassed).toBe(true);
    expect(report.passed).toBe(false);
    expect(report.status).toBe("awaiting_review");
    const wrong = { ...submission, answers: submission.answers.map((answer, index) => {
      if (index === 0) return { ...answer, value: "incorrect" };
      return answer;
    }) };
    expect(evaluate(data, wrong).automaticPassed).toBe(false);
  });
}

test("duplicate answer IDs cannot hide a missing fact", async () => {
  const data = await loadCase(manifest.cases[0]);
  const answer = { id: data.expected[0].id, value: data.expected[0].value, citations: [] };
  expect(evaluate(data, { caseId: data.id, answers: data.expected.map(() => answer), artifacts: [] }).passed).toBe(false);
});

test("invented citations cannot support correct structured values", async () => {
  const data = await loadCase(manifest.cases[0]);
  const answers = data.expected.map((fact) => ({ id: fact.id, value: fact.value, citations: fact.sources.map((source) => ({ documentId: source, quote: "Este trecho não consta no documento original." })) }));
  expect(evaluate(data, { caseId: data.id, answers, artifacts: [] }).factChecks.some((check) => !check.passed)).toBe(true);
});

test("review evidence and digest must match the submitted work", async () => {
  const data = await loadCase(manifest.cases[0]);
  const artifacts = data.deliverables.map((item) => ({ id: item.id, body: "Texto de controle do avaliador, sem qualidade jurídica demonstrada. ".repeat(item.minWords) }));
  const base = { caseId: data.id, answers: [], artifacts };
  const review = { reviewer: "test-fixture-not-legal-review", submissionDigest: submissionDigest(base), criteria: data.rubric.map((criterion) => ({ id: criterion.id, score: 2 as const, reason: "Controle do registro de revisão.", evidence: [{ artifactId: artifacts[0].id, quote: "Texto de controle do avaliador" }] })) };
  expect(evaluate(data, { ...base, review }).reviewValid).toBe(true);
  expect(evaluate(data, { ...base, artifacts: [{ ...artifacts[0], body: "Changed" }, ...artifacts.slice(1)], review }).reviewValid).toBe(false);
  expect(evaluate(data, { ...base, review: { ...review, criteria: review.criteria.map((item) => ({ ...item, evidence: [{ artifactId: "missing", quote: "Citação inexistente" }] })) } }).reviewValid).toBe(false);
});

test("failing a critical criterion prevents review approval", async () => {
  const data = await loadCase(manifest.cases[0]);
  const base = { caseId: data.id, answers: [], artifacts: data.deliverables.map((item) => ({ id: item.id, body: "Material de controle da revisão. ".repeat(item.minWords) })) };
  const review = { reviewer: "test-fixture", submissionDigest: submissionDigest(base), criteria: data.rubric.map((criterion) => ({ id: criterion.id, score: 1 as const, reason: "Critério apenas parcialmente atendido.", evidence: [{ artifactId: base.artifacts[0].id, quote: "Material de controle da revisão." }] })) };
  expect(evaluate(data, { ...base, review }).reviewValid).toBe(true);
  expect(evaluate(data, { ...base, review }).reviewPassed).toBe(false);
});

test("schema rejects malformed submissions", () => {
  expect(Schema.is(Submission)({ caseId: "x", answers: [{ id: "a", value: 50 }], artifacts: [] })).toBe(false);
});


test("complete factual submission plus bound review can pass", async () => {
  const data = await loadCase(manifest.cases[0]);
  const submission = {
    caseId: data.id,
    answers: data.expected.map((fact) => ({ id: fact.id, value: fact.value, citations: data.documents.filter((doc) => fact.sources.includes(doc.id)).map((doc) => ({ documentId: doc.id, quote: doc.text })) })),
    artifacts: data.deliverables.map((item) => ({ id: item.id, body: "Texto de controle exclusivo do avaliador. ".repeat(item.minWords) })),
  };
  const review = { reviewer: "test-fixture-not-expert", submissionDigest: submissionDigest(submission), criteria: data.rubric.map((criterion) => ({ id: criterion.id, score: 2 as const, reason: "Teste do registro; não é revisão jurídica.", evidence: [{ artifactId: submission.artifacts[0].id, quote: "Texto de controle exclusivo do avaliador." }] })) };
  expect(evaluate(data, { ...submission, review }).passed).toBe(true);
  expect(evaluate(data, { ...submission, review }).status).toBe("passed_with_recorded_review");
});
