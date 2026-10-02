# Proposta — direção visual da tela de login do Nexo

## Feedback literal

“A tela de login está incrivelmente ruim, nada parecido com a paleta de cores e detalhes e simplicidade do fundo do Pierry. Olha a diferença de peso, tipografia, paleta de cores, sombreamento.”

## Classificação

- Correção pontual da tela de login.
- Preferência duradoura para a direção visual do Nexo.
- Antipadrão: grade evidente, glow amplo e campos visualmente pesados competindo com o conteúdo.

## Regra derivada

Usar preto quase sólido como superfície principal, roxo apenas como acento controlado, verde apenas como sinal positivo, tipografia leve e hierarquia curta. A tela de login deve ter um único foco: a entrada; não deve parecer um dashboard técnico.

## Teste preventivo

Comparar a tela em desktop e mobile com a referência: fundo silencioso, poucos elementos, contraste suficiente, campos escuros com borda discreta, botão sem bloco visual pesado e sem glow ocupando a área central.

## Arquivo sugerido

`index.html`, na função `renderLogin` e no sistema global de tema.
