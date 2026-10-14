import { Schema } from "effect";
import { SubmissionBody, Submission, WorkCase } from "./contracts";

export function submissionDigest(submission: typeof SubmissionBody.Type) {
  return new Bun.CryptoHasher("sha256")
    .update(Schema.encodeSync(Schema.fromJsonString(SubmissionBody))(submission))
    .digest("hex");
}

export function caseDigest(data: typeof WorkCase.Type) {
  return new Bun.CryptoHasher("sha256")
    .update(Schema.encodeSync(Schema.fromJsonString(WorkCase))(data))
    .digest("hex");
}

export function evaluate(data: typeof WorkCase.Type, submission: typeof Submission.Type) {
  const documents = new Map(data.documents.map((document) => [document.id, document]));
  const factChecks = data.expected.map((expected) => {
    const answer = submission.answers.find((item) => item.id === expected.id);
    if (!answer || answer.value !== expected.value) return { id: expected.id, passed: false };
    if (expected.value === null) return { id: expected.id, passed: answer.citations.length === 0 };
    const sourcesPresent = expected.sources.every((id) =>
      answer.citations.some((citation) => citation.documentId === id),
    );
    const grounded =
      answer.citations.length > 0 &&
      answer.citations.every((citation) => {
        const document = documents.get(citation.documentId);
        if (!document) return false;
        return (
          expected.sources.includes(document.id) &&
          citation.quote.trim().length >= 12 &&
          document.text.includes(citation.quote)
        );
      });
    return { id: expected.id, passed: sourcesPresent && grounded };
  });
  const artifactChecks = data.deliverables.map((required) => {
    const artifact = submission.artifacts.find((item) => item.id === required.id);
    if (!artifact) return { id: required.id, passed: false };
    return {
      id: required.id,
      passed: artifact.body.trim().split(/\s+/u).length >= required.minWords,
    };
  });
  const answerIds = submission.answers.map((answer) => answer.id);
  const artifactIds = submission.artifacts.map((artifact) => artifact.id);
  const contractValid =
    submission.caseId === data.id &&
    new Set(answerIds).size === answerIds.length &&
    answerIds.length === data.expected.length &&
    new Set(artifactIds).size === artifactIds.length &&
    artifactIds.length === data.deliverables.length;
  const automaticPassed =
    contractValid &&
    factChecks.every((check) => check.passed) &&
    artifactChecks.every((check) => check.passed);
  const digest = submissionDigest(submission);
  const fixtureDigest = caseDigest(data);
  const review = submission.review;
  const reviewValid =
    Boolean(review) &&
    review?.submissionDigest === digest &&
    review.caseDigest === fixtureDigest &&
    review.reviewer.trim().length > 0 &&
    review.criteria.length === data.rubric.length &&
    new Set(review.criteria.map((criterion) => criterion.id)).size === review.criteria.length &&
    review.criteria.every((criterion) => {
      const rubric = data.rubric.find((item) => item.id === criterion.id);
      if (!rubric || !criterion.reason.trim()) return false;
      if (criterion.score === 0) return true;
      return (
        criterion.evidence.length > 0 &&
        criterion.evidence.every((evidence) => {
          const artifact = submission.artifacts.find((item) => item.id === evidence.artifactId);
          if (!artifact || !rubric.artifacts.includes(artifact.id)) return false;
          return evidence.quote.trim().length >= 12 && artifact.body.includes(evidence.quote);
        })
      );
    });
  const reviewPassed =
    reviewValid && Boolean(review?.criteria.every((criterion) => criterion.score === 2));
  if (automaticPassed && reviewPassed)
    return {
      caseId: data.id,
      passed: true,
      status: "passed_with_recorded_review" as const,
      automaticPassed,
      reviewValid,
      reviewPassed,
      submissionDigest: digest,
      caseDigest: fixtureDigest,
      factChecks,
      artifactChecks,
    };
  if (automaticPassed && !review)
    return {
      caseId: data.id,
      passed: false,
      status: "awaiting_review" as const,
      automaticPassed,
      reviewValid,
      reviewPassed,
      submissionDigest: digest,
      caseDigest: fixtureDigest,
      factChecks,
      artifactChecks,
    };
  return {
    caseId: data.id,
    passed: false,
    status: "failed" as const,
    automaticPassed,
    reviewValid,
    reviewPassed,
    submissionDigest: digest,
    caseDigest: fixtureDigest,
    factChecks,
    artifactChecks,
  };
}

export function validateCase(data: typeof WorkCase.Type) {
  const documentIds = data.documents.map((document) => document.id);
  const questionIds = data.questions.map((question) => question.id);
  const expectedIds = data.expected.map((expected) => expected.id);
  const artifactIds = data.deliverables.map((artifact) => artifact.id);
  const rubricIds = data.rubric.map((rubric) => rubric.id);
  return {
    documents: documentIds.length > 0 && new Set(documentIds).size === documentIds.length,
    questions:
      questionIds.length > 0 &&
      new Set(questionIds).size === questionIds.length &&
      new Set(expectedIds).size === expectedIds.length &&
      questionIds.length === expectedIds.length &&
      expectedIds.every((id) => questionIds.includes(id)),
    facts: data.expected.every((expected) => {
      if (expected.value === null) return expected.sources.length === 0;
      return (
        expected.sources.length > 0 &&
        new Set(expected.sources).size === expected.sources.length &&
        expected.sources.every((id) => documentIds.includes(id))
      );
    }),
    deliverables:
      artifactIds.length > 0 &&
      new Set(artifactIds).size === artifactIds.length &&
      data.deliverables.every(
        (artifact) => Number.isInteger(artifact.minWords) && artifact.minWords > 0,
      ),
    rubric:
      rubricIds.length > 0 &&
      new Set(rubricIds).size === rubricIds.length &&
      data.rubric.every(
        (rubric) =>
          rubric.artifacts.length > 0 &&
          new Set(rubric.artifacts).size === rubric.artifacts.length &&
          rubric.artifacts.every((id) => artifactIds.includes(id)) &&
          new Set(rubric.sources).size === rubric.sources.length &&
          rubric.sources.every((id) => documentIds.includes(id)),
      ),
  };
}
