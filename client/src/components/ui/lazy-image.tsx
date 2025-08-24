import React, { useState, useRef, useEffect } from 'react';
import { usePerformance } from '../../hooks/use-performance';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  sizes?: string;
  priority?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PC9zdmc+',
  sizes = '100vw',
  priority = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { getOptimalImageQuality } = usePerformance();

  // Generate optimized image URLs
  const getOptimizedSrc = (originalSrc: string, quality: number) => {
    if (originalSrc.startsWith('data:') || originalSrc.includes('base64')) return originalSrc;

    const url = new URL(originalSrc, window.location.origin);
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('f', 'webp');
    return url.toString();
  };

  const optimizedSrc = getOptimizedSrc(src, getOptimalImageQuality());
  const fallbackSrc = src;

  useEffect(() => {
    if (priority) return; // Skip intersection observer for priority images

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px 0px' // Start loading 50px before entering viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Preload critical images
  useEffect(() => {
    if (priority && isInView) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedSrc;
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, isInView, optimizedSrc]);

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <picture ref={imgRef} className={className}>
      {isInView && !hasError && (
        <>
          <source srcSet={optimizedSrc} type="image/webp" sizes={sizes} />
          <img
            src={hasError ? fallbackSrc : optimizedSrc}
            alt={alt}
            className={`transition-all duration-300 ${
              isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
            }`}
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            sizes={sizes}
          />
        </>
      )}
      {(!isInView || hasError) && (
        <img
          src={placeholder}
          alt={alt}
          className="opacity-50 blur-sm transition-opacity duration-300"
        />
      )}
    </picture>
  );
};