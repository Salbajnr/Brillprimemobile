
interface PWACapabilities {
  installable: boolean;
  standalone: boolean;
  notificationsSupported: boolean;
  backgroundSyncSupported: boolean;
  locationSupported: boolean;
  biometricsSupported: boolean;
}

class PWAManager {
  private deferredPrompt: any = null;
  private updateAvailable = false;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.initializeServiceWorker();
    this.setupInstallPrompt();
    this.setupUpdateListener();
    this.setupVisibilityHandler();
  }

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('PWA: Service Worker registered');
        
        // Listen for updates
        this.registration.addEventListener('updatefound', () => {
          console.log('PWA: Update found');
          this.handleServiceWorkerUpdate();
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        
        // Check for updates
        this.registration.update();
      } catch (error) {
        console.error('PWA: Service Worker registration failed:', error);
      }
    }
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('PWA: Install prompt available');
      this.showInstallBanner();
    });
  }

  private setupUpdateListener() {
    window.addEventListener('load', () => {
      if (this.registration) {
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateAvailable = true;
                this.showUpdateBanner();
              }
            });
          }
        });
      }
    });
  }

  private setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.registration) {
        // Check for updates when app becomes visible
        this.registration.update();
      }
    });
  }

  private handleServiceWorkerUpdate() {
    if (this.registration?.installing) {
      const newWorker = this.registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          this.updateAvailable = true;
          this.showUpdateBanner();
        }
      });
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    if (event.data?.type === 'APP_UPDATED') {
      window.location.reload();
    }
  }

  private showInstallBanner() {
    // Create install banner
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 z-50 flex justify-between items-center';
    banner.innerHTML = `
      <div class="flex items-center space-x-3">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
        <span>Install BrillPrime app for better experience</span>
      </div>
      <div class="flex space-x-2">
        <button id="install-app" class="bg-white text-blue-600 px-4 py-2 rounded font-medium">Install</button>
        <button id="dismiss-install" class="text-white px-4 py-2">Dismiss</button>
      </div>
    `;

    document.body.appendChild(banner);

    // Handle install
    banner.querySelector('#install-app')?.addEventListener('click', () => {
      this.installApp();
    });

    // Handle dismiss
    banner.querySelector('#dismiss-install')?.addEventListener('click', () => {
      banner.remove();
      localStorage.setItem('pwa-install-dismissed', 'true');
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (document.getElementById('pwa-install-banner')) {
        banner.remove();
      }
    }, 10000);
  }

  private showUpdateBanner() {
    // Create update banner
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.className = 'fixed bottom-4 left-4 right-4 bg-green-600 text-white p-4 rounded-lg z-50 flex justify-between items-center';
    banner.innerHTML = `
      <div class="flex items-center space-x-3">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
        </svg>
        <span>App update available</span>
      </div>
      <div class="flex space-x-2">
        <button id="update-app" class="bg-white text-green-600 px-4 py-2 rounded font-medium">Update</button>
        <button id="dismiss-update" class="text-white px-4 py-2">Later</button>
      </div>
    `;

    document.body.appendChild(banner);

    // Handle update
    banner.querySelector('#update-app')?.addEventListener('click', () => {
      this.updateApp();
    });

    // Handle dismiss
    banner.querySelector('#dismiss-update')?.addEventListener('click', () => {
      banner.remove();
    });
  }

  async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: App installed');
        document.getElementById('pwa-install-banner')?.remove();
        return true;
      } else {
        console.log('PWA: App installation dismissed');
        return false;
      }
    } catch (error) {
      console.error('PWA: Installation failed:', error);
      return false;
    } finally {
      this.deferredPrompt = null;
    }
  }

  updateApp() {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      document.getElementById('pwa-update-banner')?.remove();
    }
  }

  async checkCapabilities(): Promise<PWACapabilities> {
    const capabilities: PWACapabilities = {
      installable: !!this.deferredPrompt || window.matchMedia('(display-mode: standalone)').matches,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      notificationsSupported: 'Notification' in window,
      backgroundSyncSupported: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      locationSupported: 'geolocation' in navigator,
      biometricsSupported: 'credentials' in navigator && 'PublicKeyCredential' in window
    };

    return capabilities;
  }

  async enableNotifications(): Promise<boolean> {
    if (!('Notification' in window)) return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('PWA: Notification permission failed:', error);
      return false;
    }
  }

  async registerForPushNotifications(): Promise<string | null> {
    if (!this.registration) return null;

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.VAPID_PUBLIC_KEY || '')
      });

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(subscription)
      });

      return JSON.stringify(subscription);
    } catch (error) {
      console.error('PWA: Push notification registration failed:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async cacheOfflineAction(action: any) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_OFFLINE_ACTION',
        action
      });
    }
  }

  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }
}

export const pwaManager = new PWAManager();
