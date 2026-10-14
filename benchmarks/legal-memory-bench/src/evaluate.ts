import { Submission } from "./contracts";
import { loadCase } from "./cases";

export function evaluate(
  data: Awaited<ReturnType<typeof loadCase>>,
  submission: typeof Submission.Type,
) {
  const ids = submission.sessions.map((session) => session.sessionId);
  const sessions = data.sessions.map((session, index) => {
    const response = submission.sessions[index];
    const available = new Map(
      data.sessions
        .slice(0, index + 1)
        .flatMap((item) => item.documents)
        .map((document) => [document.id, document]),
    );
    if (!response || response.sessionId !== session.id)
      return { id: session.id, passed: false, checks: [] };
    const answerIds = response.answers.map((answer) => answer.id);
    const checks = session.expected.map((expected) => {
      const answer = response.answers.find((item) => item.id === expected.id);
      if (!answer || answer.value !== expected.value) return { id: expected.id, passed: false };
      if (expected.value === null)
        return { id: expected.id, passed: answer.citations.length === 0 };
      const sourcesPresent = expected.sources.every((id) =>
        answer.citations.some((citation) => citation.documentId === id),
      );
      const grounded =
        answer.citations.length > 0 &&
        answer.citations.every((citation) => {
          const document = available.get(citation.documentId);
          if (!document) return false;
          return (
            expected.sources.includes(document.id) &&
            citation.quote.trim().length >= 12 &&
            document.text.includes(citation.quote)
          );
        });
      return { id: expected.id, passed: sourcesPresent && grounded };
    });
    return {
      id: session.id,
      passed:
        new Set(answerIds).size === answerIds.length &&
        answerIds.length === session.expected.length &&
        checks.every((check) => check.passed),
      checks,
    };
  });
  const passed =
    submission.caseId === data.id &&
    ids.length === data.sessions.length &&
    new Set(ids).size === ids.length &&
    sessions.every((session) => session.passed);
  return { caseId: data.id, passed, sessions, scope: "observable_memory_answers_only" as const };
}
