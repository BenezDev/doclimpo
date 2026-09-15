import { Link, type LinkProps } from 'react-router-dom'

export function ActionLink({ variant = 'secondary', size = 'md', className = '', children, ...props }: LinkProps & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}) {
  return <Link className={`bz-button bz-button--${variant} bz-button--${size} ${className}`} {...props}>{children}</Link>
}
