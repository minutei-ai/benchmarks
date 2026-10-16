# Legal Longcase Bench

Pesquisa e síntese em dossiês jurídicos extensos com evidências dispersas, contradições e distratores. **Revisão 0.2.0, seis casos sintéticos.** O runner fornece o caminho do acervo para o harness pesquisar com suas ferramentas; não injeta o arquivo inteiro no prompt.

| Caso | Documentos | Desenho                                 |
| ---- | ---------: | --------------------------------------- |
| C01  |        128 | Contrato e fatos próprios               |
| C02  |        512 | Contrato e fatos próprios               |
| C03  |      1.024 | Contrato e fatos próprios               |
| C04  |        128 | Grupo pareado H-220                     |
| C05  |        512 | Mesmo grupo, com distratores adicionais |
| C06  |      1.024 | Mesmo grupo, com distratores adicionais |

C04/C05/C06 têm os mesmos fatos, fontes, instrução e rubrica. Os arquivos são prefixos uns dos outros: mudar o tamanho acrescenta distratores sem mudar a tarefa. `comparisonGroup` registra o pareamento. C01/C02/C03 variam fatos e contratos; seus tamanhos não isolam efeito de contexto. As contagens exatas de caracteres e bytes estão nos arquivos de caso e são verificadas pelo validator. Tamanho não equivale a diversidade jurídica ou estimativa de tokens.

## Executar

Instale na raiz com `bun install --frozen-lockfile` e configure:

```json
{
  "caseId": "C04",
  "model": "exact-provider-model-and-parameters",
  "harness": "harness-sha-and-prompt-hash",
  "command": ["bun", "/absolute/path/to/adapter.ts"],
  "output": "/absolute/path/to/result.json",
  "timeoutMs": 300000
}
```

```sh
bun run --cwd benchmarks/legal-longcase-bench run:agent /absolute/path/to/config.json
```

O adapter recebe instrução, perguntas, entregas e `documentsFile` por stdin. Usa o loop real do harness para pesquisar, raciocinar e produzir respostas e artefatos. Gabaritos e rubrica privada não entram no payload. Resposta JSON:

```json
{
  "caseId": "C04",
  "answers": [
    {
      "id": "question-id",
      "value": "canonical-value-or-null",
      "citations": [{ "documentId": "source-id", "quote": "Literal supporting excerpt" }]
    }
  ],
  "artifacts": [
    { "id": "memorandum", "body": "Complete work product" },
    { "id": "evidence_map", "body": "Evidence and contradiction map" }
  ]
}
```

Os fatos exigem fontes do contrato correto. Valor nominal pendente não equivale a saldo exigível ou indenização. Use `null` e citações vazias para o prazo judicial não determinável. Fontes de outros fatos, citações inventadas, duplicações, omissões e entregas ausentes falham.

Timeout padrão de cinco minutos, ajustável entre 1 segundo e 1 hora por subprocesso. Falhas e saídas acima de 2 MiB são registradas com `execution_failed`; stderr fica em `<resultado>.stderr.log`, e a limpeza remove o acervo temporário.

## Avaliação e provenance

Checks factuais e tamanho mínimo não comprovam qualidade da peça. Aprovação exige revisão independente com nota 2 em todos os critérios, evidência da entrega no escopo, `submissionDigest` e `caseDigest` válidos. Veja [o procedimento de revisão](../../docs/review.md) e [a metodologia](../../docs/methodology.md).

```sh
bun run --cwd benchmarks/legal-longcase-bench evaluate /absolute/path/to/submission.json
```

`cases/` e `fixtures/*.jsonl` são a fonte versionada. O export inclui caminho da fixture relativo à raiz deste repositório e `comparisonGroup`; não replica todo o acervo no item PostHog. `fixture_sha256` identifica o caso canônico com documentos e rubrica, não o arquivo JSONL isolado. [O registro PostHog](docs/posthog.md) é histórico de 0.1.x; o export 0.2.0 não foi espelhado remotamente.

No checkout do Minutei com `bench:serve` ativo:

```sh
bun run bench:run /caminho/benchmarks/benchmarks/legal-longcase-bench C04 /tmp/C04.json
```

O protocolo permanece compatível com o adapter local. O dataset não força compactação de conversa, não prova uso de toda a janela de contexto e não representa variedade suficiente para um ranking geral. Os testes desta revisão não executam modelos ou Capi.
