import { expect, test } from "bun:test";
import { Schema } from "effect";
import { WorkCase } from "../src/contracts";
import { caseDigest, evaluate, submissionDigest } from "../src/evaluate";

const data = Schema.decodeUnknownSync(WorkCase)({
  id: "control",
  title: "Controle do avaliador",
  request: "Prepare uma minuta interna.",
  documents: [{ id: "D1", title: "Instrução", text: "Somente a minuta interna está autorizada." }],
  questions: [{ id: "action", prompt: "O que está autorizado?" }],
  expected: [{ id: "action", value: "minuta", sources: ["D1"], rationale: "Mandato expresso." }],
  deliverables: [
    { id: "draft", title: "Minuta", minWords: 1 },
    { id: "note", title: "Nota", minWords: 1 },
  ],
  rubric: [
    { id: "R1", criterion: "A minuta respeita o mandato.", artifacts: ["draft"], sources: ["D1"] },
    {
      id: "R2",
      criterion: "A nota explica a aprovação pendente.",
      artifacts: ["note"],
      sources: ["D1"],
    },
  ],
});
const submission = {
  caseId: "control",
  answers: [
    {
      id: "action",
      value: "minuta",
      citations: [{ documentId: "D1", quote: "Somente a minuta interna está autorizada." }],
    },
  ],
  artifacts: [
    { id: "draft", body: "Trecho de controle da minuta interna." },
    { id: "note", body: "Trecho de controle da aprovação pendente." },
  ],
};
const review = {
  reviewer: "evaluator-control-not-a-lawyer",
  submissionDigest: submissionDigest(submission),
  caseDigest: caseDigest(data),
  criteria: [
    {
      id: "R1",
      score: 2 as const,
      reason: "Controle de escopo da minuta.",
      evidence: [{ artifactId: "draft", quote: "Trecho de controle da minuta" }],
    },
    {
      id: "R2",
      score: 2 as const,
      reason: "Controle de escopo da nota.",
      evidence: [{ artifactId: "note", quote: "Trecho de controle da aprovação" }],
    },
  ],
};

test("all-pass accepts a complete bound review", () => {
  expect(evaluate(data, { ...submission, review }).passed).toBe(true);
});

test("one partial criterion fails even when every other criterion passes", () => {
  const criteria = [review.criteria[0], { ...review.criteria[1], score: 1 as const }];
  expect(evaluate(data, { ...submission, review: { ...review, criteria } }).reviewPassed).toBe(
    false,
  );
});

test("a review for a different fixture cannot be reused", () => {
  const changed = { ...data, request: "A instrução agora exige revisão adicional." };
  expect(evaluate(changed, { ...submission, review }).reviewValid).toBe(false);
});

test("a rubric cannot borrow evidence from an unrelated deliverable", () => {
  const criteria = [
    { ...review.criteria[0], evidence: review.criteria[1].evidence },
    review.criteria[1],
  ];
  expect(evaluate(data, { ...submission, review: { ...review, criteria } }).reviewValid).toBe(
    false,
  );
});

test("an otherwise valid answer cannot add citations outside its required sources", () => {
  const withDecoy = {
    ...data,
    documents: [
      ...data.documents,
      {
        id: "D2",
        title: "Outro contrato",
        text: "Este documento não comprova a autorização da minuta.",
      },
    ],
  };
  const answers = [
    {
      ...submission.answers[0],
      citations: [
        ...submission.answers[0].citations,
        { documentId: "D2", quote: withDecoy.documents[1].text },
      ],
    },
  ];
  expect(evaluate(withDecoy, { ...submission, answers }).automaticPassed).toBe(false);
});

test("an empty rubric cannot turn unreviewed work into a passing task", () => {
  const invalid = { ...data, rubric: [] };
  const emptyReview = { ...review, caseDigest: caseDigest(invalid), criteria: [] };
  expect(evaluate(invalid, { ...submission, review: emptyReview }).passed).toBe(false);
});
