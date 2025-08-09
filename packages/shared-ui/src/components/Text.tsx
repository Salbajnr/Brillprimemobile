import { ReactNode, HTMLAttributes } from 'react'

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, 'style'> {
  children: ReactNode
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'overline'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'inherit'
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
  align?: 'left' | 'center' | 'right'
  style?: any // Support both React and React Native styles
  numberOfLines?: number // React Native compatibility
}

const Text = ({ 
  children, 
  variant = 'body',
  color = 'inherit',
  weight = 'normal',
  align = 'left',
  className = '',
  style,
  numberOfLines,
  ...props 
}: TextProps) => {
  const baseClasses = 'text-inherit'
  
  const variantClasses = {
    h1: 'text-4xl font-bold leading-tight',
    h2: 'text-3xl font-bold leading-tight',
    h3: 'text-2xl font-semibold leading-snug',
    h4: 'text-xl font-semibold leading-snug',
    h5: 'text-lg font-medium leading-normal',
    h6: 'text-base font-medium leading-normal',
    body: 'text-base leading-normal',
    caption: 'text-sm leading-tight',
    overline: 'text-xs uppercase tracking-wide'
  }
  
  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    inherit: ''
  }
  
  const weightClasses = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  }
  
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${colorClasses[color]} ${weightClasses[weight]} ${alignClasses[align]} ${className}`.trim()
  
  // Handle line clamping for React Native Web compatibility
  const lineClampStyle = numberOfLines ? {
    display: '-webkit-box',
    WebkitLineClamp: numberOfLines,
    WebkitBoxOrient: 'vertical' as any,
    overflow: 'hidden'
  } : {}
  
  const combinedStyle = { ...lineClampStyle, ...style }
  
  // Choose appropriate HTML element based on variant
  const getElement = () => {
    switch (variant) {
      case 'h1': return 'h1'
      case 'h2': return 'h2'
      case 'h3': return 'h3'
      case 'h4': return 'h4'
      case 'h5': return 'h5'
      case 'h6': return 'h6'
      default: return 'p'
    }
  }
  
  const Element = getElement()
  
  return (
    <Element 
      className={classes} 
      style={combinedStyle}
      {...props}
    >
      {children}
    </Element>
  )
}

export default Text