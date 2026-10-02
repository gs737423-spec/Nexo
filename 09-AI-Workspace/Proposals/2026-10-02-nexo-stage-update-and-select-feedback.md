# Nexo — feedback: campos e atualização de etapa

## Classificação

Correção de usabilidade e regra de projeto.

## Feedback literal

"Campos como esse estão meio bugados" e "a forma que tá hoje de mudar a etapa do pedido [está] ruim demais".

## Causa

O `select` nativo recebia o foco padrão do navegador e o controle de etapa estava comprimido no cabeçalho, sem separar escolha de estado da confirmação da alteração.

## Regra derivada

Campos escuros devem suprimir o contorno nativo e usar foco visual próprio. Alterações operacionais de status devem ter seleção explícita, observação opcional e uma única ação de confirmação, em área dedicada.

## Teste preventivo

Em tela estreita e desktop, abrir os filtros e conferir ausência de contorno branco; selecionar uma etapa e confirmar que só o botão de salvar chama a atualização da nota.

## Arquivo oficial sugerido

`05-Projects/Nexo/Rules.md` quando o projeto for formalizado no Venture OS.

