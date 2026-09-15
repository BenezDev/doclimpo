// Tokens de uso único (convites). O token só existe no e-mail enviado; o banco
// guarda apenas o hash — um vazamento da tabela não serve para aceitar convites.

export function gerarToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function tokenValido(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{40,48}$/.test(token);
}
