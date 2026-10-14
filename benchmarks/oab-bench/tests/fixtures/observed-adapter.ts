import { Match, Schema } from "effect";
import { Call, Document, ResultMessage, TaskMessage } from "../../src/contracts";

const reader = Bun.stdin.stream().getReader();
const decoder = new TextDecoder();
const transport = { buffer: "" };

async function receive() {
  while (!transport.buffer.includes("\n")) {
    const chunk = await reader.read();
    if (chunk.done) return Promise.reject(new Error("Protocol ended before response"));
    transport.buffer += decoder.decode(chunk.value, { stream: true });
  }
  const boundary = transport.buffer.indexOf("\n");
  const line = transport.buffer.slice(0, boundary);
  transport.buffer = transport.buffer.slice(boundary + 1);
  return line;
}

async function call(input: typeof Call.Type) {
  console.log(Schema.encodeSync(Schema.fromJsonString(Call))(input));
  return Schema.decodeUnknownSync(Schema.fromJsonString(ResultMessage))(await receive()).result;
}

const task = Schema.decodeUnknownSync(Schema.fromJsonString(TaskMessage))(await receive());
const documents = new Map<string, typeof Document.Type>();
const page = { cursor: 0 };
while (true) {
  const result = await call({ type: "list_documents", cursor: page.cursor });
  if (!("documents" in result)) process.exit(2);
  for (const document of result.documents) {
    const response = await call({ type: "read_document", id: document.id });
    if (!("document" in response)) process.exit(3);
    documents.set(document.id, response.document);
  }
  if (result.nextCursor === null) break;
  page.cursor = result.nextCursor;
}
if (task.id === "source_revision") {
  const response = await call({ type: "read_document", id: "conferencia" });
  if (!("document" in response)) process.exit(4);
  documents.set(response.document.id, response.document);
}
const conference = documents.get("conferencia");
const pendingUnits = Match.value(conference).pipe(
  Match.when(undefined, () => null),
  Match.orElse((document) => {
    const match = document.body.match(/Restam (\d+) equipamentos pendentes/u);
    if (!match) process.exit(5);
    return Number(match[1]);
  }),
);
if (!conference)
  await call({
    type: "request_clarification",
    clarification: {
      field: "received_units",
      question: "Qual a quantidade recebida comprovada pela conferência?",
    },
  });
const citations = [...documents.values()]
  .filter((document) => document.id !== "email-antigo")
  .map((document) => ({ documentId: document.id, quote: document.body }));
const draft = {
  key: "observed-control",
  body: citations.map((citation) => citation.quote).join("\n"),
  citations,
  pendingUnits,
  sourceRevision: conference?.revision ?? 0,
};
const saved = await call({ type: "save_draft", draft });
if ("error" in saved && saved.error === "timeout") await call({ type: "save_draft", draft });
await call({ type: "read_draft", key: draft.key });
console.log(
  Schema.encodeSync(Schema.fromJsonString(Call))({
    type: "finish",
    message: "Minuta interna salva e relida.",
  }),
);
