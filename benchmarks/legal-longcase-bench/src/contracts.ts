import { Schema, Struct } from "effect";
import { WorkCase } from "@minutei/benchmark/contracts";

export const Case = Schema.Struct({
  ...Struct.omit(WorkCase.fields, ["documents"]),
  documentsFile: Schema.NonEmptyString,
  documentCount: Schema.Int,
  documentCharacters: Schema.Int,
  documentBytes: Schema.Int,
  comparisonGroup: Schema.NullOr(Schema.NonEmptyString),
});
