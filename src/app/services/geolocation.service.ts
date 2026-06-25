import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Register the community background geolocation plugin
const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation');

export interface LocationLog {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
  altitude: number | null;
  isBackground: boolean;
  isSimulated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private locationsSubject = new BehaviorSubject<LocationLog[]>([]);
  public locations$: Observable<LocationLog[]> = this.locationsSubject.asObservable();

  private isTrackingSubject = new BehaviorSubject<boolean>(false);
  public isTracking$: Observable<boolean> = this.isTrackingSubject.asObservable();

  private isSimulatedSubject = new BehaviorSubject<boolean>(false);
  public isSimulated$: Observable<boolean> = this.isSimulatedSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$: Observable<string | null> = this.errorSubject.asObservable();

  private isAppBackground = false;
  private watcherId: string | null = null;
  private simIntervalId: any = null;

  constructor() {
    this.checkPlatformAndInitialize();
    this.loadLogs();
    this.setupAppLifecycleListener();
  }

  private checkPlatformAndInitialize() {
    const platform = Capacitor.getPlatform();
    // If we are on web, default to simulation mode
    if (platform === 'web') {
      this.isSimulatedSubject.next(true);
      console.log('Running on web: Geolocation simulation mode enabled by default.');
    }
  }

  private setupAppLifecycleListener() {
    App.addListener('appStateChange', (state) => {
      this.isAppBackground = !state.isActive;
      console.log(`App lifecycle change: background = ${this.isAppBackground}`);
      
      // Log application state change as an info log
      this.addLogText(`App state changed: ${state.isActive ? 'FOREGROUND' : 'BACKGROUND'}`);
    });
  }

  // Load locations from localStorage
  private loadLogs() {
    try {
      const stored = localStorage.getItem('gps_track_logs');
      if (stored) {
        this.locationsSubject.next(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading logs from localStorage', e);
    }
  }

  // Save locations to localStorage
  private saveLogs(logs: LocationLog[]) {
    try {
      localStorage.setItem('gps_track_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('Error saving logs to localStorage', e);
    }
  }

  // Set simulation mode manually (only useful on native device for testing)
  public setSimulationMode(enabled: boolean) {
    if (this.isTrackingSubject.value) {
      this.stopTracking();
    }
    this.isSimulatedSubject.next(enabled);
  }

  // Start background geolocation tracking
  public async startTracking(distanceFilter: number = 5) {
    if (this.isTrackingSubject.value) return;

    this.errorSubject.next(null);
    this.isTrackingSubject.next(true);
    this.addLogText('Rastreo iniciado');

    if (this.isSimulatedSubject.value) {
      this.startSimulation(distanceFilter);
    } else {
      await this.startNativeTracking(distanceFilter);
    }
  }

  // Stop background geolocation tracking
  public async stopTracking() {
    if (!this.isTrackingSubject.value) return;

    this.isTrackingSubject.next(false);
    this.addLogText('Rastreo detenido');

    if (this.watcherId) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
        this.watcherId = null;
      } catch (err: any) {
        console.error('Error removing native watcher:', err);
      }
    }

    if (this.simIntervalId) {
      clearInterval(this.simIntervalId);
      this.simIntervalId = null;
    }
  }

  // Clear all saved location logs
  public clearLogs() {
    this.locationsSubject.next([]);
    localStorage.removeItem('gps_track_logs');
    this.addLogText('Historial limpiado');
  }

  // Internal helper to add location entry
  private addLocationEntry(latitude: number, longitude: number, accuracy: number, speed: number | null, altitude: number | null, isSimulated: boolean) {
    const newEntry: LocationLog = {
      latitude,
      longitude,
      accuracy,
      timestamp: Date.now(),
      speed,
      altitude,
      isBackground: this.isAppBackground,
      isSimulated
    };

    const currentLogs = this.locationsSubject.value;
    // Limit to last 1000 logs to prevent memory overflow, keeping recent ones at the end
    const updatedLogs = [...currentLogs, newEntry].slice(-1000);
    
    this.locationsSubject.next(updatedLogs);
    this.saveLogs(updatedLogs);
  }

  // Start native background geolocation watcher
  private async startNativeTracking(distanceFilter: number) {
    try {
      this.watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Registrando tu ubicación en segundo plano...',
          backgroundTitle: 'GPS Activo',
          requestPermissions: true,
          stale: false,
          distanceFilter: distanceFilter // Minimum distance in meters to trigger callback
        },
        (location: any, error: any) => {
          if (error) {
            console.error('Callback error in native background geolocation:', error);
            let errMsg = 'Error en el GPS';
            if (error.code === 'NOT_AUTHORIZED') {
              errMsg = 'Permiso denegado. Activa "Permitir siempre" en los ajustes.';
            }
            this.errorSubject.next(errMsg);
            this.stopTracking();
            return;
          }

          if (location) {
            this.addLocationEntry(
              location.latitude,
              location.longitude,
              location.accuracy,
              location.speed || null,
              location.altitude || null,
              false
            );
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to start native background geolocation:', err);
      this.errorSubject.next('No se pudo iniciar el servicio GPS nativo. ¿Estás en un navegador?');
      this.stopTracking();
    }
  }

  // Start web simulation using a random walk algorithm from the user's approximate or fixed point
  private startSimulation(distanceFilter: number) {
    // Starting coordinates (default around Buenos Aires or general default, let's use a nice coordinates set)
    let currentLat = -0.180653;
    let currentLng = -78.467834;

    // Try to get actual browser position once to seed the simulation, otherwise use default
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          currentLat = position.coords.latitude;
          currentLng = position.coords.longitude;
          this.addLogText(`Simulación iniciada en tu ubicación actual.`);
          this.generateSimulatedPoint(currentLat, currentLng);
        },
        () => {
          this.addLogText(`Simulación iniciada en ubicación por defecto.`);
          this.generateSimulatedPoint(currentLat, currentLng);
        }
      );
    } else {
      this.generateSimulatedPoint(currentLat, currentLng);
    }

    // Interval to simulate walking
    this.simIntervalId = setInterval(() => {
      // Walk simulation: random step in latitude and longitude
      // Approx 0.0001 degrees is ~11 meters
      const step = (distanceFilter / 111000) * (0.5 + Math.random()); 
      const angle = Math.random() * Math.PI * 2;
      
      currentLat += step * Math.sin(angle);
      currentLng += step * Math.cos(angle);

      this.generateSimulatedPoint(currentLat, currentLng);
    }, 4000); // Trigger every 4 seconds
  }

  private generateSimulatedPoint(lat: number, lng: number) {
    const mockAccuracy = Math.floor(Math.random() * 5) + 3; // 3-8 meters
    const mockSpeed = parseFloat((Math.random() * 2 + 1).toFixed(2)); // 1-3 m/s (walking speed)
    const mockAltitude = Math.floor(Math.random() * 10) + 40; // 40-50m
    
    this.addLocationEntry(lat, lng, mockAccuracy, mockSpeed, mockAltitude, true);
  }

  // Helper log for debugging app state transitions in history
  private addLogText(message: string) {
    console.log(`[GeoService Log] ${message}`);
  }
}
