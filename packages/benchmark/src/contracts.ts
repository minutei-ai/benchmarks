import { Schema } from "effect";

export const Document = Schema.Struct({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  text: Schema.NonEmptyString,
});
export const Question = Schema.Struct({ id: Schema.NonEmptyString, prompt: Schema.NonEmptyString });
export const Expected = Schema.Struct({
  id: Schema.NonEmptyString,
  value: Schema.NullOr(Schema.String),
  sources: Schema.Array(Schema.NonEmptyString),
  rationale: Schema.NonEmptyString,
});
export const Citation = Schema.Struct({
  documentId: Schema.NonEmptyString,
  quote: Schema.NonEmptyString,
});
export const Answer = Schema.Struct({
  id: Schema.NonEmptyString,
  value: Schema.NullOr(Schema.String),
  citations: Schema.Array(Citation),
});
export const Manifest = Schema.Struct({
  name: Schema.NonEmptyString,
  version: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  language: Schema.NonEmptyString,
  synthetic: Schema.Boolean,
  status: Schema.NonEmptyString,
  legalReview: Schema.NonEmptyString,
  cases: Schema.Array(Schema.NonEmptyString),
});
export const AgentConfig = Schema.Struct({
  caseId: Schema.NonEmptyString,
  model: Schema.NonEmptyString.check(Schema.isPattern(/\S/u)),
  harness: Schema.NonEmptyString.check(Schema.isPattern(/\S/u)),
  command: Schema.Array(Schema.NonEmptyString),
  output: Schema.NonEmptyString,
  timeoutMs: Schema.optional(
    Schema.Int.pipe(
      Schema.check(Schema.isGreaterThanOrEqualTo(1000), Schema.isLessThanOrEqualTo(3600000)),
    ),
  ),
});

export const Deliverable = Schema.Struct({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  minWords: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
});
export const Rubric = Schema.Struct({
  id: Schema.NonEmptyString,
  criterion: Schema.NonEmptyString,
  artifacts: Schema.Array(Schema.NonEmptyString),
  sources: Schema.Array(Schema.NonEmptyString),
});
export const Artifact = Schema.Struct({ id: Schema.NonEmptyString, body: Schema.NonEmptyString });
export const Review = Schema.Struct({
  reviewer: Schema.NonEmptyString,
  submissionDigest: Schema.NonEmptyString,
  caseDigest: Schema.NonEmptyString,
  criteria: Schema.Array(
    Schema.Struct({
      id: Schema.NonEmptyString,
      score: Schema.Literals([0, 1, 2]),
      reason: Schema.NonEmptyString,
      evidence: Schema.Array(
        Schema.Struct({ artifactId: Schema.NonEmptyString, quote: Schema.NonEmptyString }),
      ),
    }),
  ),
});
export const SubmissionBody = Schema.Struct({
  caseId: Schema.NonEmptyString,
  answers: Schema.Array(Answer),
  artifacts: Schema.Array(Artifact),
});
export const Submission = Schema.Struct({
  ...SubmissionBody.fields,
  review: Schema.optional(Review),
});

export const WorkCase = Schema.Struct({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  request: Schema.NonEmptyString,
  questions: Schema.Array(Question),
  expected: Schema.Array(Expected),
  deliverables: Schema.Array(Deliverable),
  rubric: Schema.Array(Rubric),
  documents: Schema.Array(Document),
});

export const Check = Schema.Struct({ id: Schema.String, passed: Schema.Boolean });
export const Evaluation = Schema.Struct({
  caseId: Schema.String,
  passed: Schema.Boolean,
  status: Schema.Literals(["passed_with_recorded_review", "awaiting_review", "failed"]),
  automaticPassed: Schema.Boolean,
  reviewValid: Schema.Boolean,
  reviewPassed: Schema.Boolean,
  submissionDigest: Schema.String,
  caseDigest: Schema.String,
  factChecks: Schema.Array(Check),
  artifactChecks: Schema.Array(Check),
});
export const Execution = Schema.Struct({
  benchmark: Schema.NonEmptyString,
  version: Schema.NonEmptyString,
  config: AgentConfig,
  elapsedMs: Schema.Number,
  fixtureDigest: Schema.NonEmptyString,
  status: Schema.Literals(["completed", "execution_failed"]),
  failure: Schema.NullOr(Schema.String),
});
export const WorkInput = Schema.Struct({
  benchmark: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  harness: Schema.NonEmptyString,
  caseId: Schema.NonEmptyString,
  request: Schema.NonEmptyString,
  questions: Schema.Array(Question),
  deliverables: Schema.Array(Deliverable),
  documentsFile: Schema.NonEmptyString,
  instruction: Schema.NonEmptyString,
});
export const DatasetMetadata = Schema.Struct({
  benchmark: Schema.String,
  version: Schema.String,
  case_id: Schema.String,
  synthetic: Schema.Boolean,
  legal_review: Schema.Literal("pending"),
  fixture_sha256: Schema.String,
  repository: Schema.String,
  source: Schema.String,
  execution: Schema.Literal("external_agent_adapter"),
  results: Schema.Literal("not_run"),
});
export const WorkRecord = Schema.Struct({
  ...Execution.fields,
  submission: Schema.NullOr(Submission),
  report: Schema.NullOr(Evaluation),
});
