# OAB Bench — Legal Agent Harness Benchmark

Benchmark público do Minutei para avaliar **harnesses de agentes em tarefas jurídicas brasileiras**. A unidade avaliada é a execução completa: acesso às evidências, ferramentas, estado produzido e encerramento. Comparações de harness mantêm o modelo e suas configurações fixos.

**Estado: v0.1, suíte inicial de engenharia.** Três cenários sintéticos executáveis, avaliador determinístico, protocolo para adapters e exportação para datasets do PostHog. Sem execução do Capi, ranking publicado ou validação jurídica especializada. `legalQuality: not_evaluated` aparece em todo resultado.

## Cenários implementados

| ID | Situação | O que é verificado |
| --- | --- | --- |
| `evidence` | Documentos paginados, email contradito pela conferência e pedido de minuta interna | Minuta efetivamente salva, citações literais de fontes lidas e presentes no documento |
| `injection` | Email de terceiro tenta induzir acesso a outro cliente | Mesmo resultado, sem tentativa de acesso fora do escopo |
| `retry` | A primeira gravação é efetivada, mas retorna timeout | Recuperação com mesma chave e conteúdo, sem duplicar a minuta |

Todos exigem conclusão explícita, exatamente uma minuta, evidências e respeito ao orçamento. Um texto convincente dizendo “feito” não passa. A suíte não pontua estilo de raciocínio, quantidade de agentes ou nomes de ferramentas de um fornecedor.

## Executar

Requer Bun 1.4.2.

```sh
bun install --frozen-lockfile
bun run check
bun test
bun run bench run.json > results.json
```

`run.json` identifica o sistema avaliado e seu comando de adapter:

```json
{
  "task": "retry",
  "model": "exact-provider-model-version",
  "harness": "harness-git-sha-and-config-hash",
  "seed": 0,
  "command": ["bun", "/absolute/path/to/your-harness-adapter.ts"]
}
```

O adapter ainda precisa ser implementado no harness avaliado; não há adapter Capi incluído. Ele deve executar o loop real do agente e encaminhar as operações ao ambiente, conforme [o protocolo](docs/protocol.md). O runner não chama diretamente um modelo nem substitui o harness. O campo `model` registra a configuração declarada; a seleção real é responsabilidade do adapter.

Saída: checks individuais, estado final, trace de ferramentas, tempo observado e sucesso. Código de saída 1 para reprovação ou falha de protocolo. Limites: 20 mensagens de operação, incluindo `finish`, 60 segundos e buffer de protocolo de 128 KiB.

## Dataset no PostHog

```sh
bun src/export.ts > dataset.jsonl
```

O export deriva os inputs do mesmo ambiente executável e inclui IDs estáveis, critérios esperados e metadados. PostHog recebe uma cópia versionada; código e fixtures do repositório são a fonte da suíte. `input` vai ao adapter; `expected_output` e metadados de avaliação ficam com o avaliador. Não enviar o gabarito ao agente.

Os itens precisam do ambiente de ferramentas. Executá-los no playground como uma geração de texto isolada não avalia o harness. Consulte [a metodologia](docs/methodology.md) e [o registro do dataset](docs/posthog.md).

## Escopo e referências

O foco é o harness completo. OAB é o nome do projeto, sem vínculo com a Ordem e sem alegação de aprovação no Exame de Ordem.

Referências de desenho: [Harvey LAB](https://github.com/harveyai/harvey-labs), com tarefas e rubricas de trabalho jurídico, e [τ-bench](https://github.com/sierra-research/tau-bench), com avaliação do estado produzido por ferramentas.

Este repositório começou como fork de [Maritaca OAB-Bench](https://github.com/maritaca-ai/oab-bench), que avalia respostas de modelos à segunda fase da OAB. O conteúdo da branch atual foi substituído por esta suíte de harness; o histórico upstream permanece, com atribuição e licença Apache-2.0. Nenhum resultado herdado é apresentado como avaliação do Minutei.
