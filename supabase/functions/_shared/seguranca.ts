// Comparação de segredos em tempo constante — evita que um atacante descubra
// o x-cron-secret medindo o tempo de resposta byte a byte.
export function compararSegredo(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}
