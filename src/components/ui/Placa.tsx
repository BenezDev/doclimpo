import { formatarPlaca } from '../../lib/veiculos'

// Placa desenhada no estilo Mercosul (faixa azul "BRASIL"). Placa antiga
// (AAA0000) aparece sem a faixa, como é na rua.
export function Placa({ placa, size = 'md' }: { placa: string; size?: 'sm' | 'md' | 'lg' }) {
  const mercosul = !/^[A-Z]{3}[0-9]{4}$/.test(placa)
  const texto = formatarPlaca(placa)
  return (
    <span className={`bz-placa bz-placa--${size}${mercosul ? '' : ' bz-placa--antiga'}`} role="img" aria-label={`Placa ${texto}`}>
      {mercosul && <span className="bz-placa__faixa" aria-hidden="true">BRASIL</span>}
      <span className="bz-placa__numero" aria-hidden="true">{texto}</span>
    </span>
  )
}
