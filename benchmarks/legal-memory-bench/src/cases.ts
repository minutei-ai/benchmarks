import { Schema } from "effect";
import { Case } from "./contracts";
import { Manifest } from "@minutei/benchmark/contracts";

export const manifest = Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
  await Bun.file(new URL("../benchmark.json", import.meta.url)).text(),
);

export async function loadCase(id: string) {
  if (!manifest.cases.includes(id)) return Promise.reject(new Error("Unknown case ID"));
  const data = Schema.decodeUnknownSync(Schema.fromJsonString(Case))(
    await Bun.file(new URL(`../cases/${id}.json`, import.meta.url)).text(),
  );
  return data;
}

export function caseDigest(data: typeof Case.Type) {
  return new Bun.CryptoHasher("sha256")
    .update(Schema.encodeSync(Schema.fromJsonString(Case))(data))
    .digest("hex");
}
