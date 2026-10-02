---
type: feedback-proposal
status: proposed
project: Nexo
date: 2026-10-02
classification: erro recorrente
---

# Atualização de etapa deve responder JSON em produção

## Feedback literal

"tentei atualizar a etapa pra ver se mudaria alguma coisa e deu erro"

## Causa observada

O cliente tentou interpretar como JSON uma página HTML devolvida pelo roteamento genérico da Vercel para `POST /api/invoices/:id/status`.

## Regra derivada

Toda mutação usada pela interface em produção deve ter uma rota nativa explícita quando o roteamento genérico não for comprovadamente compatível. O cliente deve apresentar uma mensagem controlada ao receber conteúdo não JSON.

## Teste preventivo

Validar em pré-visualização que `POST /api/invoices/:id/status` retorna `application/json` nos cenários de banco ausente, sessão inválida, etapa inválida e atualização válida.

## Arquivo oficial sugerido

`05-Projects/Nexo/Decisions.md` (somente após aprovação).
