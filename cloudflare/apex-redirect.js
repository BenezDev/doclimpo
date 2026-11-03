// doclimpo.com → https://www.doclimpo.com, mesmo caminho e query (301).
// O endereço canônico é o www: é ele que o CORS das Edge Functions aceita.
export default {
  fetch(request) {
    const url = new URL(request.url)
    url.protocol = 'https:'
    url.hostname = 'www.doclimpo.com'
    url.port = ''
    return Response.redirect(url.toString(), 301)
  },
}
