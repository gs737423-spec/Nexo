"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { parseNFeText, parseNFeXml } = require("../invoice-parser");

test("extrai os campos rotulados de um DANFE em PDF", () => {
  const draft = parseNFeText(`
    DANFE
    N. 000492847
    SÉRIE 1
    DESTINATÁRIO/REMETENTE
    NOME/RAZÃO SOCIAL
    SÔNIA LOPES LUCIO CNPJ/CPF 32.811.183/0001-11
    DATA DE EMISSÃO 04/09/2026
    MUNICÍPIO DUQUE DE CAXIAS FONE/FAX 21987124566 UF RJ
    TRANSPORTADOR/VOLUMES TRANSPORTADOS
    RAZÃO SOCIAL
    REDVICK TRANSPORTES LTDA FRETE POR CONTA 0-REMETENTE
  `);

  assert.deepEqual(draft, {
    nf: "000492847",
    carrier: "REDVICK TRANSPORTES LTDA",
    recipient: "SÔNIA LOPES LUCIO",
    doc: "32.811.183/0001-11",
    date: "04/09/2026",
    order: "",
    city: "DUQUE DE CAXIAS",
    state: "RJ",
    issuer: "",
    value: null,
    items: [],
    financialCheck: { checkedItems: 0, inconsistentItems: 0, productsTotal: 0, invoiceTotal: null, totalDifference: null },
  });
});

test("extrai CPF de destinatário no layout DANFE do Protheus", () => {
  const draft = parseNFeText(`
    DANFE NOTA FISCAL ELETRÔNICA
    NF-e N. 000042082 SÉRIE 1
    DESTINATÁRIO/REMETENTE
    NOME/RAZÃO SOCIAL
    CLIENTE DE TESTE CNPJ/CPF 123.456.789-09
    DATA DE EMISSÃO 10/07/2026
    MUNICÍPIO CIDADE DE TESTE FONE/FAX 550000000000 UF RJ
    TRANSPORTADOR/VOLUMES TRANSPORTADOS
    RAZÃO SOCIAL TRANSPORTADORA DE TESTE FRETE POR CONTA 0-REMETENTE
  `);

  assert.deepEqual(draft, {
    nf: "000042082",
    carrier: "TRANSPORTADORA DE TESTE",
    recipient: "CLIENTE DE TESTE",
    doc: "123.456.789-09",
    date: "10/07/2026",
    order: "",
    city: "CIDADE DE TESTE",
    state: "RJ",
    issuer: "",
    value: null,
    items: [],
    financialCheck: { checkedItems: 0, inconsistentItems: 0, productsTotal: 0, invoiceTotal: null, totalDifference: null },
  });
});

test("reconhece transportadora quando o DANFE varia o título e quebra o nome em linha", () => {
  const draft = parseNFeText(`
    DANFE NF-e N. 000109397
    DESTINATÁRIO/REMETENTE
    NOME/RAZÃO SOCIAL KLEBER ALVES DE SOUZA CNPJ/CPF 414.749.628-82
    DATA DE EMISSÃO 31/07/2026
    MUNICÍPIO GUARULHOS FONE/FAX 1100000000 UF SP
    TRANSPORTADORA / VOLUMES TRANSPORTADOS
    RAZÃO SOCIAL
    LOG EXPRESS TRANSPORTES E LOGISTICA LTDA
    FRETE POR CONTA 0-REMETENTE
  `);

  assert.equal(draft.nf, "000109397");
  assert.equal(draft.carrier, "LOG EXPRESS TRANSPORTES E LOGISTICA LTDA");
});

test("reconhece transportadora em título abreviado de volumes", () => {
  const draft = parseNFeText(`
    DANFE NF-e N. 000109398
    DESTINATÁRIO/REMETENTE
    NOME/RAZÃO SOCIAL CLIENTE TESTE CPF 123.456.789-09
    DATA DE EMISSÃO 31/07/2026
    MUNICÍPIO GUARULHOS FONE/FAX 1100000000 UF SP
    TRANSPORTE / VOLUMES TRANSPORTADOS
    NOME/RAZÃO SOCIAL ROTA CERTA CARGAS LTDA PLACA DO VEÍCULO ABC1234
  `);

  assert.equal(draft.carrier, "ROTA CERTA CARGAS LTDA");
});

