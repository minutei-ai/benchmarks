import { Schema } from "effect";
import { Submission } from "./contracts";
import { loadCase } from "./cases";
import { evaluate } from "./evaluate";

const path = process.argv[2];
if (!path) {
  console.error("Usage: bun run evaluate submission.json");
  process.exit(1);
}
const submission = Schema.decodeUnknownSync(Schema.fromJsonString(Submission))(await Bun.file(path).text());
const report = evaluate(await loadCase(submission.caseId), submission);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
