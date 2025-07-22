// src/app/app.component.ts

import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, NgZone } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

// Definição de tipo para um stand
interface Stand {
  name: string;
  coords: L.LatLngExpression;
  img?: string; // Imagem opcional
}

// Ícone padrão do Leaflet (para evitar quebras de imagem)
// const iconRetinaUrl = '../assets/images/marker-icon-2x.png';
// const iconUrl = '../assets/images/marker-icon.png';
// const shadowUrl = '../assets/images/marker-shadow.png';
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
const imageUrl = 'assets/images/johndeere.jpg';
@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit {
  private map: any;
  private userLocation: L.LatLng | null = null;
  private userLocationMarker: L.Marker | null = null;
  private routingControl: L.Routing.Control | null = null;

  public stands: Stand[] = [
    { name: 'John Dear', coords: [-24.980359, -53.339052], img: imageUrl },
    { name: 'Jacto', coords: [-24.980052, -53.339754] },
    { name: 'Prisma', coords: [-24.983057, -53.338978] },
    { name: 'New Holland', coords: [-24.978958, -53.341273] },
    { name: 'Coamo', coords: [-24.978659, -53.339032] },
    { name: 'Perche', coords: [-24.97814669824593, -53.34026992321015] },
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
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    // this.stands.forEach(stand => {
    //   L.marker(stand.coords).addTo(this.map).bindPopup(`<img src="${stand.img}" alt="Imagem do stand ${stand.name}" style="width: 100px; height: auto;">`);
    // });

    // Busca automática e contínua da localização
    const locateOptions: L.LocateOptions = {
      watch: true,
      setView: false,
      maxZoom: 16,
      enableHighAccuracy: true,
    };
    this.map.locate(locateOptions);

    this.map.on('locationfound', (e: L.LocationEvent) =>
      this.onLocationFound(e)
    );
    this.map.on('locationerror', (e: L.ErrorEvent) => this.onLocationError(e));
  }

  public onStandSelected(event: any): void {
    const standIndex = event.target.value;
    if (standIndex === '' || standIndex === null) return;
    const selectedStand = this.stands[standIndex];
    L.marker(selectedStand.coords)
      .addTo(this.map)
      .bindPopup(
        `<img src="${selectedStand.img}" alt="Imagem do stand ${selectedStand.name}" style="width: 100px; height: auto;">`
      );
    this.createRouteTo(selectedStand.coords);
  }

  private createRouteTo(destination: L.LatLngExpression): void {
    if (this.userLocation === null) {
      this.zone.run(() => {
        alert(
          'Aguardando a sua localização. Por favor, certifique-se de que a permissão foi concedida ao site.'
        );
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

      // MELHORIA 2: Não mostrar o painel de instruções
      show: false,

      // Remove os marcadores padrão para não duplicar
    }).addTo(this.map);
  }

  private onLocationFound(e: L.LocationEvent): void {
    this.userLocation = e.latlng;

    // Adiciona ou atualiza o marcador da localização do usuário
    if (this.userLocationMarker === null) {
      this.userLocationMarker = L.marker(this.userLocation)
        .addTo(this.map)
        .bindPopup('Você está aqui!');
    } else {
      this.userLocationMarker.setLatLng(this.userLocation);
    }

    // MELHORIA 3: Atualiza a rota em tempo real se ela existir
    if (this.routingControl) {
      this.routingControl.spliceWaypoints(
        0,
        1,
        L.Routing.waypoint(this.userLocation)
      );
    }
  }

  private onLocationError(e: L.ErrorEvent): void {
    let errorMessage = 'Ocorreu um erro ao tentar obter sua localização.';
    switch (e.code) {
      case 1:
        errorMessage =
          'Você negou o acesso à localização.\n\nPara usar a função de rota, por favor, habilite a permissão nas configurações do seu navegador.';
        break;
      case 2:
        errorMessage =
          'Sua localização não está disponível.\n\nVerifique se o GPS ou serviço de localização do seu dispositivo está ativo.';
        break;
      case 3:
        errorMessage = 'A requisição para obter sua localização demorou muito.';
        break;
    }
    this.zone.run(() => {
      alert(errorMessage);
    });
  }
}
