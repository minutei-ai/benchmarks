import { Schema, Struct } from "effect";

export const Document = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  body: Schema.String,
  revision: Schema.Int,
});
export const Citation = Schema.Struct({ documentId: Schema.String, quote: Schema.String });
export const Draft = Schema.Struct({
  key: Schema.String,
  body: Schema.String,
  citations: Schema.Array(Citation),
  pendingUnits: Schema.NullOr(Schema.Int),
  sourceRevision: Schema.Int,
});
export const Clarification = Schema.Struct({
  field: Schema.Literal("received_units"),
  question: Schema.String,
});
export const Call = Schema.Union([
  Schema.Struct({ type: Schema.Literal("list_documents"), cursor: Schema.Int }),
  Schema.Struct({ type: Schema.Literal("read_document"), id: Schema.String }),
  Schema.Struct({ type: Schema.Literal("save_draft"), draft: Draft }),
  Schema.Struct({ type: Schema.Literal("read_draft"), key: Schema.String }),
  Schema.Struct({ type: Schema.Literal("request_clarification"), clarification: Clarification }),
  Schema.Struct({ type: Schema.Literal("send_notification"), key: Schema.String }),
  Schema.Struct({ type: Schema.Literal("finish"), message: Schema.String }),
]);
export const ToolResult = Schema.Union([
  Schema.Struct({ error: Schema.String, message: Schema.optional(Schema.String) }),
  Schema.Struct({
    documents: Schema.Array(Schema.Struct(Struct.pick(Document.fields, ["id", "title"]))),
    nextCursor: Schema.NullOr(Schema.Int),
  }),
  Schema.Struct({ document: Document }),
  Schema.Struct({ saved: Schema.Boolean, key: Schema.String }),
  Schema.Struct({ draft: Draft }),
  Schema.Struct({ clarificationRequested: Schema.Boolean }),
  Schema.Struct({ finished: Schema.Boolean }),
]);
export const TaskId = Schema.Literals([
  "evidence",
  "injection",
  "retry",
  "authorization",
  "missing_information",
  "source_revision",
]);
export const RunConfig = Schema.Struct({
  task: TaskId,
  model: Schema.NonEmptyString,
  harness: Schema.NonEmptyString,
  seed: Schema.Int,
  command: Schema.Array(Schema.NonEmptyString),
});
export const Checks = Schema.Struct({
  completed: Schema.Boolean,
  singleDraft: Schema.Boolean,
  groundedEvidence: Schema.Boolean,
  scopeRespected: Schema.Boolean,
  recovery: Schema.Boolean,
  withinBudget: Schema.Boolean,
  readBackConfirmed: Schema.Boolean,
  factualState: Schema.Boolean,
  freshSources: Schema.Boolean,
  clarification: Schema.Boolean,
});
export const Evaluation = Schema.Struct({
  passed: Schema.Boolean,
  checks: Checks,
  toolCalls: Schema.Int,
  drafts: Schema.Array(Draft),
  legalQuality: Schema.Literal("not_evaluated"),
});
export const TraceEntry = Schema.Struct({ call: Call, result: ToolResult });
export const Record = Schema.Struct({
  ...Evaluation.fields,
  version: Schema.String,
  config: RunConfig,
  elapsedMs: Schema.Number,
  fixtureDigest: Schema.String,
  failure: Schema.NullOr(Schema.String),
  trace: Schema.Array(TraceEntry),
});
export const TaskMessage = Schema.Struct({
  type: Schema.Literal("task"),
  id: TaskId,
  instruction: Schema.String,
  operations: Schema.JsonObject,
  budget: Schema.Struct({
    toolCalls: Schema.Int,
    timeoutMs: Schema.Int,
    protocolBytes: Schema.Int,
  }),
  model: Schema.String,
  seed: Schema.Int,
});
export const ResultMessage = Schema.Struct({ type: Schema.Literal("result"), result: ToolResult });
