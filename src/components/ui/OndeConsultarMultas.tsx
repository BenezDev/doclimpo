import { ExternalLink, Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatarData } from '../../lib/datas'
import { linksConsultaMultas } from '../../lib/multas'
import { ehUf } from '../../lib/calendario-veicular'

interface Props {
  uf?: string | null
}

// Canais oficiais para consultar e pagar a multa. Só links fixos, lidos em
// página oficial (src/data/consulta-multas-uf.ts): a UF escolhe o Detran, e
// nada do usuário entra na URL. O DocLimpo não consulta multas.
export function OndeConsultarMultas({ uf }: Props) {
  const links = linksConsultaMultas(uf)
  const temDetran = ehUf(uf) && links.length > 2
  const verificadoEm = links.reduce((mais, fonte) => (fonte.verificadoEm > mais ? fonte.verificadoEm : mais), '')

  return (
    <section className="detail-panel onde-renovar">
      <div className="detail-panel__title">
        <Landmark size={18} strokeWidth={1.75} />
        <div>
          <span className="bz-micro">Onde consultar e pagar</span>
          <h2>Canais oficiais</h2>
        </div>
      </div>
      <p className="onde-renovar__privado">
        Consulte a infração, indique o condutor, apresente defesa ou pague pelo Detran do estado ou pelo Portal SENATRAN, com login gov.br. Pelo SNE, a multa sai com 40% de desconto até o vencimento, se você não apresentar defesa nem recurso.
      </p>
      <ul className="consulta-multas">
        {links.map(fonte => (
          <li key={fonte.url}>
            <a className="onde-renovar__link" href={fonte.url} target="_blank" rel="noopener noreferrer">
              {fonte.rotulo} <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
            </a>
            {fonte.observacao && <span>{fonte.observacao}</span>}
          </li>
        ))}
      </ul>
      {!temDetran && (
        <p className="onde-renovar__privado">
          {ehUf(uf)
            ? `O portal do Detran de ${uf} ainda não foi conferido aqui; use o Portal SENATRAN, que reúne as infrações de todos os órgãos.`
            : <>Cadastre a placa e a UF do veículo em <Link to="/conta">Minha conta</Link> para ver o Detran do seu estado aqui.</>}
        </p>
      )}
      <small className="onde-renovar__nota">Links oficiais, sem cadastro no DocLimpo: você se identifica no órgão. Conferidos em {formatarData(verificadoEm)}. O DocLimpo não consulta multas nem recebe pagamentos.</small>
    </section>
  )
}
