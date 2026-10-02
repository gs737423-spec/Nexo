# NEXO — Rastreio de Entregas

MVP local para acompanhar entregas originadas em notas fiscais.

## Executar

```powershell
npm start
```

## Primeiro administrador

Antes de iniciar a versão protegida, provisione o primeiro administrador no seu terminal local. Escolha uma senha de no mínimo 10 caracteres, com maiúscula, minúscula, número e símbolo, e não a compartilhe no chat:

```powershell
npm run provision-admin -- "Seu Nome" seu-email@empresa.com "sua-senha-segura"
```

O acesso à API exige sessão autenticada, expira após 60 minutos de inatividade e não fica salvo no navegador após atualizar a página.

Abra `http://localhost:3000`. Na primeira execução, o servidor cria `data/store.json` com os dados demonstrativos. Esse arquivo é ignorado pelo Git para que as alterações locais de teste não sejam versionadas.

## Escopo atual

- API local autenticada para entregas, criação de NF, extração de campos de PDF/XML e atualização de rastreio.
- O botão **Reportar erro** captura uma tela escolhida pelo usuário, permite marcar múltiplas áreas e registra localmente o relatório com título e descrição.
- A visualização dos reports é uma área privada: o backend libera `GET /api/reports` somente para a conta proprietária configurada e não inclui capturas no bootstrap de usuários comuns.
- Persistência local em JSON, sem dependências externas.
- Contrato unificado de rastreio: `GET /api/tracking/providers` indica os conectores disponíveis e `POST /api/invoices/:id/refresh` realiza a consulta da nota.
- O cadastro aceita código de rastreio e CT-e como identificadores opcionais. Sem um código separado, a NF é usada como identificador; consultas públicas usam também o CNPJ/CPF do destinatário.
- Ao importar PDF com texto ou XML de NF-e, o sistema preserva o CPF/CNPJ formatado, o emissor, o valor total e os itens identificados (descrição, quantidade, unidade, valor unitário e total). Campos não identificados permanecem vazios; o NEXO não usa valores de exemplo para notas importadas.
- Antes de confirmar a importação, o NEXO confere cada item que tenha preço unitário: `quantidade × valor unitário` deve fechar com o total do item. A API recusa itens inconsistentes. A soma dos produtos é exibida apenas como conferência, pois pode diferir do total da NF por frete, descontos, seguros ou impostos.
- Toda NF criada passa a registrar separadamente quem realizou o upload e quando. Atualizações posteriores de etapa não substituem essa autoria.
- O formulário de confirmação possui um campo opcional de **RCA do vendedor**, persistido junto à NF. Administradores e gestores podem excluir uma NF pela tela de detalhe, após confirmação explícita; a ação é registrada na auditoria.
- A NF aceita uma **data prevista de entrega**. A listagem usa essa data para filtrar por atrasadas, hoje, próximos 3 dias, depois de 3 dias ou sem previsão, e aplica cor de urgência à previsão.
- Quando não houver código de rastreio, conector ou credencial oficial configurada, a API retorna um diagnóstico explícito; ela nunca inventa atualizações externas.
- Não inclui autenticação de produção, isolamento por empresa ou OCR para PDFs escaneados sem camada de texto.

## Conectores de transportadora

O backend reconhece as transportadoras da operação Clima Rio, incluindo Jamef, Braspress, Rodonaves, Correios, REDIVIX, TRILOG Express, FL Brasil Holding/Solistica, Transcherrer, MMA Cargas Expressas, Brasil Web, NJP Express, Tecmar, Favorita, Alfa, GMX, Águia Branca, FedEx, Jadlog e Lalamove. Também reconhece a retirada pelo cliente e o carro próprio como modalidades internas. As credenciais ficam somente no ambiente do servidor; chamadas reais são ativadas após a homologação de cada transportadora.

Os contatos mostrados no detalhe da nota são gerenciados por perfil. O sistema identifica a origem como **Canal oficial** ou **Cadastro empresarial público**; se não houver canal geral verificável, o campo permanece como “Não cadastrado”. Perfis revisados têm prioridade sobre os dados demonstrativos locais.

## Verificar

```powershell
npm test
```
