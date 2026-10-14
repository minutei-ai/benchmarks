# legal-longcase-bench

Dossiês jurídicos extensos com evidências dispersas, contradições e documentos de outros contratos.

Benchmark independente do Minutei. **Versão 0.1.0: casos e avaliadores executáveis; integração Capi e execuções de agentes ainda pendentes.**

Três acervos sintéticos distribuídos em arquivos JSONL. Contrato, pagamento, declaração inicial, auditoria, aditivo e instrução do cliente aparecem em posições distintas, entre documentos de outros contratos. O runner entrega o caminho do acervo para o agente pesquisar com suas ferramentas, sem injetar o arquivo inteiro no prompt.

| Caso | Documentos | Caracteres nos corpos | Bytes UTF-8 nos corpos |
| --- | ---: | ---: | ---: |
| C01 | 128 | 579,461 | 599,600 |
| C02 | 512 | 2,315,449 | 2,395,876 |
| C03 | 1,024 | 4,629,639 | 4,790,450 |

Essas são contagens medidas dos arquivos, não estimativas de tokens. Os distratores foram gerados por templates de registros operacionais; os três casos compartilham a estrutura de reconciliação. O tamanho não equivale a diversidade jurídica. Esta versão mede pesquisa e síntese em acervo extenso; não força compactação de conversa nem comprova uso de toda a janela de contexto.

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
  "caseId": "C01",
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

## Avaliação de entregas

O adapter retorna:

```json
{
  "caseId": "C01",
  "answers": [{"id": "question_id", "value": "canonical answer or null", "citations": [{"documentId": "source-id", "quote": "literal supporting excerpt"}]}],
  "artifacts": [{"id": "deliverable_id", "body": "Full work product"}]
}
```

Cada pergunta especifica a representação: valores monetários em centavos, datas ISO e escolhas textuais. Resposta desconhecida usa JSON `null`, sem citações. Cada resposta conhecida precisa de trechos literais de pelo menos 12 caracteres e de todas as fontes exigidas para o cálculo ou conclusão. IDs duplicados, omissões, valores errados e citações inexistentes falham. Todas as entregas exigidas devem existir e atingir o mínimo de palavras indicado.

Esses checks só validam fatos estruturados, citações literais e presença das entregas. Não provam que a citação sustenta toda a argumentação nem que o texto é bom. Sem revisão, o resultado é `awaiting_review` e `passed: false` mesmo quando todos os checks automáticos passam.

Um revisor independente avalia cada critério em `cases/<id>.json`: 0 = não atendido, 1 = parcialmente atendido, 2 = atendido. Critérios críticos exigem 2; demais exigem pelo menos 1; total mínimo de 80%. Identifique o revisor, justifique notas e aponte trechos das entregas. A revisão fica vinculada ao SHA-256 de respostas e artefatos por `submissionDigest`, impresso pelo avaliador. Alterar a submissão invalida a revisão.

Acrescente à submissão:

```json
{
  "review": {
    "reviewer": "reviewer-identity-and-role",
    "submissionDigest": "digest-produced-by-evaluate",
    "criteria": [{"id": "R1", "score": 2, "reason": "Specific assessment", "evidence": [{"artifactId": "deliverable_id", "quote": "Literal work-product excerpt"}]}]
  }
}
```

Forneça todos os critérios. A CLI valida completude, referência dos trechos e vínculo ao conteúdo. Ela não autentica o revisor ou comprova sua qualificação; a organização do experimento deve garantir independência e competência. `passed_with_recorded_review` significa aprovação com revisão registrada, não certificação jurídica automática. O runner rejeita revisões enviadas pelo próprio adapter.

## Distribuição dos acervos

`fixtures/C01.jsonl`, `fixtures/C02.jsonl` e `fixtures/C03.jsonl` estão no Git. O PostHog recebe a tarefa, caminho, tamanho e hash do caso carregado; não replica megabytes de acervo em cada item. Use o commit registrado no metadata do dataset para baixar o arquivo correspondente. O hash de `fixture_sha256` cobre o objeto de caso decodificado com os documentos carregados, conforme `src/export.ts`; não é o hash bruto do JSONL.

Cada caso exige um memorando e mapa de evidências, além de oito respostas estruturadas. A checagem distingue valor nominal de unidades pendentes de saldo exigível ou indenização, sem estabelecer direito a uma quantia. Citações precisam apontar para documentos específicos do contrato correto.

Para comparar efeitos do tamanho isoladamente, será necessário gerar versões pareadas do MESMO caso com acervos de tamanhos distintos e evidências idênticas. Os três casos atuais variam números e contratos e não sustentam, sozinhos, uma curva causal de degradação por contexto. A próxima ampliação deve acrescentar documentos menos uniformes e famílias jurídicas diferentes.

## Minutei local

No checkout do Minutei com o adapter local, mantenha `bun run bench:serve` em outro terminal e execute:

```sh
bun run bench:run /caminho/legal-longcase-bench C01 /tmp/C01.json
```

O adapter usa login de desenvolvimento, um escritório isolado, documentos e notas reais, ferramentas e streaming do Capi. A inferência continua usando o provedor configurado do Minutei. Em memória, cada sessão usa uma conversa nova, sem reenvio do histórico. Consulte `docs/legal-benchmarks-local.md` no Minutei para configuração e limites.

`AgentConfig.timeoutMs` define o limite por subprocesso, entre 1.000 e 3.600.000 ms; o padrão é 300.000 ms. O Minutei usa 1.800.000 ms para incluir uploads e inferência. Uma saída não zero preserva o diagnóstico do adapter em stderr.
