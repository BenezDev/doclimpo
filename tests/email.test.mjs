import test from 'node:test'
import assert from 'node:assert/strict'
import { REMETENTE_PADRAO, layoutEmail } from '../supabase/functions/_shared/email.ts'

test('e-mails saem do domínio doclimpo.com com a moldura da marca', () => {
  assert.equal(REMETENTE_PADRAO, 'DocLimpo <alertas@doclimpo.com>')
  const html = layoutEmail({ appUrl: 'https://www.doclimpo.com', titulo: 'Sua CNH vence em 30 dias', corpo: '<p>corpo</p>', cta: { texto: 'Ver no DocLimpo', url: 'https://www.doclimpo.com/dashboard' }, rodape: 'rodapé' })
  for (const trecho of ['lang="pt-BR"', 'https://www.doclimpo.com/icon-192.png', 'Sua CNH vence em 30 dias', 'href="https://www.doclimpo.com/dashboard"', '<p>corpo</p>', 'rodapé']) assert.ok(html.includes(trecho), trecho)
  assert.doesNotMatch(html, /docalert/)
  // Sem botão quando não há ação.
  assert.doesNotMatch(layoutEmail({ appUrl: 'https://x.test', titulo: 't', corpo: '', rodape: '' }), /<a /)
})
