// Envio de Web Push (RFC 8291/8292) com @negrel/webpush — só WebCrypto, roda
// no Edge Runtime sem node:crypto. Chaves VAPID em JWK nas variáveis
// VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY; VAPID_SUBJECT é o mailto: de contato
// que os serviços de push usam para falar com o operador.
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { PUSH_ENDPOINT_RE } from "./notificacoes.ts";

export interface AssinaturaPush {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface CargaPush {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export type ResultadoPush =
  | { ok: true }
  | { ok: false; remover: boolean; retentar: boolean; detalhe: string };

let servidor: Promise<webpush.ApplicationServer | null> | null = null;

// Lazy e memoizado: sem as variáveis, devolve null e o canal é pulado com
// motivo — nunca derruba a rodada de e-mails.
export function carregarServidorPush(): Promise<webpush.ApplicationServer | null> {
  if (servidor) return servidor;
  servidor = (async () => {
    const publica = Deno.env.get("VAPID_PUBLIC_KEY");
    const privada = Deno.env.get("VAPID_PRIVATE_KEY");
    const contato = Deno.env.get("VAPID_SUBJECT");
    if (!publica || !privada || !contato) return null;
    try {
      const vapidKeys = await webpush.importVapidKeys(
        { publicKey: JSON.parse(publica), privateKey: JSON.parse(privada) },
        { extractable: false },
      );
      return await webpush.ApplicationServer.new({ contactInformation: contato, vapidKeys });
    } catch (erro) {
      console.error("VAPID inválida:", erro instanceof Error ? erro.message : String(erro));
      return null;
    }
  })();
  return servidor;
}

export async function enviarPush(
  app: webpush.ApplicationServer,
  assinatura: AssinaturaPush,
  carga: CargaPush,
  // topic: até 32 caracteres base64url; o serviço de push substitui a mensagem
  // anterior com o mesmo topic ainda não entregue.
  opcoes: { ttl?: number; urgencia?: "very-low" | "low" | "normal" | "high"; topic?: string } = {},
): Promise<ResultadoPush> {
  // Defesa em profundidade: a tabela já tem CHECK, mas o POST sai daqui.
  if (!PUSH_ENDPOINT_RE.test(assinatura.endpoint)) {
    return { ok: false, remover: true, retentar: false, detalhe: "endpoint_fora_da_allowlist" };
  }
  try {
    const subscriber = app.subscribe({ endpoint: assinatura.endpoint, keys: { p256dh: assinatura.p256dh, auth: assinatura.auth } });
    await subscriber.pushTextMessage(JSON.stringify(carga), {
      ttl: opcoes.ttl ?? 86400,
      urgency: (opcoes.urgencia ?? "normal") as webpush.Urgency,
      topic: opcoes.topic,
    });
    return { ok: true };
  } catch (erro) {
    if (erro instanceof webpush.PushMessageError) {
      const status = erro.response.status;
      return {
        ok: false,
        remover: erro.isGone() || status === 404,
        retentar: status === 429 || status >= 500,
        detalhe: `push ${status}`,
      };
    }
    return { ok: false, remover: false, retentar: true, detalhe: erro instanceof Error ? erro.message : String(erro) };
  }
}
