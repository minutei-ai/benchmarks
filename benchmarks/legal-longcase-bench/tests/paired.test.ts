import { expect, test } from "bun:test";
import { loadCase } from "../src/cases";

test("paired dossier sizes keep the same task, evidence and earlier distractors", async () => {
  const [small, medium, large] = await Promise.all([
    loadCase("C04"),
    loadCase("C05"),
    loadCase("C06"),
  ]);
  expect([small.documents.length, medium.documents.length, large.documents.length]).toEqual([
    128, 512, 1024,
  ]);
  expect(small.comparisonGroup).toBe(medium.comparisonGroup);
  expect(small.comparisonGroup).toBe(large.comparisonGroup);
  expect(small.expected).toEqual(medium.expected);
  expect(small.expected).toEqual(large.expected);
  expect(small.request).toBe(large.request);
  expect(small.rubric).toEqual(large.rubric);
  expect(small.documents).toEqual(medium.documents.slice(0, 128));
  expect(medium.documents).toEqual(large.documents.slice(0, 512));
  for (const source of new Set(small.expected.flatMap((fact) => fact.sources))) {
    expect(small.documents.find((document) => document.id === source)).toEqual(
      large.documents.find((document) => document.id === source),
    );
  }
});
