import { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = ({ 
  children, 
  className = '', 
  padding = 'md',
  shadow = 'sm'
}: CardProps) => {
  const baseClasses = 'bg-white rounded-lg border border-gray-200'
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow',
    lg: 'shadow-lg'
  }
  
  const classes = `${baseClasses} ${paddingClasses[padding]} ${shadowClasses[shadow]} ${className}`.trim()
  
  return (
    <div className={classes}>
      {children}
    </div>
  )
}

export default Card
