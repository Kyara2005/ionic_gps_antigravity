import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonToggle, IonList, IonItem, IonLabel,
  IonBadge, IonGrid, IonRow, IonCol, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { addIcons } from 'ionicons';
import { 
  playOutline, stopOutline, trashOutline, downloadOutline, 
  locationOutline, speedometerOutline, shieldCheckmarkOutline, 
  bugOutline, optionsOutline, timeOutline, checkmarkCircleOutline,
  cellularOutline
} from 'ionicons/icons';

import { GeolocationService, LocationLog } from '../services/geolocation.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonToggle, IonList, IonItem, IonLabel,
    IonBadge, IonGrid, IonRow, IonCol, IonSelect, IonSelectOption
  ]
})
export class HomePage implements OnInit, OnDestroy, AfterViewInit {
  public locations: LocationLog[] = [];
  public isTracking = false;
  public isSimulated = false;
  public error: string | null = null;
  public distanceFilter = 5;

  private map: L.Map | null = null;
  private pathLine: L.Polyline | null = null;
  private currentMarker: L.CircleMarker | null = null;
  private breadcrumbs: L.CircleMarker[] = [];

  private subs: Subscription[] = [];

  constructor(private geoService: GeolocationService) {
    // Add all utilized Ionicons
    addIcons({
      playOutline, stopOutline, trashOutline, downloadOutline,
      locationOutline, speedometerOutline, shieldCheckmarkOutline,
      bugOutline, optionsOutline, timeOutline, checkmarkCircleOutline,
      cellularOutline
    });
  }

  ngOnInit() {
    // Subscribe to tracking status
    this.subs.push(
      this.geoService.isTracking$.subscribe((val) => {
        this.isTracking = val;
      })
    );

    // Subscribe to simulation mode
    this.subs.push(
      this.geoService.isSimulated$.subscribe((val) => {
        this.isSimulated = val;
      })
    );

    // Subscribe to error events
    this.subs.push(
      this.geoService.error$.subscribe((err) => {
        this.error = err;
      })
    );

    // Subscribe to location updates
    this.subs.push(
      this.geoService.locations$.subscribe((list) => {
        this.locations = list;
        this.updateMap(list);
      })
    );
  }

  ngAfterViewInit() {
    // Leaflet map needs a small timeout to ensure the DOM layout is complete
    setTimeout(() => {
      this.initMap();
    }, 400);
  }

  ngOnDestroy() {
    // Cleanup subscriptions
    this.subs.forEach(s => s.unsubscribe());
    
    // Cleanup map
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // Handle map container size updates when view loads
  ionViewDidEnter() {
    if (this.map) {
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 200);
    }
  }

  // Initialize Leaflet Map
  private initMap() {
    const defaultCoords: L.LatLngExpression = [-34.6037, -58.3816]; // Buenos Aires fallback
    
    this.map = L.map('map-container', {
      zoomControl: true,
      attributionControl: false
    }).setView(defaultCoords, 16);

    // Add high quality tile layer from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.map);

    // Create polyline to display path history
    this.pathLine = L.polyline([], {
      color: '#6366f1', // Indigo premium color
      weight: 5,
      opacity: 0.8,
      lineJoin: 'round'
    }).addTo(this.map);

    // If locations already exist (from storage), update the map
    if (this.locations.length > 0) {
      this.updateMap(this.locations);
    }
  }

