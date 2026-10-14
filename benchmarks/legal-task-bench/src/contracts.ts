import { Schema } from "effect";

export const Document = Schema.Struct({ id: Schema.NonEmptyString, title: Schema.NonEmptyString, text: Schema.NonEmptyString });
export const Question = Schema.Struct({ id: Schema.NonEmptyString, prompt: Schema.NonEmptyString });
export const Expected = Schema.Struct({ id: Schema.NonEmptyString, value: Schema.NullOr(Schema.String), sources: Schema.Array(Schema.NonEmptyString), rationale: Schema.NonEmptyString });
export const Citation = Schema.Struct({ documentId: Schema.NonEmptyString, quote: Schema.NonEmptyString });
export const Answer = Schema.Struct({ id: Schema.NonEmptyString, value: Schema.NullOr(Schema.String), citations: Schema.Array(Citation) });
export const Manifest = Schema.Struct({ name: Schema.NonEmptyString, version: Schema.NonEmptyString, description: Schema.NonEmptyString, language: Schema.NonEmptyString, synthetic: Schema.Boolean, status: Schema.NonEmptyString, legalReview: Schema.NonEmptyString, cases: Schema.Array(Schema.NonEmptyString) });
export const AgentConfig = Schema.Struct({ caseId: Schema.NonEmptyString, model: Schema.NonEmptyString, harness: Schema.NonEmptyString, command: Schema.Array(Schema.NonEmptyString), output: Schema.NonEmptyString, timeoutMs: Schema.optional(Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1000), Schema.isLessThanOrEqualTo(3600000)))) });

export const Deliverable = Schema.Struct({ id: Schema.NonEmptyString, title: Schema.NonEmptyString, minWords: Schema.Number });
export const Rubric = Schema.Struct({ id: Schema.NonEmptyString, criterion: Schema.NonEmptyString, critical: Schema.Boolean });
export const Artifact = Schema.Struct({ id: Schema.NonEmptyString, body: Schema.NonEmptyString });
export const Review = Schema.Struct({
  reviewer: Schema.NonEmptyString,
  submissionDigest: Schema.NonEmptyString,
  criteria: Schema.Array(Schema.Struct({ id: Schema.NonEmptyString, score: Schema.Literals([0, 1, 2]), reason: Schema.NonEmptyString, evidence: Schema.Array(Schema.Struct({ artifactId: Schema.NonEmptyString, quote: Schema.NonEmptyString })) })),
});
export const SubmissionBody = Schema.Struct({ caseId: Schema.NonEmptyString, answers: Schema.Array(Answer), artifacts: Schema.Array(Artifact) });
export const Submission = Schema.Struct({ ...SubmissionBody.fields, review: Schema.optional(Review) });

export const Case = Schema.Struct({
  id: Schema.NonEmptyString, title: Schema.NonEmptyString, request: Schema.NonEmptyString,
  questions: Schema.Array(Question), expected: Schema.Array(Expected), deliverables: Schema.Array(Deliverable), rubric: Schema.Array(Rubric),
  documents: Schema.Array(Document),
});
