"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildTrackingQuery, carrierProfileFor, createTrackingService, providerForCarrier } = require("../tracking-service");

test("identifica conectores por transportadora e não inventa rastreio", async () => {
  assert.equal(providerForCarrier("Jamef Transportes").key, "jamef");
  assert.equal(providerForCarrier("REDIVIX TRANSPORTES LTDA").key, "redivix");
  assert.equal(providerForCarrier("TRILOG EXPRESS LTDA").key, "trilog");
  assert.equal(providerForCarrier("TRANSCHERRER TRANSPORTADORA LTDA").key, "transcherrer");
  assert.equal(providerForCarrier("MMA CARGAS EXPRESSAS LTDA").key, "mma-cargas");
  assert.equal(providerForCarrier("BRASIL WEB TRANSPORTES E LOGISTICA S/A").key, "brasil-web");
  assert.equal(providerForCarrier("NJP EXPRESS LTDA").key, "njp-express");
  assert.equal(providerForCarrier("TECMAR TRANSPORTES LTDA").key, "tecmar");
  assert.equal(providerForCarrier("REDEVIX TRANSPORTES LTDA").key, "redivix");
  assert.equal(providerForCarrier("SOLISTICA BRASIL").key, "fl-brasil");
  assert.equal(providerForCarrier("FAVORITA TRANSPORTES LTDA").key, "favorita");
  assert.equal(providerForCarrier("ALFA TRANSPORTES LTDA").key, "alfa");
  assert.equal(providerForCarrier("GMX LOGISTICA").key, "gmx");
  assert.equal(providerForCarrier("AGUIA BRANCA LOGISTICA").key, "aguia-branca");
  assert.equal(providerForCarrier("FEDEX EXPRESS").key, "fedex");
  assert.equal(providerForCarrier("JADLOG LOGISTICA").key, "jadlog");
  assert.equal(providerForCarrier("LALAMOVE BRASIL").key, "lalamove");
  assert.equal(providerForCarrier("CLIENTE RETIRA").key, "internal-delivery");
  assert.equal(providerForCarrier("LASTRO TRANSPORTES LTDA").key, "lastro");
  assert.equal(providerForCarrier("NOVA UNIAO TRANSPORTES").key, "nova-uniao");
  assert.equal(providerForCarrier("PAJUCARA TRANSPORTES").key, "pajucara");
  assert.equal(providerForCarrier("PSS TRANSPORTES LTDA").key, "pss");
  assert.equal(providerForCarrier("RODOCERTO LOGISTICA").key, "rodocerto");
  assert.equal(providerForCarrier("TRANSLESSA TRANSPORTES LTDA").key, "translessa");
  assert.equal(providerForCarrier("RVR LOGISTICA").key, "rvr");
  assert.equal(providerForCarrier("SERRAVIX TRANSPORTE").key, "serravix");
  assert.equal(providerForCarrier("TRANSPORTADORA DO CLIENTE").key, "internal-delivery");
  assert.equal(providerForCarrier("Transportadora Sem Integração"), null);
  assert.equal(carrierProfileFor("TRILOG EXPRESS LTDA").website, "https://cliente.trilogccmexpress.com.br/rastreamento");
  const flBrasil = carrierProfileFor("FL BRASIL HOLDING, LOGISTICA E TRANSPORTE");
  assert.equal(flBrasil.trackingUrl, "https://portalunico.solistica.com.br/Solistica.Portal.UI/entrar");
  assert.equal(flBrasil.trackingLabel, "Portal Tragetta / Solistica");
  assert.equal(flBrasil.phone, "(11) 2739-1650");
  const redivix = carrierProfileFor("REDIVIX TRANSPORTES LTDA");
  assert.equal(redivix.phone, "(27) 8114-4250");
  const transcherrer = carrierProfileFor("TRANSCHERRER TRANSPORTADORA LTDA");
  assert.equal(transcherrer.website, "https://transcherrer.com.br/");
  assert.equal(transcherrer.phone, "(27) 3284-3306");
  const brasilWeb = carrierProfileFor("BRASIL WEB TRANSPORTES E LOGISTICA S/A");
  assert.equal(brasilWeb.trackingUrl, "https://cliente.brasilweb.log.br/rastreamento");
  assert.equal(brasilWeb.phone, "(19) 3500-1465");

  const service = createTrackingService();
  const internal = await service.refresh({ invoice: { nf: "1" }, carrier: { name: "CARRO DA CLIMA RIO" } });
  assert.equal(internal.code, "INTERNAL_DELIVERY");
  const missingCode = await service.refresh({ invoice: { tracking: "" }, carrier: { name: "Jamef" } });
  assert.equal(missingCode.code, "TRACKING_IDENTIFIER_MISSING");

  const nfFallback = await service.refresh({ invoice: { nf: "000022350", recipientDoc: "056.749.428-46" }, carrier: { name: "Jamef" } });
  assert.equal(nfFallback.code, "PROVIDER_NOT_CONFIGURED");

  const unavailable = await service.refresh({ invoice: { tracking: "ABC123", recipientDoc: "32.811.183/0001-11" }, carrier: { name: "Jamef" } });
  assert.equal(unavailable.code, "PROVIDER_NOT_CONFIGURED");

  assert.deepEqual(buildTrackingQuery({ nf: "000022350", recipientDoc: "056.749.428-46" }), {
    nf: "000022350", trackingIdentifier: "000022350", document: "05674942846", documentRole: "destinatario",
  });
});
