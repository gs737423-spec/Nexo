"use strict";

const PROVIDERS = [
  { key: "jamef", name: "Jamef", aliases: ["jamef"], credential: "JAMEF_BEARER_TOKEN", documentation: "https://developers.jamef.com.br/", website: "https://www.jamef.com.br/", phone: "(11) 2121-6161", email: "", contactSource: "Canal oficial" },
  { key: "braspress", name: "Braspress", aliases: ["braspress"], credential: "BRASPRESS_BASIC_TOKEN", documentation: "https://api.braspress.com/home", website: "https://www.braspress.com/", trackingUrl: "https://www.braspress.com/", trackingLabel: "Área da Braspress", phone: "(11) 2188-9000", email: "sac@braspress.com", contactSource: "Canal oficial" },
  { key: "rodonaves", name: "Rodonaves", aliases: ["rodonaves"], credential: "RODONAVES_BEARER_TOKEN", documentation: "https://dev.rodonaves.com.br/", website: "https://rodonaves.com.br/fale-conosco", phone: "(16) 4000-2345", email: "", contactSource: "Canal oficial" },
  { key: "correios", name: "Correios", aliases: ["correios"], credential: "CORREIOS_ACCESS_TOKEN", documentation: "https://www.correios.com.br/atendimento/developers", website: "https://www.correios.com.br/falecomoscorreios", phone: "4003 8210", email: "", contactSource: "Canal oficial" },
  { key: "redivix", name: "REDIVIX Transportes", aliases: ["redivix", "redevix", "redivick"], credential: "REDIVIX_BEARER_TOKEN", documentation: "", phone: "(27) 8114-4250", email: "", contactSource: "Cadastro empresarial público" },
  { key: "trilog", name: "TRILOG Express", aliases: ["trilog"], credential: "TRILOG_BEARER_TOKEN", documentation: "https://cliente.trilogccmexpress.com.br/rastreamento", website: "https://cliente.trilogccmexpress.com.br/rastreamento", phone: "(11) 94517-1042", email: "atendimento@trilogexpress.com.br", contactSource: "Canal oficial" },
  { key: "fl-brasil", name: "FL Brasil Holding (Tragetta)", aliases: ["fl brasil", "flbrasil", "tragetta", "solistica"], credential: "FL_BRASIL_BEARER_TOKEN", documentation: "https://portalunico.solistica.com.br/Solistica.Portal.UI/entrar", website: "https://portalunico.solistica.com.br/", trackingUrl: "https://portalunico.solistica.com.br/Solistica.Portal.UI/entrar", trackingLabel: "Portal Tragetta / Solistica", phone: "(11) 2739-1650", email: "fiscal@tragetta.com.br", contactSource: "Cadastro empresarial público" },
  { key: "transcherrer", name: "Transcherrer", aliases: ["transcherrer", "transcherer"], credential: "TRANSCHERRER_BEARER_TOKEN", documentation: "https://transcherrer.com.br/", website: "https://transcherrer.com.br/", phone: "(27) 3284-3306", email: "", contactSource: "Canal oficial" },
  { key: "mma-cargas", name: "MMA Cargas Expressas", aliases: ["mma cargas", "mma express", "mma transportes"], credential: "MMA_CARGAS_BEARER_TOKEN", documentation: "https://www.mmacargas.com.br/duvidas/", website: "https://www.mmacargas.com.br/", phone: "(27) 3089-4600", email: "comercial.es@mmacargas.com.br", contactSource: "Canal oficial" },
  { key: "brasil-web", name: "Brasil Web", aliases: ["brasil web", "brasilweb"], credential: "BRASIL_WEB_BEARER_TOKEN", documentation: "https://cliente.brasilweb.log.br/rastreamento", website: "https://cliente.brasilweb.log.br/rastreamento", trackingUrl: "https://cliente.brasilweb.log.br/rastreamento", trackingLabel: "Rastrear na Brasil Web", phone: "(19) 3500-1465", email: "", contactSource: "Canal oficial" },
  { key: "njp-express", name: "NJP Express", aliases: ["njp express", "trans njp", "njp"], credential: "NJP_EXPRESS_BEARER_TOKEN", documentation: "https://njpexpress.com.br/", website: "https://njpexpress.com.br/", phone: "", email: "atendimento.vix@njpexpress.com.br", contactSource: "Canal oficial" },
  { key: "tecmar", name: "Tecmar Transportes", aliases: ["tecmar"], credential: "TECMAR_BEARER_TOKEN", documentation: "https://tecmartransportes.com.br/", website: "https://tecmartransportes.com.br/", phone: "(11) 3238-1400", email: "", contactSource: "Canal oficial" },
  { key: "favorita", name: "Favorita Transportes", aliases: ["favorita transportes", "favorita"], credential: "FAVORITA_BEARER_TOKEN", documentation: "https://cliente.favorita.com.br/rastreamento", website: "https://cliente.favorita.com.br/rastreamento", phone: "(11) 3393-2100", email: "", contactSource: "Canal oficial" },
  { key: "alfa", name: "Alfa Transportes", aliases: ["alfa transportes", "alfa"], credential: "ALFA_BEARER_TOKEN", documentation: "https://alfatransportes.com.br/", website: "https://alfatransportes.com.br/", trackingUrl: "https://alfatransportes.com.br/", trackingLabel: "Rastrear na Alfa", phone: "(49) 3561-5100", email: "", contactSource: "Canal oficial" },
  { key: "gmx", name: "GMX", aliases: ["gmx"], credential: "GMX_BEARER_TOKEN", documentation: "", website: "", phone: "", email: "", contactSource: "" },
  { key: "accert", name: "Accert", aliases: ["accert"], credential: "ACCERT_BEARER_TOKEN", documentation: "" },
  { key: "agile", name: "Agile Transportes", aliases: ["agile transportes", "ágile transportes"], credential: "AGILE_BEARER_TOKEN", documentation: "" },
  { key: "aguia-branca", name: "Águia Branca", aliases: ["aguia branca", "águia branca"], credential: "AGUIA_BRANCA_BEARER_TOKEN", documentation: "https://encomendas.aguiabranca.com.br/fale-conosco", website: "https://encomendas.aguiabranca.com.br/", phone: "0800 725 1211", email: "", contactSource: "Canal oficial" },
  { key: "anjun", name: "Anjun", aliases: ["anjun"], credential: "ANJUN_BEARER_TOKEN", documentation: "https://www.anjunexpress.com/trackPackage", website: "https://www.anjunexpress.com/trackPackage", phone: "(11) 5026-7008", email: "sac@anjun.com.br", contactSource: "Canal oficial" },
  { key: "ativa", name: "Ativa", aliases: ["ativa"], credential: "ATIVA_BEARER_TOKEN", documentation: "" },
  { key: "atual-cargas", name: "Atual Cargas", aliases: ["atual cargas"], credential: "ATUAL_CARGAS_BEARER_TOKEN", documentation: "https://cliente.atualcargas.com.br/", website: "https://cliente.atualcargas.com.br/", phone: "(11) 3908-0600", email: "", contactSource: "Canal oficial" },
  { key: "bh-minas", name: "BH-Minas", aliases: ["bh-minas", "bh minas"], credential: "BH_MINAS_BEARER_TOKEN", documentation: "" },
  { key: "binho", name: "Binho Transportes", aliases: ["binho transportes", "binho"], credential: "BINHO_BEARER_TOKEN", documentation: "" },
  { key: "bomfim", name: "Bomfim", aliases: ["bomfim"], credential: "BOMFIM_BEARER_TOKEN", documentation: "" },
  { key: "c4", name: "C4 Transportes", aliases: ["c4 transportes", "c4"], credential: "C4_BEARER_TOKEN", documentation: "" },
  { key: "continental", name: "Continental", aliases: ["continental"], credential: "CONTINENTAL_BEARER_TOKEN", documentation: "" },
  { key: "dy", name: "D&Y Transportes", aliases: ["d&y transportes", "d & y transportes"], credential: "DY_BEARER_TOKEN", documentation: "" },
  { key: "fcb-brasil", name: "FCB Brasil", aliases: ["fcb brasil"], credential: "FCB_BRASIL_BEARER_TOKEN", documentation: "" },
  { key: "fedex", name: "FedEx", aliases: ["fedex", "fed ex"], credential: "FEDEX_BEARER_TOKEN", documentation: "https://www.fedex.com/pt-br/tracking.html", website: "https://www.fedex.com/pt-br/tracking.html", phone: "", email: "", contactSource: "Canal oficial" },
  { key: "fitlog", name: "Fitlog", aliases: ["fitlog"], credential: "FITLOG_BEARER_TOKEN", documentation: "" },
  { key: "generoso", name: "Generoso", aliases: ["generoso"], credential: "GENEROSO_BEARER_TOKEN", documentation: "https://cliente.generoso.com.br/atendimento", website: "https://generoso.com.br/", phone: "0800 400 3567", email: "contato@generoso.com.br", contactSource: "Canal oficial" },
  { key: "golden-log", name: "Golden Log", aliases: ["golden log", "goldenlog"], credential: "GOLDEN_LOG_BEARER_TOKEN", documentation: "" },
  { key: "grupo-g5", name: "Grupo G-5", aliases: ["grupo g-5", "grupo g5", "g-5"], credential: "GRUPO_G5_BEARER_TOKEN", documentation: "" },
  { key: "guanabara", name: "Guanabara", aliases: ["guanabara"], credential: "GUANABARA_BEARER_TOKEN", documentation: "" },
  { key: "inova", name: "Inova", aliases: ["inova"], credential: "INOVA_BEARER_TOKEN", documentation: "" },
  { key: "irb-service", name: "IRB Service", aliases: ["irb service"], credential: "IRB_SERVICE_BEARER_TOKEN", documentation: "" },
  { key: "italog", name: "Italog", aliases: ["italog"], credential: "ITALOG_BEARER_TOKEN", documentation: "" },
  { key: "jadlog", name: "Jadlog", aliases: ["jadlog"], credential: "JADLOG_BEARER_TOKEN", documentation: "https://www.jadlog.com.br/atendimento", website: "https://www.jadlog.com.br/atendimento", phone: "", email: "", contactSource: "Canal oficial" },
  { key: "jeolog", name: "Jeolog", aliases: ["jeolog"], credential: "JEOLOG_BEARER_TOKEN", documentation: "" },
  { key: "karavaggio", name: "Karavaggio", aliases: ["karavaggio"], credential: "KARAVAGGIO_BEARER_TOKEN", documentation: "" },
  { key: "kr", name: "KR Transportes", aliases: ["kr transportes"], credential: "KR_BEARER_TOKEN", documentation: "" },
  { key: "lalamove", name: "Lalamove", aliases: ["lalamove"], credential: "LALAMOVE_BEARER_TOKEN", documentation: "https://www.lalamove.com/pt-br/rastreio_tempo_real", website: "https://www.lalamove.com/pt-br/rastreio_tempo_real", phone: "", email: "", contactSource: "Canal oficial" },
  { key: "internal-delivery", name: "Operação interna", aliases: ["carro da clima rio", "cliente retira", "transportadora do cliente", "não sei", "nao sei"], internal: true, credential: "", documentation: "" },
  { key: "lastro", name: "Lastro Transportes", aliases: ["lastro transportes", "lastro"], credential: "LASTRO_BEARER_TOKEN", documentation: "" },
  { key: "leite-express", name: "Leite Express", aliases: ["leite express"], credential: "LEITE_EXPRESS_BEARER_TOKEN", documentation: "" },
  { key: "lovitha", name: "Lovitha", aliases: ["lovitha"], credential: "LOVITHA_BEARER_TOKEN", documentation: "" },
  { key: "monteiro-junior", name: "Monteiro Junior", aliases: ["monteiro junior", "monteiro júnior"], credential: "MONTEIRO_JUNIOR_BEARER_TOKEN", documentation: "" },
  { key: "movvi", name: "Movvi", aliases: ["movvi"], credential: "MOVVI_BEARER_TOKEN", documentation: "https://movvi.com.br/ferramentas/rastreio", website: "https://movvi.com.br/ferramentas/rastreio", phone: "(19) 3578-3600", email: "", contactSource: "Canal oficial" },
  { key: "nacional", name: "Nacional Transportes", aliases: ["nacional transportes"], credential: "NACIONAL_BEARER_TOKEN", documentation: "" },
  { key: "nova-uniao", name: "Nova União", aliases: ["nova uniao", "nova união"], credential: "NOVA_UNIAO_BEARER_TOKEN", documentation: "" },
  { key: "nr-express", name: "NR Express", aliases: ["nr express"], credential: "NR_EXPRESS_BEARER_TOKEN", documentation: "" },
  { key: "ouro-negro", name: "Ouro Negro Transportes", aliases: ["ouro negro transportes", "ouro negro"], credential: "OURO_NEGRO_BEARER_TOKEN", documentation: "" },
  { key: "pacifico-log", name: "Pacífico Log", aliases: ["pacifico log", "pacífico log"], credential: "PACIFICO_LOG_BEARER_TOKEN", documentation: "" },
  { key: "pajucara", name: "Pajuçara", aliases: ["pajucara", "pajuçara"], credential: "PAJUCARA_BEARER_TOKEN", documentation: "https://cliente.viapajucara.com.br/rastrear", website: "https://cliente.viapajucara.com.br/rastrear", phone: "", email: "", contactSource: "Canal oficial" },
  { key: "passaro-verde", name: "Pássaro Verde", aliases: ["passaro verde", "pássaro verde"], credential: "PASSARO_VERDE_BEARER_TOKEN", documentation: "" },
  { key: "petrocargas", name: "Petrocargas", aliases: ["petrocargas"], credential: "PETROCARGAS_BEARER_TOKEN", documentation: "https://petrocargas.com.br/site/", website: "https://petrocargas.com.br/site/", phone: "(87) 3867-7247", email: "", contactSource: "Canal oficial" },
  { key: "pss", name: "PSS Transportes", aliases: ["pss transportes", "pss"], credential: "PSS_BEARER_TOKEN", documentation: "" },
  { key: "rap10", name: "RAP10", aliases: ["rap10", "rap 10"], credential: "RAP10_BEARER_TOKEN", documentation: "" },
  { key: "reboucas", name: "Rebouças", aliases: ["reboucas", "rebouças"], credential: "REBOUCAS_BEARER_TOKEN", documentation: "" },
  { key: "rede-encomendas", name: "Rede Encomendas", aliases: ["rede encomendas"], credential: "REDE_ENCOMENDAS_BEARER_TOKEN", documentation: "" },
  { key: "rn-entregas", name: "RN Entregas", aliases: ["rn entregas"], credential: "RN_ENTREGAS_BEARER_TOKEN", documentation: "" },
  { key: "rodan", name: "Rodan Transportes", aliases: ["rodan transportes", "rodan"], credential: "RODAN_BEARER_TOKEN", documentation: "" },
  { key: "rodocerto", name: "Rodocerto", aliases: ["rodocerto"], credential: "RODOCERTO_BEARER_TOKEN", documentation: "https://www.rodocerto.com.br/contato/", website: "https://www.rodocerto.com.br/", phone: "(18) 3649-2222", email: "rodocerto@rodocerto.com.br", contactSource: "Canal oficial" },
  { key: "tg", name: "TG Transportes", aliases: ["tg transportes"], credential: "TG_BEARER_TOKEN", documentation: "" },
  { key: "tjb", name: "TJB", aliases: ["tjb"], credential: "TJB_BEARER_TOKEN", documentation: "" },
  { key: "translessa", name: "Translessa", aliases: ["translessa"], credential: "TRANSLESSA_BEARER_TOKEN", documentation: "" },
  { key: "translovato", name: "Translovato", aliases: ["translovato"], credential: "TRANSLOVATO_BEARER_TOKEN", documentation: "https://www.translovato.com.br/", website: "https://www.translovato.com.br/", phone: "", email: "", contactSource: "Canal oficial" },
  { key: "vip-entrega", name: "VIP Entrega Rápida", aliases: ["vip entrega rapida", "vip entrega rápida"], credential: "VIP_ENTREGA_BEARER_TOKEN", documentation: "" },
  { key: "farrapos", name: "Farrapos Transportes", aliases: ["farrapos transportes", "farrapos"], credential: "FARRAPOS_BEARER_TOKEN", documentation: "" },
  { key: "jcdex", name: "JCDEX", aliases: ["jcdex"], credential: "JCDEX_BEARER_TOKEN", documentation: "" },
  { key: "modular", name: "Modular Transportes", aliases: ["modular transportes", "modular"], credential: "MODULAR_BEARER_TOKEN", documentation: "" },
  { key: "rvr", name: "RVR Log", aliases: ["rvr log", "rvr"], credential: "RVR_BEARER_TOKEN", documentation: "" },
  { key: "translaguna", name: "Translaguna", aliases: ["translaguna"], credential: "TRANSLAGUNA_BEARER_TOKEN", documentation: "https://translaguna.eslcloud.com.br/recipient_tracking", website: "https://translaguna.eslcloud.com.br/recipient_tracking", phone: "", email: "", contactSource: "Canal oficial" },
  { key: "sao-miguel", name: "São Miguel", aliases: ["sao miguel", "são miguel"], credential: "SAO_MIGUEL_BEARER_TOKEN", documentation: "" },
  { key: "serravix", name: "Serravix Transporte", aliases: ["serravix transporte", "serravix"], credential: "SERRAVIX_BEARER_TOKEN", documentation: "https://www.serravixtransporte.com.br/", website: "https://www.serravixtransporte.com.br/", phone: "", email: "", contactSource: "Canal oficial" },
  { key: "sulmatogrossense", name: "Sulmatogrossense", aliases: ["sulmatogrossense"], credential: "SULMATOGROSSENSE_BEARER_TOKEN", documentation: "" },
  { key: "termaco", name: "Termaco", aliases: ["termaco"], credential: "TERMACO_BEARER_TOKEN", documentation: "https://www.termaco.com.br/sic/sistema/rastreio2.php", website: "https://termaco.com.br/transportes", phone: "(85) 3388-5600", email: "contato@termaco.com.br", contactSource: "Canal oficial" },
  { key: "rodomais", name: "Rodomais", aliases: ["rodomais"], credential: "RODOMAIS_BEARER_TOKEN", documentation: "https://rodomais.com.br/", website: "https://rodomais.com.br/", phone: "(32) 3721-6741", email: "", contactSource: "Canal oficial" },
  { key: "rt-log", name: "RT Log", aliases: ["rt log"], credential: "RT_LOG_BEARER_TOKEN", documentation: "" },
];

