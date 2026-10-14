# legal-memory-bench

Memória jurídica entre sessões: correção, isolamento, esquecimento, autorização e tempo.

Benchmark independente do Minutei. **Versão 0.1.0: casos e avaliadores executáveis; integração Capi e execuções de agentes ainda pendentes.**

Seis casos, três sessões por caso. O runner inicia um novo processo do adapter em cada sessão e mantém apenas um diretório de memória compartilhado dentro daquele caso. O histórico não é reenviado. O harness precisa escrever e recuperar sua própria memória, ou usar um armazenamento externo isolado com lifecycle equivalente.

| Caso | Capacidade |
| --- | --- |
| M01 | Correção de valor comprovado |
| M02 | Mesmo nome em processos diferentes |
| M03 | Esquecimento solicitado de limite negocial |
| M04 | Hipótese não vira fato comprovado |
| M05 | Revogação de autorização operacional |
| M06 | Versões contratuais e referência temporal |

## Rodar

Requer Bun 1.4.2. Todos os checks locais são offline e não chamam provedores.

```sh
bun install --frozen-lockfile
bun run check
bun run validate
bun test
bun run export > dataset.jsonl
bun run run:agent config.json
bun run evaluate submission.json
```

Configuração do runner:

```json
{
  "caseId": "M01",
  "model": "provider/exact-model-snapshot-and-parameters",
  "harness": "harness-git-sha-and-prompt-config-hash",
  "command": ["bun", "/absolute/path/to/adapter.ts"],
  "output": "/absolute/path/to/results/run.json"
}
```

O adapter recebe um JSON em stdin e deve responder com um JSON em stdout; logs vão para stderr. Ele chama o harness real, com suas ferramentas e memória. Não há chamada direta a LLM ou adapter específico do Capi incluído. O runner fornece dados e recolhe entregas; o adapter é responsável por honrar o modelo declarado e isolar serviços externos. O mesmo modelo, parâmetros, orçamento e versão do dataset devem ser usados na comparação entre harnesses.

Há um limite de cinco minutos por processo do adapter. Falhas de processo, protocolo ou tempo encerram com código diferente de zero e devem entrar no denominador do experimento. A versão inicial não persiste relatório estruturado quando o adapter falha antes de responder: preserve stderr e o código de saída. O runner limpa seu diretório temporário mesmo em falha. Ele não é um sandbox contra um adapter hostil: para publicação de resultados, isole-o em container sem acesso a `cases/`, avaliadores ou gabaritos, e registre a política de rede e ferramentas.

O resultado da execução contém `submission` e `report`. Para revisão ou avaliação posterior, salve o objeto `submission` em um arquivo e passe esse arquivo a `bun run evaluate`. Tempo observado é registrado. Tokens, custo, chamadas de ferramentas e uso de memória não são inventados nem preenchidos com zero; a integração deve fornecê-los a partir do trace real.

## Dataset e provenance

`benchmark.json` e `cases/` são a fonte versionada. `bun run export` produz JSONL no formato nativo dos itens de dataset PostHog: `client_item_id`, `input`, `expected_output`, `metadata`. Os IDs são estáveis por versão, e `fixture_sha256` identifica o conteúdo carregado. PostHog mantém a cópia de avaliação; a publicação foi conferida por leitura da API. Veja [o registro](docs/posthog.md).

Nunca envie `expected_output`, `expected`, `rubric` privada, respostas de controle ou resultados de revisão ao agente. O runner entrega apenas o input público. Não edite o dataset remoto e o repositório independentemente: publique nova versão após revisão da fonte.

## Limitações e contribuição

Esta é uma suíte inicial pública, com casos sintéticos escritos para desenvolvimento e ainda sem revisão jurídica independente. Não demonstra aptidão profissional nem representa clientes reais. Não há resultados de agentes publicados. Testes do avaliador usam respostas de controle; não são resultados de LLMs.

As primeiras execuções devem ser baselines de desenvolvimento. Repita cada caso com estado novo, inclua falhas e publique resultados por caso, não apenas uma média. A amostra é pequena e pública: mantenha casos novos/privados para avaliar generalização. Contribuições precisam trazer cenário, fontes, resultado verificável, falhas esperadas, limites e revisão; mudar gabaritos requer nova versão do benchmark.

## Protocolo de sessões e avaliação

Cada processo recebe apenas `sessionId`, `matter`, `message`, `documents`, `questions` da sessão atual e `memoryDirectory`. Nas duas primeiras sessões, registre/corrija/esqueça memória e retorne `answers: []`. Na última, responda às perguntas usando a memória. O adapter deve iniciar contexto conversacional novo em cada sessão, sem recuperar automaticamente o transcript completo de um serviço externo.

```json
{"sessionId":"S3","answers":[{"id":"question_id","value":"canonical value or null","citations":[{"documentId":"S2-D1","quote":"Literal source excerpt preserved in memory"}]}]}
```

O runner reúne as respostas em `{caseId, sessions: [...]}`. A avaliação exige todas as sessões em ordem, valores corretos, nenhuma resposta extra e fontes válidas disponíveis até aquele momento. As perguntas definem a representação esperada. Para abstinência, use JSON `null` e lista de citações vazia. A fonte correta e seu trecho precisam ser preservados na memória, não apenas o valor.

O export do dataset contém as sessões para o orquestrador. **Não entregar todas as sessões ao agente de uma vez.** Isso transforma memória em leitura de contexto e invalida a comparação. Casos começam com memória vazia e nunca compartilham diretórios.

Os checks verificam respostas observáveis: correção, isolamento, esquecimento na resposta, autorização vigente, distinção entre hipótese e prova e referência temporal. Não inspecionam o mecanismo de memória nem demonstram apagamento físico, isolamento do armazenamento de produção ou ausência de vazamento em outros canais. Para certificar esses comportamentos, são necessários testes de integração do harness.

O modelo declarado fica fixo entre configurações. Compare estratégias de memória com a mesma capacidade disponível e registre qualquer limite de armazenamento ou resumo. Os casos são curtos e adequados a regressões básicas; não medem retenção após milhares de interações. Referência: [LongMemEval](https://github.com/xiaowu0162/LongMemEval). O dataset aqui é original e jurídico, não uma tradução daquele benchmark.

## Minutei local

No checkout do Minutei com o adapter local, mantenha `bun run bench:serve` em outro terminal e execute:

```sh
bun run bench:run /caminho/legal-memory-bench M01 /tmp/M01.json
```

O adapter usa login de desenvolvimento, um escritório isolado, documentos e notas reais, ferramentas e streaming do Capi. A inferência continua usando o provedor configurado do Minutei. Em memória, cada sessão usa uma conversa nova, sem reenvio do histórico. Consulte `docs/legal-benchmarks-local.md` no Minutei para configuração e limites.

`AgentConfig.timeoutMs` define o limite por subprocesso, entre 1.000 e 3.600.000 ms; o padrão é 300.000 ms. O Minutei usa 1.800.000 ms para incluir uploads e inferência. Uma saída não zero preserva o diagnóstico do adapter em stderr.
