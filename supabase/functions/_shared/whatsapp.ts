// WhatsApp Cloud API (Meta). Mensagens iniciadas pelo DocLimpo só podem usar
// templates aprovados; os nomes vêm das variáveis WHATSAPP_TEMPLATE_*. Host
// fixo (graph.facebook.com); o número de destino é o E.164 gravado pelo
// próprio servidor após a verificação por código. Sem as variáveis, o canal
// é pulado com motivo — nunca derruba a rodada.
import { classificarErroMeta, type ClasseErroMeta, E164_RE } from "./notificacoes.ts";

const GRAPH_API = "https://graph.facebook.com/v21.0";

export interface ConfigWhatsapp {
  token: string;
  phoneNumberId: string;
  templateAlerta: string;
  templateCodigo: string;
  idioma: string;
}

export function configWhatsapp(): ConfigWhatsapp | null {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
  const templateAlerta = Deno.env.get("WHATSAPP_TEMPLATE_ALERTA") ?? "";
  const templateCodigo = Deno.env.get("WHATSAPP_TEMPLATE_CODIGO") ?? "";
  const idioma = Deno.env.get("WHATSAPP_TEMPLATE_LANG") ?? "pt_BR";
  if (!token || !/^\d{5,20}$/.test(phoneNumberId)) return null;
  if (!/^[a-z0-9_]{1,512}$/.test(templateAlerta) || !/^[a-z0-9_]{1,512}$/.test(templateCodigo)) return null;
  return { token, phoneNumberId, templateAlerta, templateCodigo, idioma };
}

export type ResultadoWhatsapp =
  | { ok: true; id: string }
  | { ok: false; classe: ClasseErroMeta; codigo?: number; detalhe: string };

interface EnvioTemplate {
  para: string; // E.164 com "+"
  template: string;
  parametros: string[];
  // Template de autenticação: o botão "copiar código" recebe o mesmo código.
  botaoUrlParam?: string;
}

export async function enviarTemplate(config: ConfigWhatsapp, envio: EnvioTemplate): Promise<ResultadoWhatsapp> {
  if (!E164_RE.test(envio.para)) return { ok: false, classe: "desativar", detalhe: "numero_invalido" };
  const components: unknown[] = [
    { type: "body", parameters: envio.parametros.map((text) => ({ type: "text", text })) },
  ];
  if (envio.botaoUrlParam !== undefined) {
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: envio.botaoUrlParam }] });
  }
  let resposta: Response;
  try {
    resposta = await fetch(`${GRAPH_API}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: envio.para.slice(1),
        type: "template",
        template: { name: envio.template, language: { code: config.idioma }, components },
      }),
    });
  } catch (erro) {
    return { ok: false, classe: "retentar", detalhe: erro instanceof Error ? erro.message : String(erro) };
  }
  const corpo = await resposta.json().catch(() => ({})) as { messages?: { id?: string }[]; error?: { code?: number; message?: string } };
  if (resposta.ok && corpo.messages?.[0]?.id) return { ok: true, id: corpo.messages[0].id };
  const codigo = corpo.error?.code;
  return {
    ok: false,
    classe: classificarErroMeta(codigo, resposta.status),
    codigo,
    detalhe: `meta ${resposta.status}${codigo ? ` #${codigo}` : ""} ${(corpo.error?.message ?? "").slice(0, 120)}`.trim(),
  };
}
