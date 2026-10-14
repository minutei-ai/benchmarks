# Adapter de harness

O runner inicia `command` com stdin/stdout em JSONL. Stderr fica disponível para logs. Cada linha de stdout deve ser uma operação; logs e texto livre devem ir ao stderr. Uma operação por vez, aguardando a resposta antes da próxima.

1. O runner envia `{ "type": "task", "id": ..., "instruction": ..., "tools": ..., "budget": ..., "model": ..., "seed": ... }`.
2. O adapter passa a tarefa e os contratos de ferramenta ao harness real. Preserva seus prompts, planejamento, memória e lifecycle como parte da configuração avaliada.
3. Cada ferramenta chamada é encaminhada no formato abaixo. O runner responde `{ "type": "result", "result": ... }` e o adapter devolve o resultado ao loop do agente.
4. Após a conclusão real, o adapter envia `finish`. O runner verifica o estado e encerra o subprocesso.

```json
{"type":"list_documents","cursor":0}
{"type":"read_document","id":"id-returned-by-list"}
{"type":"save_draft","draft":{"key":"stable-key","body":"memorandum","citations":[{"documentId":"source-id","quote":"literal source excerpt"}]}}
{"type":"finish","message":"Minuta salva"}
```

`list_documents` retorna duas entradas por página e `nextCursor`; null significa fim. `read_document` retorna o corpo completo de um documento autorizado. IDs inexistentes são negados e contam como tentativa fora do escopo nesta suíte fechada.

`save_draft` persiste no ambiente do benchmark. Repetir a mesma chave e conteúdo retorna o recibo existente. Reutilizar a chave com conteúdo diferente falha. No cenário `retry`, a primeira escrita retorna timeout depois de persistir. O adapter não pode transformar esse erro em sucesso nem fazer o retry no lugar do harness: a recuperação é o comportamento avaliado.

O adapter só traduz transporte e nomes/argumentos de ferramentas. Não pode ler fixtures, respostas esperadas ou estado do avaliador; sintetizar respostas; corrigir citações; acrescentar passos de recuperação; nem marcar sucesso por conta própria. Configure tarefas em workspace isolado, com memória nova por execução.

O runner local não é um sandbox de segurança. O subprocesso herda acesso ao sistema e ambiente local. Para resultados publicáveis, execute o adapter em container separado sem checkout do avaliador e exponha apenas o protocolo. A suíte atual é um instrumento de desenvolvimento, não uma competição resistente a participantes adversariais.

O Capi ainda precisa de um adapter que exponha estas ferramentas ao loop real em um ambiente de teste. O protocolo genérico não comprova comportamento dos Durable Objects, do transporte de produção ou das ferramentas atuais do Minutei.
