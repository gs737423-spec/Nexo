# Nexo — revisão tipográfica e de hierarquia

## Feedback literal

“Você não alterou em nada a tipografia; continua a mesma, bagunçou e não está alinhado nem tem padrão. Está com muita cara de IA. Tem que ter bom gosto, como um design gráfico de frontend feito no Figma.”

## Classificação

Correção rejeitando uma solução anterior; antipadrão recorrente: aplicar escala e peso sobre uma fonte inadequada sem consolidar uma grade visual.

## Causa

A interface continuava presa à Sora embutida, com pesos sintéticos, letter-spacing agressivo e regras inline competindo com os overrides globais. O cabeçalho e as linhas da tabela também tinham colunas diferentes semanticamente, embora parecessem iguais visualmente.

## Regra derivada

Antes de ajustar tamanhos, validar a família tipográfica, os pesos disponíveis e uma única malha de alinhamento. Não usar caixa alta, tracking negativo forte ou gradientes como substitutos de hierarquia.

## Teste preventivo

Revisar cada tela em 1366px e em largura reduzida: família visivelmente distinta, níveis de título/metadata/valor reconhecíveis, cabeçalho e linhas compartilhando a mesma grade e nenhum texto cortado ou desalinhado.

## Arquivo oficial sugerido

Registrar a regra aprovada no playbook de Branding and Design, após validação visual do usuário.
