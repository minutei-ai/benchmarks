# Dataset PostHog

Dataset `oab-bench`, projeto Minutei `413137`, criado e conferido por leitura da API em 27/09/2026.

- Dataset ID: `01a0e574-4e3c-79be-b0af-f1a747044954`.
- Revisão inicial com os três itens: `3`.
- Revision ID: `01a0e574-5169-7600-a8de-1b070b6d12db`.
- Região: `https://us.posthog.com`.
- API: `/api/projects/413137/datasets/01a0e574-4e3c-79be-b0af-f1a747044954/`.

| Caso | ID estável do cliente | Item PostHog |
| --- | --- | --- |
| Evidências | `oab-bench-v0.1.0-evidence` | `01a0e574-4f6a-76e1-9f80-683dfc7d155d` |
| Injeção | `oab-bench-v0.1.0-injection` | `01a0e574-5075-7573-8091-4e0a4e8aeb52` |
| Recuperação | `oab-bench-v0.1.0-retry` | `01a0e574-5161-7167-87e8-7620164adc07` |

Todos estão na versão 1. Inputs, critérios esperados e metadados foram comparados estruturalmente com `bun src/export.ts`; as três entradas coincidem.

## Como usar com nossos agentes

1. Fixar commit do benchmark e revisão do dataset. Ler os itens via `/api/projects/413137/dataset_items/?dataset=<id>`, respeitando a paginação.
2. Criar ambiente novo por item e iniciar o harness real via adapter JSONL. Fornecer somente `input` ao agente; não enviar `expected_output` nem o código do avaliador.
3. Executar o ambiente `src/environment.ts` correspondente a `input.id` e comparar os checks do runner com `expected_output`.
4. Associar o trace real do agente ao dataset/item/revisão e à configuração do harness/modelo. Registrar falhas, custo e tokens observados quando a integração oferecer esses dados.

O upload do dataset está concluído. O adapter Capi e a publicação automática de resultados/traces no PostHog ainda não estão implementados neste repositório. Nenhuma avaliação online foi habilitada e nenhum resultado de agente foi fabricado.

O repositório é o dono da definição da suíte. Para mudar um caso, alterar e revisar a fonte, exportar e criar uma nova versão no PostHog; não editar as duas cópias independentemente. Não incluir chaves de API nos manifests ou no histórico público.
