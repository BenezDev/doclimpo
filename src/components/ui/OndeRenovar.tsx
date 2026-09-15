import { Building2, ExternalLink, MapPin, MapPinned, Navigation } from 'lucide-react'
import { linkMapaFallback } from '../../lib/renovacao'
import { melhorRenovacao, temEndereco, type PerfilEndereco } from '../../lib/endereco'
import { Button } from './Bezel'

interface Props {
  tipo: string
  perfil: PerfilEndereco | null
  onCadastrarEndereco: () => void
}

function formatarDistancia(km: number): string {
  if (km < 1) return '< 1 km'
  if (km < 10) return `~${km.toFixed(1).replace('.', ',')} km`
  return `~${Math.round(km)} km`
}

export function OndeRenovar({ tipo, perfil, onCadastrarEndereco }: Props) {
  const { autoridade, unidades, linkMapa } = melhorRenovacao(tipo, perfil)

  const header = (
    <div className="detail-panel__title">
      <MapPin size={18} strokeWidth={1.75} />
      <div>
        <span className="bz-micro">Onde renovar</span>
        <h2>Locais perto de você</h2>
      </div>
    </div>
  )

  // Documento privado ou 100% online: não há unidade física para indicar.
  if (autoridade.privado) {
    return (
      <section className="detail-panel onde-renovar">
        {header}
        <p className="onde-renovar__privado">{autoridade.observacao ?? `A renovação é feita diretamente com ${autoridade.orgao.toLowerCase()}.`}</p>
        {autoridade.portalUrl && (
          <div className="onde-renovar__fallback-acoes">
            <a className="onde-renovar__link" href={autoridade.portalUrl} target="_blank" rel="noopener noreferrer">
              <Building2 size={14} strokeWidth={1.75} /> Portal oficial <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
            </a>
          </div>
        )}
      </section>
    )
  }

  // Sem endereço cadastrado: convida a cadastrar.
  if (!temEndereco(perfil)) {
    return (
      <section className="detail-panel onde-renovar">
        {header}
        <div className="onde-renovar__vazio">
          <span className="onde-renovar__vazio-icon"><MapPinned size={22} strokeWidth={1.75} /></span>
          <p>Cadastre seu endereço para ver a unidade de <strong>{autoridade.orgao}</strong> mais próxima de você.</p>
          <Button type="button" variant="secondary" size="sm" onClick={onCadastrarEndereco} icon={<MapPin size={15} strokeWidth={1.75} />}>
            Cadastrar endereço
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="detail-panel onde-renovar">
      {header}

      {unidades.length > 0 ? (
        <>
          <div className="onde-renovar__lista">
            {unidades.map((unidade, index) => (
              <a
                key={unidade.id}
                className="onde-renovar__unidade"
                href={linkMapaFallback(unidade.nome, { cidade: unidade.cidade, uf: unidade.uf })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="onde-renovar__unidade-icon"><Building2 size={18} strokeWidth={1.75} /></span>
                <span className="onde-renovar__unidade-info">
                  <strong>{unidade.nome}</strong>
                  <small>
                    {index === 0 && <span className="onde-renovar__badge">Mais próxima</span>}
                    <span>{[unidade.regiao, `${unidade.cidade}/${unidade.uf}`].filter(Boolean).join(' · ')}</span>
                  </small>
                </span>
                <span className="onde-renovar__unidade-dist">
                  <span className="bz-data">{formatarDistancia(unidade.distanciaKm)}</span>
                  <Navigation size={14} strokeWidth={1.75} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
          <small className="onde-renovar__nota">
            Distância aproximada, do centro da sua cidade. Confirme endereço, horário e exigências no mapa ou no portal oficial antes de ir.
          </small>
        </>
      ) : (
        <div className="onde-renovar__fallback">
          <p>Ainda não temos uma unidade catalogada perto de você para <strong>{autoridade.orgao}</strong>. Busque a mais próxima:</p>
          <div className="onde-renovar__fallback-acoes">
            <a className="onde-renovar__link" href={linkMapa} target="_blank" rel="noopener noreferrer">
              <MapPin size={14} strokeWidth={1.75} /> Ver no mapa <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
            </a>
            {autoridade.portalUrl && (
              <a className="onde-renovar__link" href={autoridade.portalUrl} target="_blank" rel="noopener noreferrer">
                <Building2 size={14} strokeWidth={1.75} /> Portal oficial <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}

      {autoridade.observacao && !autoridade.privado && (
        <small className="onde-renovar__aviso">{autoridade.observacao}</small>
      )}
    </section>
  )
}
