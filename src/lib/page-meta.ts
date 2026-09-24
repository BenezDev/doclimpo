import { DOCUMENTOS_PUBLICOS, documentoPublicoPorSlug } from './documentos-publicos.ts'
import { PLANOS } from './planos.ts'
import { faqs, support } from './public-content.ts'

export const siteOrigin = 'https://www.doclimpo.com'

export interface PageMeta { title: string; description: string; index: boolean; path: string }

export const publicPages: Record<string, PageMeta> = {
  '/': { title: 'DocLimpo: aviso de vencimento de CNH, IPVA e multa', description: 'Aviso 90, 30, 7 e 1 dia antes de vencer a CNH, o licenciamento, o IPVA e a multa, com o link oficial para resolver. Grátis para 1 documento.', index: true, path: '/' },
  '/cadastro': { title: 'Criar conta gratuita | DocLimpo', description: 'Crie sua conta no DocLimpo e organize o primeiro vencimento gratuitamente. Sem cartão e sem enviar uma cópia do documento.', index: true, path: '/cadastro' },
  '/login': { title: 'Entrar na sua conta | DocLimpo', description: 'Acesse sua conta DocLimpo para consultar documentos, conferir próximos vencimentos e atualizar seus prazos.', index: false, path: '/login' },
  '/obrigado': { title: 'Seu próximo passo | DocLimpo', description: 'Confira as próximas etapas do cadastro no DocLimpo: confirmação do e-mail, acesso à conta e primeiro documento.', index: false, path: '/obrigado' },
  '/privacidade': { title: 'Política de privacidade | DocLimpo', description: 'Entenda quais dados o DocLimpo solicita, como são usados nos alertas e quais controles você tem sobre eles.', index: false, path: '/privacidade' },
  '/termos': { title: 'Termos de uso | DocLimpo', description: 'Regras de uso do DocLimpo: conta, plano gratuito, alertas por e-mail, responsabilidades e encerramento.', index: false, path: '/termos' },
  '/sobre': { title: 'Sobre o DocLimpo', description: 'Por que o DocLimpo existe, o que ele faz e o que não faz, quem está por trás e como falar com a gente.', index: true, path: '/sobre' },
  '/seguranca': { title: 'Segurança e privacidade | DocLimpo', description: 'O DocLimpo não pede foto, CPF nem senha do gov.br. Veja o que guardamos, como protegemos e como exportar ou apagar seus dados.', index: true, path: '/seguranca' },
  '/redefinir-senha': { title: 'Redefinir senha | DocLimpo', description: 'Defina uma nova senha para sua conta DocLimpo a partir do link enviado por e-mail.', index: false, path: '/redefinir-senha' },
  '/conta': { title: 'Minha conta | DocLimpo', description: 'Gerencie senha, alertas por e-mail, endereço e seus dados na conta DocLimpo.', index: false, path: '/conta' },
  '/onboarding': { title: 'Cadastrar primeiro documento | DocLimpo', description: 'Escolha o tipo de documento e informe a data de vencimento para começar a organizar seus prazos no DocLimpo.', index: false, path: '/onboarding' },
  '/dashboard': { title: 'Meu painel de documentos | DocLimpo', description: 'Consulte seus documentos e próximos vencimentos no painel privado do DocLimpo.', index: false, path: '/dashboard' },
  '/404': { title: 'Página não encontrada | DocLimpo', description: 'Este endereço não foi encontrado. Volte ao início do DocLimpo ou acesse seu painel de documentos.', index: false, path: '/404' },
  '/documentos': { title: 'Documentos e prazos: guia de validade e renovação | DocLimpo', description: 'CNH, CRLV, IPVA, multa de trânsito, passaporte, RG, seguro, plano de saúde e mais: quanto tempo vale cada documento, onde renovar e como receber aviso antes de vencer.', index: true, path: '/documentos' },
  ...Object.fromEntries(DOCUMENTOS_PUBLICOS.map(item => [`/documentos/${item.slug}`, { title: item.titulo, description: item.descricao, index: true, path: `/documentos/${item.slug}` }])),
}

export function getPageMeta(pathname: string): PageMeta {
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/'
  if (/^\/documento\/[^/]+$/.test(path)) return { title: 'Detalhe do documento | DocLimpo', description: 'Consulte e atualize um documento no seu espaço privado do DocLimpo.', index: false, path: '/dashboard' }
  return Object.hasOwn(publicPages, path) ? publicPages[path] : publicPages['/404']
}

// Dados estruturados (schema.org, JSON-LD) das páginas indexáveis. Só o que a
// página mostra de verdade: nada de nota média, contagem de clientes ou
// avaliação que não existe.
export function structuredData(pathname: string): object[] {
  const meta = getPageMeta(pathname)
  if (!meta.index) return []
  const organizacao = {
    '@type': 'Organization',
    '@id': `${siteOrigin}/#organizacao`,
    name: 'DocLimpo',
    url: `${siteOrigin}/`,
    logo: `${siteOrigin}/icon-512.png`,
    ...(support.email ? { email: support.email } : {}),
    ...(support.cnpj ? { taxID: support.cnpj, legalName: support.controller } : {}),
  }
  const pergunta = (question: string, answer: string) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })

  if (meta.path === '/') {
    return [{
      '@context': 'https://schema.org',
      '@graph': [
        organizacao,
        { '@type': 'WebSite', '@id': `${siteOrigin}/#site`, name: 'DocLimpo', url: `${siteOrigin}/`, inLanguage: 'pt-BR', publisher: { '@id': organizacao['@id'] } },
        {
          '@type': 'WebApplication',
          name: 'DocLimpo',
          url: `${siteOrigin}/`,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Web',
          inLanguage: 'pt-BR',
          description: meta.description,
          publisher: { '@id': organizacao['@id'] },
          offers: [
            { '@type': 'Offer', name: 'Grátis', price: '0', priceCurrency: 'BRL' },
            ...PLANOS.map(plano => ({ '@type': 'Offer', name: plano.nome, description: plano.descricao, price: (plano.precoCentavos / 100).toFixed(2), priceCurrency: 'BRL' })),
          ],
        },
        { '@type': 'FAQPage', mainEntity: faqs.map(item => pergunta(item.question, item.answer)) },
      ],
    }]
  }

  const documento = meta.path.startsWith('/documentos/') ? documentoPublicoPorSlug(meta.path.slice('/documentos/'.length)) : null
  const trilha = [{ nome: 'DocLimpo', path: '/' }, ...(meta.path.startsWith('/documentos') ? [{ nome: 'Documentos', path: '/documentos' }] : [])]
  if (documento) trilha.push({ nome: documento.nome, path: meta.path })
  const breadcrumb = trilha.length > 1 ? [{
    '@type': 'BreadcrumbList',
    itemListElement: trilha.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.nome, item: `${siteOrigin}${item.path}` })),
  }] : []
  const faqDoDocumento = documento ? [{ '@type': 'FAQPage', mainEntity: documento.faqs.map(item => pergunta(item.pergunta, item.resposta)) }] : []
  return [{ '@context': 'https://schema.org', '@graph': [organizacao, ...breadcrumb, ...faqDoDocumento] }]
}
