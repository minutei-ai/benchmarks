# Legal Task Bench

Trabalho jurídico com documentos, fatos estruturados e entregas revisáveis. **Revisão 0.2.0, oito casos sintéticos.** O harness usa suas ferramentas para ler o arquivo de documentos e produzir as entregas; o runner não resolve a tarefa nem chama diretamente um modelo.

| Caso | Trabalho                                              |
| ---- | ----------------------------------------------------- |
| T01  | Entrega parcial de equipamentos                       |
| T02  | Defesa em cobrança com pagamentos omitidos            |
| T03  | Cobrança duplicada de consumidor                      |
| T04  | Revisão de contrato de tecnologia                     |
| T05  | Providências após decisão judicial                    |
| T06  | Proposta de acordo com limite de mandato              |
| T07  | Marco de intimação ausente e providência preparatória |
| T08  | Versões conflitantes e suspensão posterior de envio   |

## Executar

Instale na raiz com `bun install --frozen-lockfile`. Configuração do adapter:

```json
{
  "caseId": "T01",
  "model": "exact-provider-model-and-parameters",
  "harness": "harness-sha-and-prompt-hash",
  "command": ["bun", "/absolute/path/to/adapter.ts"],
  "output": "/absolute/path/to/result.json",
  "timeoutMs": 300000
}
```

```sh
bun run --cwd benchmarks/legal-task-bench run:agent /absolute/path/to/config.json
```

O adapter recebe uma mensagem JSON por stdin com instrução, perguntas, entregas e caminho de `documentsFile`. Gabaritos e rubrica privada não entram no payload. Logs vão para stderr; a resposta é um JSON:

```json
{
  "caseId": "T01",
  "answers": [
    {
      "id": "question-id",
      "value": "canonical-value-or-null",
      "citations": [{ "documentId": "source-id", "quote": "Literal supporting excerpt" }]
    }
  ],
  "artifacts": [{ "id": "deliverable-id", "body": "Complete work product" }]
}
```

Use os IDs, representações e entregas especificados no input. Valores monetários são centavos e datas são ISO quando a pergunta exigir. Desconhecido usa JSON `null` e citações vazias. Cada resposta conhecida precisa das fontes requeridas e de citações literais de pelo menos 12 caracteres. Fontes de outro fato, IDs duplicados, omissões e entregas ausentes falham. O adapter não pode incluir sua própria revisão.

Timeout padrão de cinco minutos, ajustável entre 1 segundo e 1 hora por subprocesso. O resultado e `<resultado>.stderr.log` ficam fora do diretório temporário; falhas de processo, JSON, timeout e saída acima de 2 MiB geram `status: execution_failed`, sem pontuação factual inventada. A limpeza remove o diretório de documentos ao finalizar.

## Avaliação

Checks automáticos conferem fatos, citações e presença das entregas, incluindo tamanho mínimo. Aprovação da tarefa exige revisão independente com nota 2 em todos os critérios. Cada critério delimita artefatos e fontes; a revisão é vinculada a `submissionDigest` e `caseDigest`.

```sh
bun run --cwd benchmarks/legal-task-bench evaluate /absolute/path/to/submission.json
```

Veja [como registrar a revisão](../../docs/review.md) e [a metodologia](../../docs/methodology.md). Sem revisão, uma entrega com todos os checks automáticos aprovados permanece `awaiting_review` e `passed: false`.

## Fonte, versões e integração

`benchmark.json` e `cases/` são a fonte. Os exports 0.2.0 têm novos IDs e hashes; [o registro PostHog](docs/posthog.md) descreve uma publicação histórica 0.1.x. Não houve espelhamento remoto de 0.2.0 ou nova execução de agentes nesta revisão.

As referências legislativas dos casos originais são notas autorais sobre [Código Civil](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm), [CDC](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) e [CPC](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm), registradas em 27/09/2026. Não são transcrições integrais ou revisão jurídica especializada. A suite não comprova aptidão profissional; pesquisa externa muda as condições do experimento e precisa ser registrada.

No checkout do Minutei com `bench:serve` ativo:

```sh
bun run bench:run /caminho/benchmarks/benchmarks/legal-task-bench T01 /tmp/T01.json
```

O protocolo de respostas continua compatível com o adapter local. Isso não constitui uma nova validação com Capi, storage de produção ou provedor real.
