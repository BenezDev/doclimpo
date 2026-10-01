// Regras dos canais de alerta, compartilhadas pelo produtor
// (check-expiring-documents), pelo consumidor (send-pending-notifications) e
// pelo envio de teste. Lógica pura: sem Deno, sem fetch — os testes rodam em Node.

export const CANAIS = ["EMAIL", "PUSH", "WHATSAPP"] as const;
export type Canal = (typeof CANAIS)[number];

export const LABELS: Record<string, string> = {
  cnh: "CNH",
  crlv: "CRLV",
  ipva: "IPVA",
  multa: "prazo da multa",
  passaporte: "Passaporte",
  rg: "RG",
  seguro: "Seguro auto",
  plano_saude: "Plano de saúde",
  carteira_trabalho: "Carteira de trabalho",
  garantia: "Garantia",
  contrato: "Contrato",
  exame: "Exame periódico",
  alvara: "Alvará",
  certidao: "Certidão negativa",
  das_mei: "DAS-MEI",
  outro: "Documento",
};

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Janelas de alerta, da mais apertada para a mais larga. Espelho de
// JANELAS_ALERTA em src/lib/planos.ts — tests/canais.test.mjs compara as duas
// listas, então mudar aqui sem mudar lá quebra o teste.
export const JANELAS_ALERTA = [1, 7, 30, 90] as const;

// O produto fala em datas do Brasil, mas a função roda em UTC. O horário de
// verão acabou em 2019, então o deslocamento é fixo: UTC-3.
const DESLOCAMENTO_BR_MS = 3 * 60 * 60 * 1000;

// Dia no calendário brasileiro (AAAA-MM-DD) de um instante qualquer.
export function dataLocalBr(instante: Date | string): string {
  const ms = typeof instante === "string" ? Date.parse(instante) : instante.getTime();
  return new Date(ms - DESLOCAMENTO_BR_MS).toISOString().slice(0, 10);
}

// Dias de calendário entre duas datas AAAA-MM-DD. Em UTC a divisão é exata:
// nenhum dia tem 23 ou 25 horas.
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
}

export function somarDiasISO(data: string, dias: number): string {
  return new Date(Date.parse(`${data}T00:00:00Z`) + dias * 86400000).toISOString().slice(0, 10);
}

// Quantos ids cabem em um `.in(...)`. O PostgREST recebe o filtro na linha de
// requisição, que os servidores cortam por volta de 8 KB; um uuid com vírgula
// gasta 37 bytes, então 100 ids (~3,7 KB) ficam com folga e 1000 estourariam.
export const IDS_POR_CONSULTA = 100;

export function emLotes<T>(itens: T[], tamanho = IDS_POR_CONSULTA): T[][] {
  const lotes: T[][] = [];
  for (let inicio = 0; inicio < itens.length; inicio += tamanho) lotes.push(itens.slice(inicio, inicio + tamanho));
  return lotes;
}

// Janela que o documento deve receber hoje, ou null quando nenhuma se aplica.
//
// A janela vigente é a mais apertada que o documento já alcançou e que ele
// ainda não tinha ultrapassado quando foi cadastrado — esse segundo teste
// evita que um documento cadastrado a três dias do vencimento receba de uma
// vez os avisos de 90, 30 e 7 dias.
//
// Como a regra olha "já alcançou" em vez de "alcança exatamente hoje", a
// rodada é auto-corretiva: se o cron falhar um dia, a mesma janela continua
// sendo a vigente amanhã e o aviso sai com atraso em vez de se perder. O
// índice único (documento_id, days_before_expiry, notification_type) garante
// que ele não saia duas vezes.
export function janelaDoDia(doc: { data_vencimento: string; criado_em: string }, hoje: string): number | null {
  const restantes = diasEntre(hoje, doc.data_vencimento);
  // Vencido: o aviso é a janela 0, enfileirada pelo outro caminho da rodada.
  if (restantes < 0) return null;
  const antecedencia = diasEntre(dataLocalBr(doc.criado_em), doc.data_vencimento);
  for (const janela of JANELAS_ALERTA) {
    if (janela >= restantes && antecedencia >= janela) return janela;
  }
  return null;
}

// Remove controle, quebras e espaços em série. Texto de usuário (apelido)
// entra em assunto de e-mail, push e parâmetro de template do WhatsApp — a
// Meta recusa quebras de linha, tabulações e 4+ espaços seguidos.
export function higienizarTexto(texto: string, max = 60): string {
  // deno-lint-ignore no-control-regex
  // eslint-disable-next-line no-control-regex
  const limpo = texto.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return limpo.length > max ? `${limpo.slice(0, max - 1)}…` : limpo;
}

export function rotuloDocumento(documento: { tipo: string; apelido: string | null }): string {
  return higienizarTexto(documento.apelido || LABELS[documento.tipo] || "documento");
}

// Frase única para assunto de e-mail, título de push e mensagem de WhatsApp.
// `dias` é a distância real até o vencimento no dia do envio, não a janela que
// enfileirou o aviso: um aviso que ficou na fila continua dizendo a verdade.
export function textoAlerta(dias: number, rotulo: string): { titulo: string; prazo: string } {
  const prazo = dias < 0 ? "venceu" : dias === 0 ? "vence hoje" : `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`;
  return { titulo: `Seu ${rotulo} ${prazo}`, prazo };
}

export interface PreferenciasCanal {
  plano: string;
  notificationEmail: boolean;
  notificationWhatsapp: boolean;
  whatsappVerificado: boolean;
  pushCount: number;
}

// E-mail sempre (se ligado). Push e WhatsApp só nos planos pagos e só quando
// há para onde enviar — evita fila cheia de SKIPPED.
export function canaisParaUsuario(p: PreferenciasCanal): Canal[] {
  const canais: Canal[] = [];
  if (p.notificationEmail !== false) canais.push("EMAIL");
  if (p.plano === "FREE") return canais;
  if (p.pushCount > 0) canais.push("PUSH");
  if (p.notificationWhatsapp && p.whatsappVerificado) canais.push("WHATSAPP");
  return canais;
}

// Serviços de push conhecidos. O servidor só faz POST para estes hosts
// (anti-SSRF); o mesmo padrão vale no CHECK da tabela e no zod do front.
export const PUSH_ENDPOINT_RE =
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

export const E164_RE = /^\+[1-9][0-9]{7,14}$/;

// Aceita "(11) 99999-9999", "11999999999", "+55 11 99999 9999". Sem DDI, assume Brasil.
export function normalizarE164(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, "");
  if (!digitos) return null;
  const comDdi = entrada.trim().startsWith("+") || (digitos.length > 11 && digitos.startsWith("55")) ? digitos : `55${digitos}`;
  const numero = `+${comDdi}`;
  return E164_RE.test(numero) ? numero : null;
}

export type ClasseErroMeta = "desativar" | "retentar" | "configuracao" | "falha";

// Códigos da Cloud API (developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes).
export function classificarErroMeta(codigo: number | undefined, status: number): ClasseErroMeta {
  if (codigo === undefined) return status === 429 || status >= 500 ? "retentar" : "falha";
  if ([131026, 131050, 100, 131030, 133010, 131047].includes(codigo)) return "desativar";
  if ([130429, 131056, 131048, 131053].includes(codigo)) return "retentar";
  if ([132000, 132001, 132012, 132015, 132016, 190, 10, 200, 33].includes(codigo)) return "configuracao";
  return status === 429 || status >= 500 ? "retentar" : "falha";
}
