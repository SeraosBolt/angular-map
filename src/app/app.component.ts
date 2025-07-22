// src/app/app.component.ts

import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, NgZone } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

// Definição de tipo para um stand (boa prática)
interface Stand {
  name: string;
  coords: L.LatLngExpression;
}

// Ícone padrão (código sem alterações)
// const iconRetinaUrl = 'assets/marker-icon-2x.png';
// const iconUrl = 'assets/marker-icon.png';
// const shadowUrl = 'assets/marker-shadow.png';
// const iconDefault = L.icon({
//   iconRetinaUrl,
//   iconUrl,
//   shadowUrl,
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   tooltipAnchor: [16, -28],
//   shadowSize: [41, 41]
// });
// L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  private map: any;
  private userLocation: L.LatLng | null = null;
  private userLocationMarker: L.Marker | null = null;
  private routingControl: L.Routing.Control | null = null;

  public stands: Stand[] = [
    { name: 'John Dear', coords: [-24.980359, -53.339052] },
    { name: 'Jacto', coords: [-24.980052, -53.339754] },
    { name: 'Prisma', coords: [-24.983057, -53.338978] },
    { name: 'New Holland', coords: [-24.978958, -53.341273] },
    { name: 'Coamo', coords: [-24.978659, -53.339032] }
  ];

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.initMap();
    });
  }

  private initMap(): void {
    const showRuralCoords = L.latLng(-24.98024, -53.33931);
    this.map = L.map('map').setView(showRuralCoords, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.stands.forEach(stand => {
      L.marker(stand.coords).addTo(this.map).bindPopup(`<b>${stand.name}</b>`);
    });

    // AJUSTE: Reativando a busca automática de localização ao iniciar
    const locateOptions: L.LocateOptions = {
      watch: true,          // Continua observando a localização
      setView: false,         // Não move o mapa para o usuário
      maxZoom: 16,
      enableHighAccuracy: true
    };
    this.map.locate(locateOptions);

    this.map.on('locationfound', (e: L.LocationEvent) => this.onLocationFound(e));
    this.map.on('locationerror', (e: L.ErrorEvent) => this.onLocationError(e));
  }

  // O método findMyLocation() foi REMOVIDO

  public onStandSelected(event: any): void {
    const standIndex = event.target.value;
    if (standIndex === "" || standIndex === null) return;

    const selectedStand = this.stands[standIndex];
    this.createRouteTo(selectedStand.coords);
  }

  private createRouteTo(destination: L.LatLngExpression): void {
    // AJUSTE: Mudança na mensagem de alerta
    if (this.userLocation === null) {
      this.zone.run(() => {
        alert("Aguardando a sua localização. Por favor, certifique-se de que a permissão foi concedida ao site.");
      });
      return;
    }

    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
    }

    this.routingControl = L.Routing.control({
      waypoints: [this.userLocation, L.latLng(destination)],
      routeWhileDragging: false,
      addWaypoints: false,
      lineOptions: {
        styles: [{ color: '#005b9f', opacity: 0.8, weight: 6 }],
        extendToWaypoints: true,
        missingRouteTolerance: 1
      }
    }).addTo(this.map);
  }

  private onLocationFound(e: L.LocationEvent): void {
    this.userLocation = e.latlng;
    if (this.userLocationMarker === null) {
      this.userLocationMarker = L.marker(this.userLocation)
        .addTo(this.map)
        .bindPopup("Você está aqui!");
    } else {
      this.userLocationMarker.setLatLng(this.userLocation);
    }
  }

  private onLocationError(e: L.ErrorEvent): void {
    let errorMessage = "Ocorreu um erro ao tentar obter sua localização.";
    switch (e.code) {
      case 1:
        errorMessage = "Você negou o acesso à localização.\n\nPara usar a função de rota, por favor, habilite a permissão nas configurações do seu navegador.";
        break;
      case 2:
        errorMessage = "Sua localização não está disponível.\n\nVerifique se o GPS ou serviço de localização do seu dispositivo está ativo.";
        break;
      case 3:
        errorMessage = "A requisição para obter sua localização demorou muito.";
        break;
    }
    this.zone.run(() => {
      alert(errorMessage);
    });
  }
}