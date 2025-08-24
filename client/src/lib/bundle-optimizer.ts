
// Bundle optimization utilities
export const preloadRoute = (routePath: string) => {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = routePath;
  document.head.appendChild(link);
};

export const prefetchRoute = (routePath: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = routePath;
  document.head.appendChild(link);
};

export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.as = 'font';
  fontLink.type = 'font/woff2';
  fontLink.crossOrigin = 'anonymous';
  fontLink.href = '/fonts/inter-var.woff2';
  document.head.appendChild(fontLink);

  // Preload critical CSS
  const cssLink = document.createElement('link');
  cssLink.rel = 'preload';
  cssLink.as = 'style';
  cssLink.href = '/src/index.css';
  document.head.appendChild(cssLink);
};

export const optimizeThirdPartyScripts = () => {
  // Load non-critical third-party scripts after page load
  if (document.readyState === 'complete') {
    loadThirdPartyScripts();
  } else {
    window.addEventListener('load', loadThirdPartyScripts);
  }
};

const loadThirdPartyScripts = () => {
  // Lazy load analytics after user interaction
  let userInteracted = false;
  const loadAnalytics = () => {
    if (!userInteracted) {
      userInteracted = true;
      // Load analytics scripts here
      console.log('Loading analytics after user interaction');
    }
  };

  ['click', 'scroll', 'keydown', 'touchstart'].forEach(event => {
    document.addEventListener(event, loadAnalytics, { once: true, passive: true });
  });
};

export const setupResourceHints = () => {
  // DNS prefetch for external domains
  const domains = ['api.paystack.co', 'fonts.googleapis.com'];
  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = `//${domain}`;
    document.head.appendChild(link);
  });

  // Preconnect to critical origins
  const criticalOrigins = ['/api'];
  criticalOrigins.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    document.head.appendChild(link);
  });
};
