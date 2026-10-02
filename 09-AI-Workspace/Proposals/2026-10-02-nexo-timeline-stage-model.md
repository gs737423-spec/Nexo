---
type: feedback-proposal
status: proposed
project: Nexo
date: 2026-10-02
classification: regra de projeto
---

# Timeline como progresso de entrega

## Feedback literal

"essa timeline tinha que ser que nem a shopee ou algo assim as etapas, por que ta criando duplicada ou algo assim, ta funcionando mais como um historico do que tudo"

## Causa

O componente renderizava todos os eventos persistidos em sequência. Cada salvamento da etapa atual criava outra ocorrência, misturando histórico com progresso visual.

## Regra derivada

A timeline principal deve representar uma etapa única por estado do fluxo, com concluídas, atual e pendentes. O histórico detalhado, se necessário, deve ser uma camada separada.

## Teste preventivo

Salvar a mesma etapa duas vezes não pode aumentar a quantidade de eventos nem duplicar uma etapa visual. Avançar e voltar manualmente deve manter cada etapa canônica única.

## Arquivo oficial sugerido

`05-Projects/Nexo/Design.md` ou `05-Projects/Nexo/Decisions.md` (somente após aprovação).