  // Update map coordinates, trail polyline, and markers
  private updateMap(list: LocationLog[]) {
    if (!this.map || !this.pathLine) return;

    // Clear old breadcrumbs
    this.breadcrumbs.forEach(marker => marker.remove());
    this.breadcrumbs = [];

    if (list.length === 0) {
      this.pathLine.setLatLngs([]);
      if (this.currentMarker) {
        this.currentMarker.remove();
        this.currentMarker = null;
      }
      return;
    }

    const latLngs = list.map(item => L.latLng(item.latitude, item.longitude));
    this.pathLine.setLatLngs(latLngs);

    // Draw breadcrumb dot markers for historical coordinates
    list.forEach((item, index) => {
      // Don't draw breadcrumb for the last point, as it has the current marker
      if (index === list.length - 1) return;

      const isBg = item.isBackground;
      const markerColor = isBg ? '#f59e0b' : '#3b82f6'; // Yellow for background tracking, blue for foreground

      const breadcrumb = L.circleMarker([item.latitude, item.longitude], {
        radius: 4,
        fillColor: markerColor,
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 1
      })
      .bindPopup(`
        <strong>Punto #${index + 1}</strong><br/>
        Hora: ${new Date(item.timestamp).toLocaleTimeString()}<br/>
        Precisión: ${item.accuracy.toFixed(1)}m<br/>
        Estado: ${isBg ? 'Segundo Plano (Minimizada)' : 'Primer Plano'}
      `)
      .addTo(this.map!);

      this.breadcrumbs.push(breadcrumb);
    });

    const lastPoint = list[list.length - 1];
    const lastLatLng = L.latLng(lastPoint.latitude, lastPoint.longitude);

    // Update or create current position marker
    if (this.currentMarker) {
      this.currentMarker.setLatLng(lastLatLng);
    } else {
      this.currentMarker = L.circleMarker(lastLatLng, {
        radius: 8,
        fillColor: '#10b981', // Emerald green for active location
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      }).addTo(this.map);
    }

    // Bind popup to current marker
    this.currentMarker.bindPopup(`
      <strong>Última Ubicación</strong><br/>
      Lat: ${lastPoint.latitude.toFixed(6)}<br/>
      Lng: ${lastPoint.longitude.toFixed(6)}<br/>
      Precisión: ${lastPoint.accuracy.toFixed(1)}m<br/>
      Estado: ${lastPoint.isBackground ? 'Segundo Plano (Minimizada)' : 'Primer Plano'}
    `).openPopup();

    // Auto pan/zoom map to center on the latest coordinate
    this.map.panTo(lastLatLng);
  }

  // Count how many points were registered in background
  public getBackgroundPointsCount(): number {
    return this.locations.filter(l => l.isBackground).length;
  }

  // Get current speed in km/h
  public getCurrentSpeed(): number {
    if (this.locations.length === 0) return 0;
    const last = this.locations[this.locations.length - 1];
    return last.speed ? last.speed * 3.6 : 0;
  }

  // Get current GPS accuracy
  public getCurrentAccuracy(): number {
    if (this.locations.length === 0) return 0;
    return this.locations[this.locations.length - 1].accuracy;
  }

  // Start or Stop GPS tracking
  public toggleTracking() {
    if (this.isTracking) {
      this.geoService.stopTracking();
    } else {
      this.geoService.startTracking(this.distanceFilter);
    }
  }

  // Toggle between native background tracking and web simulation
  public onSimulationToggle(event: any) {
    const isChecked = event.detail.checked;
    this.geoService.setSimulationMode(isChecked);
  }

  // Clear tracking history logs
  public clearLogs() {
    this.geoService.clearLogs();
  }

  // Export location history as JSON or CSV
  public exportLogs(format: 'json' | 'csv') {
    if (this.locations.length === 0) return;

    let blob: Blob;
    let filename: string;

    if (format === 'json') {
      const jsonContent = JSON.stringify(this.locations, null, 2);
      blob = new Blob([jsonContent], { type: 'application/json' });
      filename = `gps_track_logs_${Date.now()}.json`;
    } else {
      // CSV format
      const headers = 'Timestamp,ReadableTime,Latitude,Longitude,Accuracy,Speed(m/s),Altitude(m),IsBackground,IsSimulated\n';
      const rows = this.locations.map(loc => {
        return `${loc.timestamp},"${new Date(loc.timestamp).toISOString()}",${loc.latitude},${loc.longitude},${loc.accuracy},${loc.speed ?? ''},${loc.altitude ?? ''},${loc.isBackground},${loc.isSimulated}`;
      }).join('\n');
      
      blob = new Blob([headers + rows], { type: 'text/csv' });
      filename = `gps_track_logs_${Date.now()}.csv`;
    }

    // Trigger download in browser environment
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Handle configuration distance changes
  public onDistanceFilterChange() {
    if (this.isTracking) {
      // Restart tracking with new parameters
      this.geoService.stopTracking().then(() => {
        this.geoService.startTracking(this.distanceFilter);
      });
    }
  }
}
