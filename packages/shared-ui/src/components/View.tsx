import { ReactNode, HTMLAttributes } from 'react'

export interface ViewProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  children?: ReactNode
  style?: any // Support both React and React Native styles
  flex?: number
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  padding?: number | string
  margin?: number | string
  backgroundColor?: string
  borderRadius?: number | string
}

const View = ({ 
  children,
  className = '',
  style,
  flex,
  flexDirection,
  justifyContent,
  alignItems,
  padding,
  margin,
  backgroundColor,
  borderRadius,
  ...props 
}: ViewProps) => {
  // Build flexbox classes
  const flexClasses = [
    flex !== undefined ? 'flex' : '',
    flexDirection ? `flex-${flexDirection}` : '',
    justifyContent ? `justify-${justifyContent}` : '',
    alignItems ? `items-${alignItems}` : ''
  ].filter(Boolean).join(' ')
  
  const classes = `${flexClasses} ${className}`.trim()
  
  // Build inline styles for React Native Web compatibility
  const inlineStyle = {
    ...(flex !== undefined && { flex }),
    ...(flexDirection && { flexDirection }),
    ...(justifyContent && { justifyContent }),
    ...(alignItems && { alignItems }),
    ...(padding && { padding: typeof padding === 'number' ? `${padding}px` : padding }),
    ...(margin && { margin: typeof margin === 'number' ? `${margin}px` : margin }),
    ...(backgroundColor && { backgroundColor }),
    ...(borderRadius && { borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius }),
    ...style
  }
  
  return (
    <div 
      className={classes}
      style={inlineStyle}
      {...props}
    >
      {children}
    </div>
  )
}

export default View