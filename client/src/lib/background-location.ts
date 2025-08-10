interface LocationOptions {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  distanceFilter: number;
  interval: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  timestamp: number;
  altitude?: number;
  altitudeAccuracy?: number;
}

class BackgroundLocationService {
  private watchId: number | null = null;
  private isTracking = false;
  private lastKnownLocation: LocationData | null = null;
  private updateInterval: number | null = null;
  private options: LocationOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 10000,
    distanceFilter: 10, // meters
    interval: 15000 // 15 seconds
  };

  constructor() {
    this.registerServiceWorker();
    this.setupVisibilityHandlers();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered:', registration);

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    if (event.data.type === 'LOCATION_UPDATE') {
      this.handleLocationUpdate(event.data.location);
    }
  }

  private setupVisibilityHandlers() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isTracking) {
        this.enableBackgroundTracking();
      } else if (!document.hidden && this.isTracking) {
        this.enableForegroundTracking();
      }
    });
  }

  async startTracking(userRole: 'DRIVER' | 'USER' = 'DRIVER'): Promise<boolean> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    // Request permissions
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        throw new Error('Geolocation permission denied');
      }
    }

    this.isTracking = true;

    if (userRole === 'DRIVER') {
      await this.enableForegroundTracking();
      await this.setupPeriodicSync();
    } else {
      await this.enableBasicTracking();
    }

    return true;
  }

  private async enableForegroundTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          altitude: position.coords.altitude || undefined,
          altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
          timestamp: Date.now()
        };

        this.handleLocationUpdate(locationData);
      },
      (error) => {
        console.error('Location error:', error);
        this.handleLocationError(error);
      },
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        timeout: this.options.timeout,
        maximumAge: this.options.maximumAge
      }
    );
  }

  private async enableBackgroundTracking() {
    // Send message to service worker to start background tracking
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'START_BACKGROUND_LOCATION',
        options: this.options
      });
    }
  }

  private async enableBasicTracking() {
    // For non-drivers, use less frequent updates
    this.updateInterval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          this.handleLocationUpdate(locationData);
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }, 60000); // Every minute
  }

  private async setupPeriodicSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('location-sync');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  private async handleLocationUpdate(locationData: LocationData) {
    // Check distance filter
    if (this.shouldUpdateLocation(locationData)) {
      this.lastKnownLocation = locationData;

      try {
        await this.sendLocationToServer(locationData);
        this.broadcastLocationUpdate(locationData);
        this.storeLocationLocally(locationData);
      } catch (error) {
        console.error('Failed to update location:', error);
        this.storeLocationForLaterSync(locationData);
      }
    }
  }

  private shouldUpdateLocation(newLocation: LocationData): boolean {
    if (!this.lastKnownLocation) return true;

    const distance = this.calculateDistance(
      this.lastKnownLocation.latitude,
      this.lastKnownLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    return distance >= this.options.distanceFilter;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private async sendLocationToServer(locationData: LocationData) {
    const response = await fetch('/api/driver-location/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(locationData)
    });

    if (!response.ok) {
      throw new Error(`Location update failed: ${response.statusText}`);
    }
  }

  private broadcastLocationUpdate(locationData: LocationData) {
    // Broadcast to other tabs/windows
    const bc = new BroadcastChannel('location-updates');
    bc.postMessage({ type: 'LOCATION_UPDATE', location: locationData });
  }

  private storeLocationLocally(locationData: LocationData) {
    localStorage.setItem('lastKnownLocation', JSON.stringify(locationData));
  }

  private storeLocationForLaterSync(locationData: LocationData) {
    const pending = JSON.parse(localStorage.getItem('pendingLocationUpdates') || '[]');
    pending.push(locationData);
    localStorage.setItem('pendingLocationUpdates', JSON.stringify(pending.slice(-50))); // Keep last 50
  }

  private handleLocationError(error: GeolocationPositionError) {
    const errorMessages = {
      1: 'Location access denied by user',
      2: 'Location unavailable',
      3: 'Location request timed out'
    };

    console.error(`Location error: ${errorMessages[error.code] || 'Unknown error'}`);

    // Retry logic for temporary errors
    if (error.code === 2 || error.code === 3) {
      setTimeout(() => {
        if (this.isTracking) {
          this.enableForegroundTracking();
        }
      }, 30000); // Retry after 30 seconds
    }
  }

  async stopTracking() {
    this.isTracking = false;

    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Stop background tracking
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STOP_BACKGROUND_LOCATION'
      });
    }
  }

  getLastKnownLocation(): LocationData | null {
    return this.lastKnownLocation || JSON.parse(localStorage.getItem('lastKnownLocation') || 'null');
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  async syncPendingLocations() {
    const pending = JSON.parse(localStorage.getItem('pendingLocationUpdates') || '[]');

    for (const locationData of pending) {
      try {
        await this.sendLocationToServer(locationData);
      } catch (error) {
        console.error('Failed to sync location:', error);
        break; // Stop on first failure
      }
    }

    localStorage.removeItem('pendingLocationUpdates');
  }
}

export const backgroundLocationService = new BackgroundLocationService();