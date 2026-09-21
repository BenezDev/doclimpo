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
export function textoAlerta(dias: number | null, rotulo: string): { titulo: string; prazo: string } {
  const venceu = dias !== null && dias <= 0;
  const prazo = venceu ? "venceu" : `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`;
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