function providerForCarrier(name) {
  const normalized = String(name || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return PROVIDERS.find((provider) => provider.aliases.some((alias) => {
    const normalizedAlias = String(alias).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return normalizedAlias && normalized.includes(normalizedAlias);
  })) || null;
}

function publicProviders() {
  return PROVIDERS.map(({ key, name, credential, documentation }) => ({ key, name, configured: Boolean(process.env[credential]), documentation }));
}

function carrierProfileFor(name) {
  const provider = providerForCarrier(name);
  if (!provider) return { website: "", phone: "", email: "", contactSource: "" };
  return {
    website: provider.website || "",
    trackingUrl: provider.trackingUrl || provider.website || "",
    trackingLabel: provider.trackingLabel || "Rastrear no site oficial",
    phone: provider.phone || "",
    email: provider.email || "",
    contactSource: provider.contactSource || "",
  };
}

function buildTrackingQuery(invoice = {}) {
  const trackingIdentifier = invoice.tracking || invoice.cte || invoice.nf || "";
  return {
    nf: String(invoice.nf || "").replace(/\D/g, ""),
    trackingIdentifier: String(trackingIdentifier).replace(/\s/g, ""),
    document: String(invoice.recipientDoc || "").replace(/\D/g, ""),
    documentRole: "destinatario",
  };
}

function createTrackingService({ lookup } = {}) {
  return {
    providers: publicProviders,
    async refresh({ invoice, carrier }) {
      const provider = providerForCarrier(carrier && carrier.name);
      if (!provider) return { ok: false, code: "PROVIDER_UNSUPPORTED", message: "Esta transportadora ainda não possui conector de rastreio no NEXO." };
      if (provider.internal) return { ok: false, code: "INTERNAL_DELIVERY", message: "Esta é uma modalidade interna e não possui rastreio público de transportadora." };
      const query = buildTrackingQuery(invoice);
      if (!query.trackingIdentifier) return { ok: false, code: "TRACKING_IDENTIFIER_MISSING", message: "A nota não possui número de NF, código de rastreio ou CT-e para consulta." };
      if (!query.document) return { ok: false, code: "RECIPIENT_DOCUMENT_MISSING", message: "A nota não possui CNPJ/CPF do destinatário para a consulta pública." };
      if (!process.env[provider.credential]) return { ok: false, code: "PROVIDER_NOT_CONFIGURED", provider: provider.key, message: `A integração com ${provider.name} ainda não está configurada no servidor.` };
      if (!lookup) return { ok: false, code: "PROVIDER_NOT_IMPLEMENTED", provider: provider.key, message: `O conector ${provider.name} está aguardando a configuração homologada.` };
      return lookup({ provider, invoice: { ...invoice, tracking: query.trackingIdentifier }, carrier, query });
    },
  };
}

module.exports = { buildTrackingQuery, carrierProfileFor, createTrackingService, providerForCarrier, publicProviders };
