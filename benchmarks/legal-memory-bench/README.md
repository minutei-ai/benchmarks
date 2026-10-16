# Legal Memory Bench

Continuidade jurídica entre sessões, com correção, isolamento, esquecimento, revogação e referência temporal. **Revisão 0.2.0, oito casos sintéticos.** O runner inicia um novo processo do adapter em cada sessão e mantém apenas um diretório de memória para aquele caso e tentativa. O histórico não é reenviado.

| Caso | Capacidade                                              | Sessões |
| ---- | ------------------------------------------------------- | ------: |
| M01  | Correção de valor comprovado                            |       3 |
| M02  | Mesmo nome em processos diferentes                      |       3 |
| M03  | Esquecimento solicitado de limite negocial              |       3 |
| M04  | Hipótese não vira fato comprovado                       |       3 |
| M05  | Revogação de autorização operacional                    |       3 |
| M06  | Versões contratuais e referência temporal               |       3 |
| M07  | Correção depois de distratores e clientes homônimos     |      24 |
| M08  | Revogação mantida após autorizações de outros processos |      10 |

## Executar

Instale na raiz com `bun install --frozen-lockfile` e use:

```json
{
  "caseId": "M01",
  "model": "exact-provider-model-and-parameters",
  "harness": "harness-sha-and-prompt-hash",
  "command": ["bun", "/absolute/path/to/adapter.ts"],
  "output": "/absolute/path/to/result.json",
  "timeoutMs": 300000
}
```

```sh
bun run --cwd benchmarks/legal-memory-bench run:agent /absolute/path/to/config.json
```

Cada processo recebe a sessão atual: `sessionId`, `matter`, `message`, `documents`, `questions` e `memoryDirectory`. O modelo e o harness declarados acompanham o payload. Não recebe gabaritos, sessões futuras ou transcript anterior. O adapter usa as ferramentas e a memória do harness real, ou armazenamento externo com isolamento equivalente. Estado de clientes e tentativas diferentes não pode ser compartilhado.

A resposta é um JSON:

```json
{
  "sessionId": "S3",
  "answers": [
    {
      "id": "question-id",
      "value": "canonical-value-or-null",
      "citations": [{ "documentId": "source-id", "quote": "Literal excerpt preserved in memory" }]
    }
  ]
}
```

Sessões sem perguntas respondem `answers: []`. Perguntas especificam a representação. Desconhecido usa `null` e citações vazias. O runner reúne as sessões na ordem; fatos corretos precisam de trechos de fontes válidas disponíveis até aquele momento. Fonte de outro processo, versão errada, sessão futura, resposta extra e IDs duplicados falham.

O timeout é por sessão: padrão de cinco minutos, ajustável entre 1 segundo e 1 hora. Falha de processo, JSON, timeout ou saída acima de 2 MiB gera resultado `execution_failed`; sessões já concluídas são preservadas. Logs ficam em `<resultado>.<sessão>.stderr.log`. O diretório de memória é limpo ao finalizar, inclusive em falha tratada. Uma morte forçada do runner pode impedir o relatório da sessão em curso e a limpeza.

## Interpretar

```sh
bun run --cwd benchmarks/legal-memory-bench evaluate /absolute/path/to/submission.json
```

A aprovação cobre respostas observáveis com memória, fonte e sequência corretas. Não inspeciona o mecanismo interno de memória, não comprova apagamento físico e não certifica isolamento do backend externo. M07/M08 acrescentam interferência entre sessões, mas não representam milhares de interações. Veja [a metodologia](../../docs/methodology.md).

`benchmark.json` e `cases/` são a fonte. O export contém as sessões para o orquestrador, que deve entregá-las uma por vez; enviar todas ao agente invalida a comparação de memória. [O registro PostHog](docs/posthog.md) é histórico de 0.1.x; 0.2.0 não foi espelhado remotamente.

No checkout do Minutei com `bench:serve` ativo:

```sh
bun run bench:run /caminho/benchmarks/benchmarks/legal-memory-bench M01 /tmp/M01.json
```

O protocolo permanece compatível com o adapter local. Os controles locais desta revisão não executam Capi ou um provedor real. Referência de desenho: [LongMemEval](https://github.com/xiaowu0162/LongMemEval), sem copiar ou traduzir seus casos.
