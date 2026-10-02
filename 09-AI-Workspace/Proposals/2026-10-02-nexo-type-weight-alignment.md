# Nexo — pesos tipográficos e grade da tabela

## Feedback literal

“Ainda não estão alinhados e do mesmo tamanho. A tipografia não está aprovada: é incrivelmente fina e sem impacto visual nenhum, tem que ter grossura, peso, arredondamento.”

## Classificação

Erro recorrente e preferência duradoura de direção visual.

## Causa

Foram aplicados pesos intermediários sem arquivos correspondentes e uma família de fallback que não tinha a presença esperada. A tabela usava uma coluna flexível ao lado de colunas fixas, tornando o ritmo entre os campos desigual.

## Regra derivada

Usar somente pesos que existam na família carregada; para Nexo, hierarquia em Sora 600/700/800. Em tabelas operacionais, cabeçalho e linhas devem compartilhar uma mesma malha, sem coluna elástica quando a intenção for igualdade visual.

## Teste preventivo

No navegador de produção, inspecionar os pesos computados e revisar a tabela em 1366px: sete colunas iguais, títulos em 800, rótulos em 700 e dados principais em 600 ou 800.

## Arquivo oficial sugerido

Playbook de Branding and Design, depois de aprovação visual do usuário.
