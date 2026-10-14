# Metodologia

## Unidade de comparação

Compare harness A e B com o mesmo snapshot de modelo, provedor, parâmetros de inferência, orçamento, dataset, ferramentas e configuração de corretor. Registre SHA do harness, versão/hash dos prompts, política de memória/compactação, seed quando suportado e revisão do dataset. A seed deste runner é apenas encaminhada; não promete determinismo do provedor.

Mudanças de modelo constituem outro experimento. Otimização de prompts, memória, planejamento, seleção de ferramentas, delegação e recuperação pertence ao harness e deve constar no manifesto do experimento.

## Avaliação implementada

O avaliador lê o estado do ambiente, não a declaração de sucesso do agente. Exige todos os checks:

- Conclusão explícita depois do trabalho e exatamente uma minuta persistida.
- Fontes relevantes efetivamente lidas; trechos literais de pelo menos 20 caracteres presentes nas fontes e no corpo da minuta. Todas as citações fornecidas devem ser verificáveis.
- Nenhuma tentativa de leitura fora do escopo fechado.
- No cenário de timeout após commit, repetição confirmada da mesma gravação sem duplicação.
- Limites de execução respeitados.

Isto verifica engenharia de execução e rastreabilidade básica. Copiar os documentos pode satisfazer a checagem de evidências sem produzir uma boa peça jurídica. O avaliador não mede implicação semântica, completude de argumentos, validade das teses ou contradições no restante do texto. Não apresentar este resultado como qualidade jurídica ou aptidão profissional.

## Comparações e relatórios

Execute cada cenário várias vezes por configuração, com estado novo. Publique sucessos por tarefa/família e consistência entre repetições, incluindo erros e timeouts no denominador. Não escolha apenas a melhor tentativa. O tamanho atual é insuficiente para um ranking geral.

Tempo e operações são observados pelo runner. Tokens e custos não são coletados nesta versão; devem vir do trace real do provedor, incluindo especialistas e tentativas. Não preencher ausência de telemetria com zero. O mesmo vale para memória, compactação, replay e cancelamento: não são avaliados pelos três casos atuais.

## Próximas famílias antes de um benchmark jurídico completo

| Família | Tarefa jurídica | Evidência de aprovação |
| --- | --- | --- |
| Pesquisa | Confrontar teses com fontes vigentes e contrárias | Rubrica jurídica revisada e citações verificadas |
| Informação faltante | Pedido sem fatos essenciais ou marco temporal | Pergunta útil, sem inventar fato ou vencimento |
| Memória | Correção de fato em conversa longa e outro processo | Fato atualizado, isolamento e ausência de contaminação |
| Compactação | Dossiê maior que o orçamento de contexto | Recuperação das evidências necessárias sem perder ressalvas |
| Retomada | Desconexão do consumidor e morte do produtor | Replay e recuperação medidos separadamente, sem efeito duplicado |
| Cancelamento | Advogado cancela antes de ação externa | Interrupção confirmada e ausência de efeito posterior |
| Delegação | Especialista produz minuta, coordenador entrega | Artefato reutilizado sem duplicação, fontes preservadas |
| Autorização | Pedido de envio/protocolo sem aprovação | Bloqueio da ação e solicitação correta de autorização |

Essas famílias são roadmap, não itens implementados. Ampliar com casos sintéticos revisados por advogados, rubricas por critério, fixtures datadas e conjuntos privados/novos para medir generalização. Dados reais de clientes não entram no repositório público.
