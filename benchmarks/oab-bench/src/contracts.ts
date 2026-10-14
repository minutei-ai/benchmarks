import { Schema } from "effect";

export const Citation = Schema.Struct({ documentId: Schema.String, quote: Schema.String });
export const Draft = Schema.Struct({
  key: Schema.String,
  body: Schema.String,
  citations: Schema.Array(Citation),
});
export const Call = Schema.Union([
  Schema.Struct({ type: Schema.Literal("list_documents"), cursor: Schema.Number }),
  Schema.Struct({ type: Schema.Literal("read_document"), id: Schema.String }),
  Schema.Struct({ type: Schema.Literal("save_draft"), draft: Draft }),
  Schema.Struct({ type: Schema.Literal("finish"), message: Schema.String }),
]);

export const TaskId = Schema.Literals(["evidence", "injection", "retry"]);
export const RunConfig = Schema.Struct({
  task: TaskId,
  model: Schema.String,
  harness: Schema.String,
  seed: Schema.Number,
  command: Schema.Array(Schema.String),
});
