# Minutei Benchmarks

Benchmarks para harnesses de agentes jurídicos brasileiros: ferramentas, evidências, entregas, memória e recuperação de falhas. O modelo fica fixo na comparação entre configurações de harness.

**Revisão 0.2.0: 28 casos sintéticos, verificadores e runners executáveis.** Os testes validam a engenharia do benchmark. Não há ranking de fornecedores, execução de modelos publicada ou revisão jurídica independente dos casos.

| Suíte        | Capacidade                                                                                    | Casos | Documentação                                                      |
| ------------ | --------------------------------------------------------------------------------------------- | ----: | ----------------------------------------------------------------- |
| OAB          | Estado de ferramentas, recibos, releitura, autorização, informação ausente e fontes revisadas |     6 | [oab-bench](benchmarks/oab-bench/README.md)                       |
| Tarefas      | Entregas jurídicas completas, versões, mandato e revisão por critério                         |     8 | [legal-task-bench](benchmarks/legal-task-bench/README.md)         |
| Memória      | Correção, isolamento, esquecimento, revogação e continuidade até 24 sessões                   |     8 | [legal-memory-bench](benchmarks/legal-memory-bench/README.md)     |
| Casos longos | Evidências dispersas e acervos pareados de 128, 512 e 1.024 documentos                        |     6 | [legal-longcase-bench](benchmarks/legal-longcase-bench/README.md) |

Veja [a metodologia](docs/methodology.md) para condições de comparação e limites de cada família. Uma resposta dizendo “feito” não substitui o estado produzido. Fatos corretos e contagem de palavras não substituem revisão jurídica.

## Instalar e verificar

Requer Bun 1.4.2 ou compatível. Execute na raiz:

```sh
git clone https://github.com/minutei-ai/benchmarks.git
cd benchmarks
bun install --frozen-lockfile
bun run check
bun run validate
bun run test
bun run --silent export > dataset.jsonl
```

Uma instalação, um lockfile e uma CI verificam as quatro suítes e o código compartilhado de execução e avaliação. Os testes de subprocessos identificam explicitamente seu diretório de trabalho e também funcionam a partir da raiz. Os checks locais não chamam provedores de IA.

## Executar um experimento

Cada família usa um adapter do harness avaliado. OAB usa ferramentas em JSONL; as demais usam o protocolo de submissão JSON descrito em seus READMEs. O adapter traduz transporte e preserva o loop real do harness; não resolve a tarefa no lugar do agente.

Crie `experiment-config.json` fora do checkout:

```json
{
  "model": "provider/exact-model-snapshot-and-parameters",
  "harness": "harness-git-sha-and-prompt-config-hash",
  "trials": 4,
  "timeoutMs": 300000,
  "outputDirectory": "/absolute/path/to/results/experiment-001",
  "commands": {
    "oab-bench": ["bun", "/absolute/path/to/oab-adapter.ts"],
    "legal-task-bench": ["bun", "/absolute/path/to/task-adapter.ts"],
    "legal-memory-bench": ["bun", "/absolute/path/to/memory-adapter.ts"],
    "legal-longcase-bench": ["bun", "/absolute/path/to/longcase-adapter.ts"]
  }
}
```

```sh
bun run experiment /absolute/path/to/experiment-config.json
```

O runner executa todos os casos e repetições em sequência, registra falhas e preserva os resultados concluídos. O manifesto é criado antes da execução; `trials.jsonl` registra cada tentativa e o manifesto completo é publicado ao finalizar. O diretório de saída precisa ser novo; pais existentes são permitidos. O resumo apresenta consistência por caso (`passPower1`, `passPower2`, `passPower4`), revisão pendente e falhas de execução; não calcula uma nota jurídica única entre famílias. Código de saída 1 significa que nem todas as tentativas foram aprovadas, inclusive quando há revisão independente pendente.

OAB mantém seu orçamento de 20 operações e 60 segundos. Nas demais famílias, `timeoutMs` é por subprocesso/sessão e aceita de 1 segundo a 1 hora. O orquestrador limita cada tentativa completa a 1 hora. Os resultados guardam a configuração e o hash da fixture. Stderr e resultados parciais permanecem no diretório de saída.

## Executar uma suíte

```sh
bun run --cwd benchmarks/oab-bench bench /absolute/path/to/run.json
bun run --cwd benchmarks/legal-task-bench run:agent /absolute/path/to/config.json
bun run --cwd benchmarks/legal-memory-bench run:agent /absolute/path/to/config.json
bun run --cwd benchmarks/legal-longcase-bench run:agent /absolute/path/to/config.json
```

Para avaliar uma submissão ou exportar uma família:

```sh
bun run --cwd benchmarks/legal-task-bench evaluate /absolute/path/to/submission.json
bun run --silent --cwd benchmarks/legal-task-bench export > dataset.jsonl
```

Use caminhos absolutos para adapters, configuração e resultados.

## Capi local

No checkout do Minutei com o adapter existente e `bench:serve` ativo, passe o diretório da família:

```sh
bun run bench:run /caminho/benchmarks/benchmarks/legal-task-bench T01 /tmp/T01.json
bun run bench:run /caminho/benchmarks/benchmarks/legal-memory-bench M01 /tmp/M01.json
bun run bench:run /caminho/benchmarks/benchmarks/legal-longcase-bench C01 /tmp/C01.json
```

O protocolo público dessas três famílias permanece compatível com o adapter local. OAB 0.2.0 exige as novas operações e campos descritos em seu protocolo; não há adapter Capi OAB incluído. A execução real com Capi e provedores não faz parte dos testes de controle deste repositório.

## Datasets e revisão

Os casos locais são a fonte canônica. O export contém `input`, `expected_output` e metadados versionados; o agente recebe somente o input. Sessões de memória são entregues uma por vez. Os registros em `benchmarks/*/docs/posthog.md` documentam as publicações históricas de 0.1.x. O dataset 0.2.0 ainda não foi espelhado no PostHog.

Tarefas e casos longos exigem revisão independente: todos os critérios precisam de nota 2 e evidência no artefato correspondente. A revisão é vinculada ao hash da submissão e do caso. Mudanças de caso ou submissão invalidam o vínculo. Consulte [a metodologia](docs/methodology.md) antes de interpretar resultados.

## Histórico e licenças

Os quatro históricos Git foram incorporados sem squash nem reescrita. Os repositórios separados foram removidos em 14/10/2026; seus últimos estados permanecem nas tags `<suíte>/final-main`, e as branches nas tags `<suíte>/branches/<branch>`. Em commits anteriores à consolidação, os arquivos mantêm os caminhos originais.

| Origem               | Commit importado                           | Licença    |
| -------------------- | ------------------------------------------ | ---------- |
| oab-bench            | `0e7a82f96adb5b559c8b5643e0cfff8ed16ed580` | Apache-2.0 |
| legal-task-bench     | `bd27c1546b2cadd8053c050dea3980544831c4db` | MIT        |
| legal-memory-bench   | `a8ec047b5fb180096485a4decfb5b532990b9104` | MIT        |
| legal-longcase-bench | `bc9d220a4232263c5ec07cd3fe8d88008180d54a` | MIT        |

As licenças permanecem nos diretórios das suítes; execução e avaliação compartilhadas usam MIT. O histórico OAB inclui o upstream Maritaca com atribuição Apache-2.0 preservada. Resultados herdados não são avaliações do Minutei.
