# Registrar uma revisão independente

Aplica-se às famílias de tarefas e casos longos. Execute o harness primeiro e preserve o arquivo de resultado. A submissão está em `submission`; salve esse objeto em um arquivo separado para a CLI `evaluate`.

```sh
bun run --cwd benchmarks/legal-task-bench evaluate /absolute/path/to/submission.json
```

O relatório imprime `submissionDigest`, `caseDigest`, checks factuais e presença das entregas. `awaiting_review` significa que os checks automáticos passaram e a revisão ainda não existe; não é aprovação jurídica.

O revisor recebe o caso canônico, suas fontes, as entregas e os critérios em `rubric`. Cada critério tem `artifacts` e `sources` que delimitam a leitura. Nota 0 = não atendido; 1 = parcialmente atendido; 2 = atendido integralmente. Inclua todos os critérios uma vez, com justificativa específica e trechos literais de pelo menos 12 caracteres das entregas no escopo. Aprovação exige 2 em todos os critérios.

Acrescente à submissão:

```json
{
  "review": {
    "reviewer": "reviewer-identity-and-role",
    "submissionDigest": "digest-printed-by-evaluate",
    "caseDigest": "case-digest-printed-by-evaluate",
    "criteria": [
      {
        "id": "R1",
        "score": 2,
        "reason": "Assessment of this criterion and its sources",
        "evidence": [
          {
            "artifactId": "deliverable-id-in-this-criterion",
            "quote": "Literal excerpt from that deliverable"
          }
        ]
      }
    ]
  }
}
```

O exemplo mostra apenas um critério; use todos os critérios do caso. Rode novamente a CLI de avaliação. Alteração das respostas, artefatos, documentos, instrução ou rubrica invalida o vínculo dos hashes. Evidência copiada de uma entrega fora do escopo do critério falha.

O registro comprova completude e vínculo ao material, não a identidade ou qualificação do revisor. O organizador do experimento precisa garanti-las. O adapter do próprio agente não pode fornecer sua revisão. `passed_with_recorded_review` significa aprovação segundo a revisão registrada, sem certificação profissional automática.

O manifesto do experimento é o snapshot inicial das execuções e não é reescrito por esta avaliação posterior. Preserve o relatório independente junto à submissão revisada e não apresente um manifesto com revisão pendente como se já contivesse essa aprovação.
