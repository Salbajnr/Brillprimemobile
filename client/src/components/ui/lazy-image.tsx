
import React, { useState, useRef, useEffect } from 'react'
import { cn, createIntersectionObserver, optimizeImageUrl } from '@/lib/utils'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  width?: number
  height?: number
  quality?: number
  className?: string
  fallback?: string
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 80,
  className,
  fallback = '/placeholder.jpg',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = createIntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer?.disconnect()
        }
      }
    )

    if (observer && imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer?.disconnect()
  }, [])

  const optimizedSrc = optimizeImageUrl(src, width, quality)
  const imageSrc = hasError ? fallback : optimizedSrc

  return (
    <div 
      ref={imgRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height }}
    >
      {isInView && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          {...props}
        />
      )}
      {!isLoaded && isInView && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}
