import { motion, useReducedMotion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './Bezel'
import { bezelSpring } from '../../lib/motion'
import { persistConsent, readStoredConsent, shouldPrompt } from '../../lib/consent'

export function CookieConsent() {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(() => shouldPrompt(readStoredConsent()))

  if (!visible) return null

  const accept = () => {
    persistConsent()
    setVisible(false)
  }

  return (
    <motion.aside
      className="bz-cookie"
      role="region"
      aria-label="Aviso de cookies e armazenamento"
      initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : bezelSpring}
    >
      <span className="bz-cookie__icon" aria-hidden="true">
        <ShieldCheck size={20} strokeWidth={1.75} />
      </span>
      <div className="bz-cookie__text">
        <strong>Cookies e armazenamento</strong>
        <p>
          Usamos armazenamento local essencial — para manter você conectado e lembrar a
          preferência de tema — e métricas de acesso agregadas, sem cookie e sem identificar você
          (Vercel Web Analytics). Não há cookies de publicidade. Saiba mais na{' '}
          <Link to="/privacidade">política de privacidade</Link>.
        </p>
      </div>
      <Button type="button" variant="primary" size="sm" onClick={accept}>
        Aceitar
      </Button>
    </motion.aside>
  )
}
