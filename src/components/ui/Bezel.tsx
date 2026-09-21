import type { ButtonHTMLAttributes, ReactNode } from 'react'
import {
  BellRing,
  BriefcaseBusiness,
  CarFront,
  FileCheck2,
  FileSignature,
  FileText,
  HeartPulse,
  IdCard,
  Moon,
  PackageCheck,
  Plane,
  ReceiptText,
  ShieldCheck,
  Siren,
  Stethoscope,
  Sun,
} from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

export function Button({
  className = '',
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`bz-button bz-button--${variant} bz-button--${size} ${className}`.trim()}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

export function Brand() {
  return (
    <span className="bz-brand" aria-label="DocLimpo">
      <span className="bz-brand__mark" aria-hidden="true">D<span>L</span></span>
      <span className="bz-brand__name">DocLimpo</span>
    </span>
  )
}

export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      className="bz-icon-button"
      onClick={onToggle}
      type="button"
      aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
    >
      {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  )
}

export type DocumentStatus = 'vigente' | 'atencao' | 'critico' | 'vencido' | 'resolvido'

const statusLabels: Record<DocumentStatus, string> = {
  vigente: 'Vigente',
  atencao: 'Atenção',
  critico: 'Crítico',
  vencido: 'Vencido',
  resolvido: 'Resolvido',
}

export function StatusPill({ status, label }: { status: DocumentStatus; label?: string }) {
  return (
    <span className={`bz-status bz-status--${status}`}>
      <span className="bz-status__dot" aria-hidden="true" />
      {label ?? statusLabels[status]}
    </span>
  )
}

const documentIcons = {
  cnh: IdCard,
  crlv: CarFront,
  ipva: ReceiptText,
  multa: Siren,
  passaporte: Plane,
  rg: IdCard,
  seguro: ShieldCheck,
  plano_saude: HeartPulse,
  carteira_trabalho: BriefcaseBusiness,
  garantia: PackageCheck,
  contrato: FileSignature,
  exame: Stethoscope,
  outro: FileText,
}

export function DocumentGlyph({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = documentIcons[type as keyof typeof documentIcons] ?? FileText
  return (
    <span className={`bz-document-glyph bz-document-glyph--${size}`} aria-hidden="true">
      <Icon size={size === 'lg' ? 24 : size === 'sm' ? 16 : 20} strokeWidth={1.75} />
    </span>
  )
}

export function AlertChannel({ children }: { children: ReactNode }) {
  return (
    <span className="bz-alert-channel">
      <BellRing size={14} strokeWidth={1.75} aria-hidden="true" />
      {children}
    </span>
  )
}

export function SuccessMark() {
  return (
    <span className="bz-success-mark" aria-hidden="true">
      <FileCheck2 size={28} strokeWidth={1.75} />
    </span>
  )
}
