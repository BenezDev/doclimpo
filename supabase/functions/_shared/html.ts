// Escapa dados do usuário antes de interpolar em HTML (corpo de e-mail).
// Impede injeção de HTML no e-mail e stored-XSS caso o conteúdo venha a ser
// renderizado em algum painel no futuro.
export function escapeHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
