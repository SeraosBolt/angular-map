// src/app/app.component.ts

import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, NgZone } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

// Definição de tipo para um stand, agora com a URL da imagem
interface Stand {
  name: string;
  coords: L.LatLngExpression;
  imageUrl: string;
}

// Ícone padrão do Leaflet para sua localização
const defaultIcon = L.icon({
  iconRetinaUrl: 'assets/images/marker-icon-2x.png',
  iconUrl: 'assets/images/marker-icon.png',
  shadowUrl: 'assets/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

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
  private destinationMarker: L.Marker | null = null;
  private routingControl: L.Routing.Control | null = null;
  private standMarkers = L.layerGroup(); // Grupo para controlar os marcadores dos stands
  private carMarker: L.Marker | null = null;
  private readonly CAR_LOCATION_KEY = 'showRuralCarLocation';
  // Lista de stands com as URLs das imagens
  public stands: Stand[] = [
    {
      name: 'John Dear',
      coords: [-24.980359, -53.339052],
      imageUrl: 'assets/images/john_dear_logo.jpeg',
    },
    {
      name: 'Jacto',
      coords: [-24.980052, -53.339754],
      imageUrl: 'assets/images/jacto_logo.jpeg',
    },
    {
      name: 'Prisma',
      coords: [-24.983057, -53.338978],
      imageUrl: 'assets/images/prisma_logo.jpeg',
    },
    {
      name: 'New Holland',
      coords: [-24.978958, -53.341273],
      imageUrl: 'assets/images/new_holland_logo.jpeg',
    },
    {
      name: 'Coamo',
      coords: [-24.978659, -53.339032],
      imageUrl: 'assets/images/coamo_logo.jpeg',
    },
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
      attribution: 'Prisma Softwares de gestão',
    }).addTo(this.map);

    // // Adiciona todos os marcadores de stand ao grupo para controle
    // this.stands.forEach(stand => {
    //   L.marker(stand.coords).bindPopup(`<b>${stand.name}</b>`).addTo(this.standMarkers);
    // });
    this.standMarkers.addTo(this.map);

    // Inicia a busca contínua pela localização do usuário
    this.map.locate({ watch: true, setView: false, enableHighAccuracy: true });

    this.map.on('locationfound', (e: L.LocationEvent) =>
      this.onLocationFound(e)
    );
    this.map.on('locationerror', (e: L.ErrorEvent) => this.onLocationError(e));
  }
  public saveCarLocation(): void {
    if (!this.userLocation) {
      alert(
        'Sua localização ainda não foi encontrada. Aguarde um momento e tente novamente.'
      );
      return;
    }
    // Salva no localStorage
    localStorage.setItem(
      this.CAR_LOCATION_KEY,
      JSON.stringify(this.userLocation)
    );
    this.addCarMarker(this.userLocation);
    alert('Localização do carro salva!');
  }

  public routeToCar(): void {
    const savedLocation = localStorage.getItem(this.CAR_LOCATION_KEY);
    if (!savedLocation) {
      alert('Nenhuma localização de carro foi salva.');
      return;
    }
    const carCoords = JSON.parse(savedLocation);
    this.clearMapForNavigation(false); // Limpa o mapa, mas mantém o marcador do carro
    this.createRouteTo(carCoords);
  }

  private loadSavedCarLocation(): void {
    const savedLocation = localStorage.getItem(this.CAR_LOCATION_KEY);
    if (savedLocation) {
      this.addCarMarker(JSON.parse(savedLocation));
    }
  }

  private addCarMarker(coords: L.LatLngExpression): void {
    if (this.carMarker) {
      this.map.removeLayer(this.carMarker);
    }
    // Cria um ícone customizado para o carro
    const carIcon = L.icon({
      iconUrl: 'assets/images/car-marker.png', // **CRIE ESSA IMAGEM!**
      iconSize: [35, 35],
      iconAnchor: [17, 35],
      popupAnchor: [0, -35],
    });
    this.carMarker = L.marker(coords, { icon: carIcon })
      .addTo(this.map)
      .bindPopup('<b>Seu carro está aqui!</b>');
  }

  // Chamado quando um stand é selecionado no <select>
  public onStandSelected(event: any): void {
    const standIndex = event.target.value;
    if (standIndex === '' || standIndex === null) return;

    const selectedStand = this.stands[standIndex];

    // MELHORIA 2 e 3: Limpa o mapa e exibe apenas o stand selecionado
    this.clearMapForNavigation(true);
    this.showDestinationMarker(selectedStand);
    this.createRouteTo(selectedStand.coords);
  }

  // Limpa marcadores de stands e rotas antigas
  private clearMapForNavigation(clearCarMarker: boolean): void {
    this.map.removeLayer(this.standMarkers); // Remove todos os marcadores iniciais
    if (this.destinationMarker) {
      this.map.removeLayer(this.destinationMarker); // Remove o marcador de destino anterior
    }
    if (this.routingControl) {
      this.map.removeControl(this.routingControl); // Remove a rota anterior
    }
        if (clearCarMarker && this.carMarker) { // Só remove o marcador do carro se necessário
        this.map.removeLayer(this.carMarker);
        this.carMarker = null; // Garante que ele possa ser recarregado
    }
  }

  // Mostra um único marcador com a imagem da empresa
  private showDestinationMarker(stand: Stand): void {
    // const customIcon = L.icon({
    //   iconUrl: stand.imageUrl,
    //   iconSize: [40, 40], // Tamanho do ícone
    //   iconAnchor: [20, 40], // Ponto do ícone que corresponde à coordenada
    //   popupAnchor: [0, -40], // Ponto onde o popup deve abrir
    // });

    this.destinationMarker = L.marker(stand.coords, { icon: defaultIcon })
      .addTo(this.map)
      .bindPopup(
        `<div style="text-align: center;">
        <img src="${stand.imageUrl}" alt="${stand.name}" style="width: 44px; height: auto; margin-bottom: 10px;">
      </div>`
      )
      .openPopup();
  }

  private createRouteTo(destination: L.LatLngExpression): void {
    if (this.userLocation === null) {
      this.zone.run(() => {
        alert(
          'Aguardando sua localização. Por favor, conceda a permissão e aguarde.'
        );
      });
      return;
    }

    this.routingControl = L.Routing.control({
      waypoints: [this.userLocation, L.latLng(destination)],
      routeWhileDragging: false,
      addWaypoints: false,
      pointMarkerStyle: {
        opacity: 0,
        radius: 0,
      },
      show: false, // Não mostra o painel de instruções// Não cria marcadores de início/fim
      lineOptions: {
        styles: [{ color: '#005b9f', opacity: 0.8, weight: 6 }],
        extendToWaypoints: true,
        missingRouteTolerance: 1,
      },
    }).addTo(this.map);
  }

  private onLocationFound(e: L.LocationEvent): void {
    this.userLocation = e.latlng;

    if (this.userLocationMarker === null) {
      this.userLocationMarker = L.marker(this.userLocation, {
        icon: defaultIcon,
      })
        .addTo(this.map)
        .bindPopup('Você está aqui!');
    } else {
      this.userLocationMarker.setLatLng(this.userLocation);
    }

    if (this.routingControl) {
      this.routingControl.spliceWaypoints(
        0,
        1,
        new (L as any).Routing.Waypoint(this.userLocation, '', {})
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
