import { Schema } from "effect";
import { Case, Document, Manifest } from "./contracts";

export const manifest = Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(await Bun.file(new URL("../benchmark.json", import.meta.url)).text());

export async function loadCase(id: string) {
  if (!manifest.cases.includes(id)) return Promise.reject(new Error("Unknown case ID"));
  const data = Schema.decodeUnknownSync(Schema.fromJsonString(Case))(await Bun.file(new URL(`../cases/${id}.json`, import.meta.url)).text());
  if (data.documentsFile !== `fixtures/${id}.jsonl`) return Promise.reject(new Error("Invalid fixture path"));
  const content = await Bun.file(new URL(`../${data.documentsFile}`, import.meta.url)).text();
  const documents = content.trim().split("\n").map((line) => Schema.decodeUnknownSync(Schema.fromJsonString(Document))(line));
  return { ...data, documents };
}
