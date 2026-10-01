// Tema antes da primeira pintura: roda síncrono no <head>, antes do CSS, para
// o HTML pré-renderizado não piscar claro em quem usa o escuro. Arquivo externo
// de propósito: a CSP bloqueia script inline. Mesma regra de src/hooks/useTheme.ts.
(function () {
  var salvo
  try { salvo = localStorage.getItem('doclimpo-theme') } catch (e) { /* sem storage: segue o sistema */ }
  var dark = salvo === 'dark' || (salvo !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
})()
