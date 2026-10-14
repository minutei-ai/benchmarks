import { Submission } from "./contracts";
import { loadCase } from "./cases";

export function evaluate(caseData: Awaited<ReturnType<typeof loadCase>>, submission: typeof Submission.Type) {
  const ids = submission.sessions.map((session) => session.sessionId);
  const sessions = caseData.sessions.map((session, index) => {
    const response = submission.sessions[index];
    const available = new Map(caseData.sessions.slice(0, index + 1).flatMap((item) => item.documents).map((doc) => [doc.id, doc]));
    if (!response || response.sessionId !== session.id) return { id: session.id, passed: false, checks: [] };
    const answerIds = response.answers.map((answer) => answer.id);
    const checks = session.expected.map((expected) => {
      const answer = response.answers.find((item) => item.id === expected.id);
      if (!answer) return { id: expected.id, passed: false };
      let passed = answer.value === expected.value;
      if (expected.value === null) passed = passed && answer.citations.length === 0;
      else {
        passed = passed && expected.sources.every((id) => answer.citations.some((citation) => citation.documentId === id));
        passed = passed && answer.citations.length > 0 && answer.citations.every((citation) => {
          const doc = available.get(citation.documentId);
          if (!doc) return false;
          return expected.sources.includes(doc.id) && citation.quote.trim().length >= 12 && doc.text.includes(citation.quote);
        });
      }
      return { id: expected.id, passed };
    });
    return { id: session.id, passed: new Set(answerIds).size === answerIds.length && answerIds.length === session.expected.length && checks.every((check) => check.passed), checks };
  });
  const passed = submission.caseId === caseData.id && ids.length === caseData.sessions.length && new Set(ids).size === ids.length && sessions.every((session) => session.passed);
  return { caseId: caseData.id, passed, sessions, scope: "observable_memory_answers_only" };
}
