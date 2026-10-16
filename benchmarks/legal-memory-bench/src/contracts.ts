import { Schema } from "effect";
import {
  Document,
  Question,
  Expected,
  Answer,
  Check,
  Execution,
} from "@minutei/benchmark/contracts";

export const Session = Schema.Struct({
  id: Schema.NonEmptyString,
  matter: Schema.NonEmptyString,
  message: Schema.NonEmptyString,
  documents: Schema.Array(Document),
  questions: Schema.Array(Question),
  expected: Schema.Array(Expected),
});
export const Case = Schema.Struct({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  capability: Schema.NonEmptyString,
  sessions: Schema.Array(Session),
});
export const SessionResponse = Schema.Struct({
  sessionId: Schema.NonEmptyString,
  answers: Schema.Array(Answer),
});
export const Submission = Schema.Struct({
  caseId: Schema.NonEmptyString,
  sessions: Schema.Array(SessionResponse),
});

export const SessionReport = Schema.Struct({
  id: Schema.String,
  passed: Schema.Boolean,
  checks: Schema.Array(Check),
});
export const Evaluation = Schema.Struct({
  caseId: Schema.String,
  passed: Schema.Boolean,
  sessions: Schema.Array(SessionReport),
  scope: Schema.Literal("observable_memory_answers_only"),
});
export const SessionInput = Schema.Struct({
  benchmark: Schema.String,
  model: Schema.String,
  harness: Schema.String,
  caseId: Schema.String,
  sessionId: Schema.String,
  matter: Schema.String,
  message: Schema.String,
  questions: Schema.Array(Question),
  documents: Schema.Array(Document),
  memoryDirectory: Schema.String,
  instruction: Schema.String,
});

export const Record = Schema.Struct({
  ...Execution.fields,
  submission: Submission,
  report: Schema.NullOr(Evaluation),
});
