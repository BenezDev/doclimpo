import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPageMeta, siteOrigin } from '../lib/page-meta'

export function PageMetadata() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const meta = getPageMeta(pathname)
    document.title = meta.title
    const values = [
      ['name', 'description', meta.description], ['name', 'robots', meta.index ? 'index,follow' : 'noindex,follow'],
      ['property', 'og:title', meta.title], ['property', 'og:description', meta.description],
      ['property', 'og:url', `${siteOrigin}${meta.path}`], ['name', 'twitter:title', meta.title], ['name', 'twitter:description', meta.description],
    ]
    for (const [attribute, name, content] of values) {
      let element = document.head.querySelector(`meta[${attribute}="${name}"]`)
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, name); document.head.append(element) }
      element.setAttribute('content', content)
    }
    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.append(canonical) }
    canonical.setAttribute('href', `${siteOrigin}${meta.path}`)
  }, [pathname])

  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}
