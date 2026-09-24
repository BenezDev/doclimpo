// Moldura dos e-mails do DocLimpo (alerta, teste e convite da família), com as
// cores e o símbolo do site. Lógica pura: quem chama escapa com escapeHtml()
// todo dado do usuário antes de montar `titulo` e `corpo`.

export const REMETENTE_PADRAO = "DocLimpo <alertas@doclimpo.com>";

export const COR_EMAIL = {
  tinta: "#0b1210",
  texto: "#33403b",
  suave: "#63706b",
  linha: "#dde5e1",
  fundo: "#f5f8f6",
  verde: "#2fd97f",
  atencao: "#9c6009",
  perigo: "#a81e17",
} as const;

export function layoutEmail(opts: {
  appUrl: string;
  titulo: string;
  corTitulo?: string;
  corpo: string;
  cta?: { texto: string; url: string };
  rodape: string;
}): string {
  const { appUrl, titulo, corTitulo = COR_EMAIL.tinta, corpo, cta, rodape } = opts;
  const fonte = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const botao = cta
    ? `<a href="${cta.url}" style="display:inline-block;background:${COR_EMAIL.verde};color:${COR_EMAIL.tinta};text-decoration:none;padding:13px 24px;border-radius:999px;font-size:15px;font-weight:700;">${cta.texto}</a>`
    : "";
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px 12px;background:${COR_EMAIL.fundo};font-family:${fonte};">
  <div style="max-width:520px;margin:0 auto;">
    <table role="presentation" style="border-collapse:collapse;margin:0 0 16px 4px;"><tr>
      <td style="padding:0 10px 0 0;vertical-align:middle;"><img src="${appUrl}/icon-192.png" width="32" height="32" alt="" style="display:block;border:0;border-radius:8px;"></td>
      <td style="vertical-align:middle;font-size:19px;font-weight:800;letter-spacing:-0.3px;color:${COR_EMAIL.tinta};">DocLimpo</td>
    </tr></table>
    <div style="background:#ffffff;border:1px solid ${COR_EMAIL.linha};border-radius:18px;padding:28px;">
      <h1 style="margin:0 0 16px;font-size:23px;line-height:1.25;font-weight:800;color:${corTitulo};">${titulo}</h1>
      ${corpo}
      ${botao}
    </div>
    <p style="margin:16px 4px 0;font-size:12px;line-height:1.6;color:${COR_EMAIL.suave};">${rodape}</p>
  </div>
</body></html>`;
}
