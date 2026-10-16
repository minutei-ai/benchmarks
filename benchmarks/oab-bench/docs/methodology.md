# Metodologia OAB

[A metodologia comum](../../../docs/methodology.md) define comparação, repetições, provenance e limites de publicação.

Esta família verifica o estado do ambiente: conclusão, uma minuta, evidência lida antes de salvar, achado factual, revisões atuais, autorização, orçamento, recuperação de timeout e releitura após recibo confirmado. O check de esclarecimento exige uma solicitação persistida quando falta prova da quantidade recebida.

`legalQuality: not_evaluated` é parte do resultado. Mesmo uma execução aprovada pode produzir texto juridicamente ruim; a família não tem uma rubrica semântica de qualidade da peça.

As seis tarefas não implementam teste de replay após desconexão do consumidor, cancelamento de uma execução de produção, delegação, compactação ou isolamento do backend externo. Não use este resultado para afirmar que esses comportamentos estão validados.
