# Avaliação de harnesses jurídicos

A unidade é o sistema que executa a tarefa: prompts, planejamento, ferramentas, recuperação de documentos, memória, coordenação e persistência. Para atribuir uma diferença ao harness, mantenha modelo, snapshot, parâmetros, ferramentas disponíveis, limites e revisão dos casos constantes. O nome de modelo no manifesto é declarativo; o adapter precisa comprovar a configuração real pelo trace do provedor.

## Referências e escolhas

- [Harvey LAB](https://github.com/harveyai/harvey-labs/blob/main/docs/eval-strategies.md): trabalho entregue, rubricas por critério e aprovação somente quando todos passam. Aqui a revisão semântica é independente e registrada; não há juiz LLM implementado.
- [τ-bench](https://github.com/sierra-research/tau2-bench/blob/main/docs/leaderboard-submission.md): estado observável, políticas, configuração consistente e múltiplas tentativas. Aqui a família OAB observa as ferramentas e gravações do ambiente do benchmark.
- [Harbor](https://www.harborframework.com/docs/tasks): separação entre instrução, ambiente, verificador e tentativas isoladas. O subprocesso local deste projeto não fornece o sandbox de segurança do Harbor.
- [LongMemEval](https://github.com/xiaowu0162/LongMemEval): atualização de conhecimento, raciocínio temporal, isolamento de contexto e abstinência. A família de memória inicia processos novos e entrega somente a sessão atual.

Estas são referências de desenho. Não há certificação, integração de execução com esses projetos ou equivalência de cobertura. Os casos do Minutei são sintéticos e não foram copiados desses datasets.

## O que cada família comprova

| Família      | Observação do avaliador                                                                  | Condição de aprovação                                               | Limitação                                                          |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| OAB          | Chamadas ao ambiente, leitura anterior à escrita, minuta persistida, recibos e releitura | Todos os checks do estado e do protocolo                            | Não avalia qualidade jurídica do texto                             |
| Tarefas      | Respostas estruturadas e entregas devolvidas pelo harness                                | Todos os checks factuais e todos os critérios da revisão com nota 2 | Não observa diretamente ferramentas ou storage externos do harness |
| Memória      | Respostas de sessões novas após persistência entre subprocessos                          | Todas as sessões, fatos e citações corretos, na ordem               | Não comprova apagamento físico nem isolamento do backend externo   |
| Casos longos | Pesquisa em acervo entregue por arquivo, respostas e entregas                            | Mesma política de tarefas                                           | Não comprova compactação ou uso de toda a janela de contexto       |

Tarefas e casos longos separam `automaticPassed` de `passed`: fatos e tamanho mínimo podem passar, enquanto a tarefa continua `awaiting_review`. Contar palavras é um gate de presença, não uma medida de qualidade. Uma citação literal comprova a existência do trecho; a sustentação jurídica e a relação entre trecho e argumento pertencem à revisão.

## Rubricas e revisão

Cada critério identifica as entregas às quais se aplica e as fontes relevantes. O revisor pontua 0, 1 ou 2 e registra justificativa e trechos da entrega. Aprovação exige nota 2 em todos os critérios. A evidência da revisão precisa vir de uma entrega no escopo do critério.

A revisão fica vinculada a dois hashes: `submissionDigest` cobre respostas e artefatos; `caseDigest` cobre instrução, documentos, fatos esperados, entregas e rubrica. Alterar a submissão ou o caso invalida o vínculo. O registro não autentica o revisor nem comprova sua competência: o organizador do experimento garante independência e qualificação. O próprio adapter não pode fornecer revisão.

## Tentativas e comparação

Use `bun run experiment /absolute/path/to/config.json` para percorrer as quatro famílias, sem seleção da melhor tentativa. Cada caso recebe o número de repetições configurado, com ambiente novo. Casos de memória compartilham estado apenas entre sessões daquele caso e daquela tentativa. Falhas de processo, protocolo e timeout continuam no denominador.

`experiment.json` registra a quantidade esperada de tentativas antes de começar. `trials.jsonl` recebe cada tentativa concluída por append; o manifesto completo é publicado por rename ao finalizar, evitando reescrever toda a coleção a cada passo. Interrupção mantém os registros já concluídos no ledger; `summary: null` significa experimento incompleto. O diretório de saída precisa ser novo e sua criação exclusiva impede duas execuções de compartilhar o mesmo destino. Diagnósticos no índice são limitados a 8 KiB; os relatórios e logs individuais preservam o diagnóstico completo. Uma morte forçada do runner pode impedir o relatório da tentativa em curso e a limpeza de diretórios temporários.

O resumo apresenta métricas por caso, sem uma nota média que misture famílias. `passPower1` é a fração de tentativas aprovadas. `passPower2` e `passPower4` estimam a chance de duas ou quatro tentativas escolhidas sem reposição passarem todas: C(sucessos, k) / C(tentativas, k). São consistência, não a chance de escolher a melhor resposta. Repetições insuficientes produzem `null`. Para comparação publicada, execute pelo menos quatro repetições e inclua todos os casos.

`awaiting_review` permanece separado de sucesso e de falha de execução. O resumo inicial é um snapshot das execuções; adicionar uma revisão depois não altera retroativamente o manifesto. Use a CLI de avaliação para registrar a análise independente da submissão.

Não compare modelos ou revisões diferentes como efeito do harness. O resumo rejeita configurações misturadas, tentativas duplicadas e revisões diferentes da mesma fixture. Tempos são observados; tokens e custo precisam de telemetria real, incluindo especialistas e tentativas. Ausência de telemetria não equivale a zero.

## Acervos pareados

C04, C05 e C06 usam o mesmo contrato H-220, instrução, fatos, evidências e rubrica. Os acervos são prefixos de 128, 512 e 1.024 documentos; documentos acrescentados são distratores. Isso permite estudar a adição de documentos mantendo a tarefa fixa. Não separa efeitos de posicionamento de evidências ou diversidade dos distratores, e três tamanhos de um só contrato não sustentam um ranking jurídico geral.

C01, C02 e C03 continuam como casos distintos. Não use seus tamanhos para inferir uma curva causal, porque os fatos e contratos também variam.

## Separação e provenance

O adapter recebe somente o input público. Gabaritos, rubricas, expectativas futuras de memória e código do avaliador ficam fora do contexto do agente. Para resultados publicáveis, isole o adapter do checkout e das credenciais do avaliador; registre política de rede, ferramentas, memória e fontes. A instalação local permite regressões e desenvolvimento, mas não é resistente a um participante que leia os gabaritos no disco.

A revisão 0.2.0 muda protocolo OAB, rubricas e vínculos de revisão. Resultados 0.1.x e 0.2.0 não são intercambiáveis. Os exports recebem novos IDs versionados. Os registros PostHog de 0.1.x são históricos; esta mudança não publica novos datasets nem resultados remotos.

Antes de anunciar qualidade do Capi ou comparar fornecedores, ainda é necessário executar seus adapters reais, revisar as peças, calibrar critérios com revisores independentes e ampliar a diversidade com casos novos ou privados. Os testes de controle deste repositório validam o benchmark, não constituem resultados de modelos.
