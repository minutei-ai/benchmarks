# Minutei Benchmarks

As quatro suítes públicas de benchmarks do Minutei em um único repositório. Cada família mantém seus casos, contratos, avaliadores, versões e protocolo; a comparação continua sendo por suíte, sem uma pontuação agregada entre famílias.

| Suíte | Escopo | Casos | Documentação |
| --- | --- | ---: | --- |
| OAB | Execução de ferramentas, evidências, isolamento e recuperação | 3 | [oab-bench](benchmarks/oab-bench/README.md) |
| Tarefas | Entregas jurídicas completas e revisão independente | 6 | [legal-task-bench](benchmarks/legal-task-bench/README.md) |
| Memória | Correção, isolamento, esquecimento e autorização entre sessões | 6 | [legal-memory-bench](benchmarks/legal-memory-bench/README.md) |
| Casos longos | Pesquisa e síntese em acervos de 128, 512 e 1.024 documentos | 3 | [legal-longcase-bench](benchmarks/legal-longcase-bench/README.md) |

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

Há um workspace Bun por suíte, uma instalação, um lockfile e um workflow de CI. Os testes são executados no diretório de cada suíte, como seus runners exigem. Os checks não chamam provedores de IA.

## Executar uma suíte

```sh
bun run --cwd benchmarks/oab-bench bench /absolute/path/to/run.json
bun run --cwd benchmarks/legal-task-bench run:agent /absolute/path/to/config.json
bun run --cwd benchmarks/legal-memory-bench run:agent /absolute/path/to/config.json
bun run --cwd benchmarks/legal-longcase-bench run:agent /absolute/path/to/config.json
```

Use caminhos absolutos para configuração e resultados. Cada README descreve o formato do adapter e da submissão. Para avaliar uma submissão ou exportar uma única família:

```sh
bun run --cwd benchmarks/legal-task-bench evaluate /absolute/path/to/submission.json
bun run --silent --cwd benchmarks/legal-task-bench export > dataset.jsonl
```

No checkout do Minutei com `bench:serve` ativo, o adapter existente recebe o diretório da família:

```sh
bun run bench:run /caminho/benchmarks/benchmarks/legal-task-bench T01 /tmp/T01.json
bun run bench:run /caminho/benchmarks/benchmarks/legal-memory-bench M01 /tmp/M01.json
bun run bench:run /caminho/benchmarks/benchmarks/legal-longcase-bench C01 /tmp/C01.json
```

## Datasets e resultados

Os casos locais são a fonte canônica. Os IDs dos itens, versões, inputs, gabaritos e hashes das fixtures foram preservados. O export passa a apontar para este repositório e para o caminho da suíte. Os registros históricos de PostHog permanecem em `benchmarks/*/docs/posthog.md`; esta consolidação não altera os datasets remotos nem representa uma nova execução de agentes.

São casos sintéticos e avaliadores de engenharia. Checks verdes não comprovam qualidade do Capi, aptidão profissional ou revisão jurídica independente. Gabaritos e rubricas privadas ficam fora do contexto do agente. Veja as limitações e requisitos de revisão em cada suíte.

## Histórico e licenças

Os quatro históricos Git foram incorporados sem squash nem reescrita. Os commits de origem continuam acessíveis; o conteúdo atual de cada um foi importado sob `benchmarks/<suíte>`. Em commits anteriores à importação, os arquivos ainda usam os caminhos originais.

| Origem | Commit importado | Licença da suíte |
| --- | --- | --- |
| `oab-bench` | `0e7a82f96adb5b559c8b5643e0cfff8ed16ed580` | `Apache-2.0` |
| `legal-task-bench` | `bd27c1546b2cadd8053c050dea3980544831c4db` | `MIT` |
| `legal-memory-bench` | `a8ec047b5fb180096485a4decfb5b532990b9104` | `MIT` |
| `legal-longcase-bench` | `bc9d220a4232263c5ec07cd3fe8d88008180d54a` | `MIT` |

Os arquivos `LICENSE` de cada suíte permanecem em seus diretórios. O histórico do OAB inclui seu upstream Maritaca, com atribuição e licença Apache-2.0 preservadas. Resultados herdados não são apresentados como avaliações do Minutei. Os antigos repositórios ficam arquivados e apontam para este como local de manutenção.
