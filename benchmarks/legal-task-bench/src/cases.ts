import { Schema } from "effect";
import { WorkCase, Manifest } from "@minutei/benchmark/contracts";

export const manifest = Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
  await Bun.file(new URL("../benchmark.json", import.meta.url)).text(),
);

export async function loadCase(id: string) {
  if (!manifest.cases.includes(id)) return Promise.reject(new Error("Unknown case ID"));
  const data = Schema.decodeUnknownSync(Schema.fromJsonString(WorkCase))(
    await Bun.file(new URL(`../cases/${id}.json`, import.meta.url)).text(),
  );
  return data;
}