test("extrai os campos oficiais de um XML de NF-e", () => {
  const draft = parseNFeXml(`
    <NFe><infNFe><ide><nNF>492847</nNF><dhEmi>2026-09-04T09:27:00-03:00</dhEmi></ide>
    <dest><xNome>SÔNIA LOPES LUCIO</xNome><CNPJ>32811183000111</CNPJ><xMun>DUQUE DE CAXIAS</xMun><UF>RJ</UF></dest>
    <det><prod><xPed>PED-9102</xPed></prod></det>
    <transp><transporta><xNome>REDVICK TRANSPORTES LTDA</xNome></transporta></transp></infNFe></NFe>
  `);

  assert.deepEqual(draft, {
    nf: "000492847",
    carrier: "REDVICK TRANSPORTES LTDA",
    recipient: "SÔNIA LOPES LUCIO",
    doc: "32.811.183/0001-11",
    date: "04/09/2026",
    order: "PED-9102",
    city: "DUQUE DE CAXIAS",
    state: "RJ",
    issuer: "",
    value: null,
    items: [],
    financialCheck: { checkedItems: 0, inconsistentItems: 0, productsTotal: 0, invoiceTotal: null, totalDifference: null },
  });
});

test("extrai valor, CPF, emissor e todos os itens de um XML de NF-e", () => {
  const draft = parseNFeXml(`<NFe><infNFe><ide><nNF>22350</nNF></ide><emit><xNome>ClimaRio</xNome></emit><dest><xNome>Cliente</xNome><CPF>05674942846</CPF><xMun>SAO PAULO</xMun><UF>SP</UF></dest><total><ICMSTot><vNF>998.99</vNF></ICMSTot></total><det nItem="1"><prod><cProd>43814</cProd><xProd>FREEZ H 99L</xProd><uCom>UN</uCom><qCom>1.0000</qCom><vUnCom>1051.5700</vUnCom><vProd>1051.57</vProd></prod></det><det nItem="2"><prod><cProd>42</cProd><xProd>Instalação</xProd><uCom>SV</uCom><qCom>2.0000</qCom><vUnCom>10.00</vUnCom><vProd>20.00</vProd></prod></det><transp><transporta><xNome>TRILOG</xNome></transporta></transp></infNFe></NFe>`);
  assert.equal(draft.value, 998.99);
  assert.equal(draft.doc, "056.749.428-46");
  assert.equal(draft.issuer, "ClimaRio");
  assert.deepEqual(draft.items, [
    { code: "43814", description: "FREEZ H 99L", unit: "UN", quantity: 1, unitValue: 1051.57, total: 1051.57 },
    { code: "42", description: "Instalação", unit: "SV", quantity: 2, unitValue: 10, total: 20 },
  ]);
  assert.deepEqual(draft.financialCheck, { checkedItems: 2, inconsistentItems: 0, productsTotal: 1071.57, invoiceTotal: 998.99, totalDifference: -72.58 });
});

test("extrai valor e item de um trecho de DANFE Protheus", () => {
  const draft = parseNFeText(`
    DANFE N. 000022350
    DESTINATÁRIO/REMETENTE
    NOME/RAZÃO SOCIAL CLIENTE CPF 056.749.428-46
    DATA DE EMISSÃO 26/09/2025
    MUNICÍPIO SAO PAULO FONE/FAX 1100000000 UF SP
    VALOR TOTAL DA NOTA
    998,99
    DADOS DO PRODUTO / SERVIÇO
    43814FREEZ H 99L 2 EM 1 PFH105B PHILCO B84183000 200 6108 UN 1,00001.051,5700 1.051,57
  `);
  assert.equal(draft.value, 998.99);
  assert.deepEqual(draft.items, [{ code: "43814", description: "FREEZ H 99L 2 EM 1 PFH105B PHILCO B", unit: "UN", quantity: 1, unitValue: 1051.57, total: 1051.57 }]);
  assert.deepEqual(draft.financialCheck, { checkedItems: 1, inconsistentItems: 0, productsTotal: 1051.57, invoiceTotal: 998.99, totalDifference: -52.58 });
});

test("extrai item quando o código do produto é alfanumérico no DANFE Protheus", () => {
  const draft = parseNFeText(`
    DANFE N. 000022351
    DADOS DO PRODUTO / SERVIÇO
    PAC-43814FREEZ H 99L 2 EM 1 PFH105B PHILCO B84183000 200 6108 UN 1,00001.051,5700 1.051,57
  `);

  assert.deepEqual(draft.items, [{ code: "PAC-43814", description: "FREEZ H 99L 2 EM 1 PFH105B PHILCO B", unit: "UN", quantity: 1, unitValue: 1051.57, total: 1051.57 }]);
});

test("sinaliza item extraído cuja conta não fecha, sem inventar uma correção", () => {
  const draft = parseNFeXml(`<NFe><infNFe><ide><nNF>100</nNF></ide><det nItem="1"><prod><cProd>1</cProd><xProd>Produto</xProd><uCom>UN</uCom><qCom>2.0000</qCom><vUnCom>10.0000</vUnCom><vProd>25.00</vProd></prod></det></infNFe></NFe>`);
  assert.equal(draft.items[0].total, 25);
  assert.equal(draft.financialCheck.checkedItems, 1);
  assert.equal(draft.financialCheck.inconsistentItems, 1);
});
