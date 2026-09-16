export const siteOrigin = 'https://www.doclimpo.com'

export interface PageMeta { title: string; description: string; index: boolean; path: string }

export const publicPages: Record<string, PageMeta> = {
  '/': { title: 'DocLimpo — seus documentos, antes do prazo', description: 'Organize os vencimentos de CNH, CRLV, passaporte e outros documentos. Conheça os alertas por e-mail e acompanhe seu primeiro documento grátis.', index: true, path: '/' },
  '/cadastro': { title: 'Criar conta gratuita | DocLimpo', description: 'Crie sua conta no DocLimpo e organize o primeiro vencimento gratuitamente. Sem cartão e sem enviar uma cópia do documento.', index: true, path: '/cadastro' },
  '/login': { title: 'Entrar na sua conta | DocLimpo', description: 'Acesse sua conta DocLimpo para consultar documentos, conferir próximos vencimentos e atualizar seus prazos.', index: false, path: '/login' },
  '/obrigado': { title: 'Seu próximo passo | DocLimpo', description: 'Confira as próximas etapas do cadastro no DocLimpo: confirmação do e-mail, acesso à conta e primeiro documento.', index: false, path: '/obrigado' },
  '/privacidade': { title: 'Política de privacidade | DocLimpo', description: 'Entenda quais dados o DocLimpo solicita, como são usados nos alertas e quais controles você tem sobre eles.', index: false, path: '/privacidade' },
  '/termos': { title: 'Termos de uso | DocLimpo', description: 'Regras de uso do DocLimpo: conta, plano gratuito, alertas por e-mail, responsabilidades e encerramento.', index: false, path: '/termos' },
  '/redefinir-senha': { title: 'Redefinir senha | DocLimpo', description: 'Defina uma nova senha para sua conta DocLimpo a partir do link enviado por e-mail.', index: false, path: '/redefinir-senha' },
  '/conta': { title: 'Minha conta | DocLimpo', description: 'Gerencie senha, alertas por e-mail, endereço e seus dados na conta DocLimpo.', index: false, path: '/conta' },
  '/onboarding': { title: 'Cadastrar primeiro documento | DocLimpo', description: 'Escolha o tipo de documento e informe a data de vencimento para começar a organizar seus prazos no DocLimpo.', index: false, path: '/onboarding' },
  '/dashboard': { title: 'Meu painel de documentos | DocLimpo', description: 'Consulte seus documentos e próximos vencimentos no painel privado do DocLimpo.', index: false, path: '/dashboard' },
  '/404': { title: 'Página não encontrada | DocLimpo', description: 'Este endereço não foi encontrado. Volte ao início do DocLimpo ou acesse seu painel de documentos.', index: false, path: '/404' },
}

export function getPageMeta(pathname: string): PageMeta {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/'
  if (/^\/documento\/[^/]+$/.test(path)) return { title: 'Detalhe do documento | DocLimpo', description: 'Consulte e atualize um documento no seu espaço privado do DocLimpo.', index: false, path: '/dashboard' }
  return Object.hasOwn(publicPages, path) ? publicPages[path] : publicPages['/404']
}
