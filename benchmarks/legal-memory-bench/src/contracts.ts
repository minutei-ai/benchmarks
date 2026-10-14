import { Schema } from "effect";

export const Document = Schema.Struct({ id: Schema.NonEmptyString, title: Schema.NonEmptyString, text: Schema.NonEmptyString });
export const Question = Schema.Struct({ id: Schema.NonEmptyString, prompt: Schema.NonEmptyString });
export const Expected = Schema.Struct({ id: Schema.NonEmptyString, value: Schema.NullOr(Schema.String), sources: Schema.Array(Schema.NonEmptyString), rationale: Schema.NonEmptyString });
export const Citation = Schema.Struct({ documentId: Schema.NonEmptyString, quote: Schema.NonEmptyString });
export const Answer = Schema.Struct({ id: Schema.NonEmptyString, value: Schema.NullOr(Schema.String), citations: Schema.Array(Citation) });
export const Manifest = Schema.Struct({ name: Schema.NonEmptyString, version: Schema.NonEmptyString, description: Schema.NonEmptyString, language: Schema.NonEmptyString, synthetic: Schema.Boolean, status: Schema.NonEmptyString, legalReview: Schema.NonEmptyString, cases: Schema.Array(Schema.NonEmptyString) });
export const AgentConfig = Schema.Struct({ caseId: Schema.NonEmptyString, model: Schema.NonEmptyString, harness: Schema.NonEmptyString, command: Schema.Array(Schema.NonEmptyString), output: Schema.NonEmptyString, timeoutMs: Schema.optional(Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1000), Schema.isLessThanOrEqualTo(3600000)))) });

export const Session = Schema.Struct({ id: Schema.NonEmptyString, matter: Schema.NonEmptyString, message: Schema.NonEmptyString, documents: Schema.Array(Document), questions: Schema.Array(Question), expected: Schema.Array(Expected) });
export const Case = Schema.Struct({ id: Schema.NonEmptyString, title: Schema.NonEmptyString, capability: Schema.NonEmptyString, sessions: Schema.Array(Session) });
export const SessionResponse = Schema.Struct({ sessionId: Schema.NonEmptyString, answers: Schema.Array(Answer) });
export const Submission = Schema.Struct({ caseId: Schema.NonEmptyString, sessions: Schema.Array(SessionResponse) });
