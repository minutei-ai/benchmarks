import { Schema } from "effect";
import { SubmissionBody, Submission } from "./contracts";
import { loadCase } from "./cases";

export function submissionDigest(submission: typeof SubmissionBody.Type) {
  return new Bun.CryptoHasher("sha256").update(Schema.encodeSync(Schema.fromJsonString(SubmissionBody))(submission)).digest("hex");
}

export function evaluate(caseData: Awaited<ReturnType<typeof loadCase>>, submission: typeof Submission.Type) {
  const documentById = new Map(caseData.documents.map((d) => [d.id, d]));
  const factChecks = caseData.expected.map((expected) => {
    const answer = submission.answers.find((item) => item.id === expected.id);
    if (!answer) return { id: expected.id, passed: false };
    let passed = answer.value === expected.value;
    if (expected.value === null) passed = passed && answer.citations.length === 0;
    else {
      passed = passed && expected.sources.every((id) => answer.citations.some((citation) => citation.documentId === id));
      passed = passed && answer.citations.length > 0 && answer.citations.every((citation) => {
        const doc = documentById.get(citation.documentId);
        if (!doc) return false;
        return citation.quote.trim().length >= 12 && doc.text.includes(citation.quote);
      });
    }
    return { id: expected.id, passed };
  });
  const answerIds = submission.answers.map((answer) => answer.id);
  const artifactIds = submission.artifacts.map((artifact) => artifact.id);
  const artifactChecks = caseData.deliverables.map((required) => {
    const artifact = submission.artifacts.find((item) => item.id === required.id);
    if (!artifact) return { id: required.id, passed: false };
    return { id: required.id, passed: artifact.body.trim().split(/\s+/u).length >= required.minWords };
  });
  const contractValid = submission.caseId === caseData.id && new Set(answerIds).size === answerIds.length && answerIds.length === caseData.expected.length && new Set(artifactIds).size === artifactIds.length && artifactIds.length === caseData.deliverables.length;
  const automaticPassed = contractValid && factChecks.every((check) => check.passed) && artifactChecks.every((check) => check.passed);
  const digest = submissionDigest(submission);
  const review = submission.review;
  let reviewPassed = false;
  let reviewValid = false;
  if (review) {
    const ids = review.criteria.map((criterion) => criterion.id);
    reviewValid = review.submissionDigest === digest && review.reviewer.trim().length > 0 && new Set(ids).size === ids.length && ids.length === caseData.rubric.length && ids.every((id) => caseData.rubric.some((r) => r.id === id));
    reviewValid = reviewValid && review.criteria.every((criterion) => {
      if (!criterion.reason.trim()) return false;
      if (criterion.score === 0) return true;
      return criterion.evidence.length > 0 && criterion.evidence.every((evidence) => {
        const artifact = submission.artifacts.find((item) => item.id === evidence.artifactId);
        if (!artifact) return false;
        return evidence.quote.trim().length >= 12 && artifact.body.includes(evidence.quote);
      });
    });
    reviewPassed = reviewValid && caseData.rubric.every((required) => {
      const criterion = review.criteria.find((item) => item.id === required.id);
      if (!criterion) return false;
      if (required.critical) return criterion.score === 2;
      return criterion.score >= 1;
    }) && review.criteria.reduce((sum, item) => sum + item.score, 0) >= caseData.rubric.length * 2 * 0.8;
  }
  let status = "failed";
  if (automaticPassed && !review) status = "awaiting_review";
  if (automaticPassed && reviewPassed) status = "passed_with_recorded_review";
  return { caseId: caseData.id, passed: automaticPassed && reviewPassed, status, automaticPassed, reviewValid, reviewPassed, submissionDigest: digest, factChecks, artifactChecks };
}
