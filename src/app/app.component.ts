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
  private recalculatingControl: L.Control | null = null;
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
    {
      name: 'Muffato',
      coords: [-24.954390222009657, -53.46733152866364],
      imageUrl: 'assets/images/muffato.png',
    },
    {
      name: 'Posto Macedo',
      coords: [-24.957245132087568, -53.4654325246811],
      imageUrl: 'assets/images/macedo.png',
    },
  ];

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.initMap();
      this.loadSavedCarLocation();
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
    this.setupRecalculatingMessage();
    // Inicia a busca contínua pela localização do usuário
    this.map.locate({ watch: true, setView: false, enableHighAccuracy: true });

    this.map.on('locationerror', (e: L.ErrorEvent) => this.onLocationError(e));

    this.map.on('click', (e: L.LeafletMouseEvent) => console.log(e.latlng));
  }
  public saveCarLocation(): void {
    if (!this.userLocation) {
      alert(
        'Sua localização ainda não foi encontrada. Aguarde um momento e tente novamente.'
      );
      return;
    }
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
    this.clearMapForNavigation(false);
    this.createRouteTo(carCoords);
  }

  private loadSavedCarLocation(): void {
    const savedLocation = localStorage.getItem(this.CAR_LOCATION_KEY);
    if (savedLocation) {
      this.addCarMarker(JSON.parse(savedLocation));
    }
  }

  private addCarMarker(coords: L.LatLngExpression): void {
    if (this.carMarker) this.map.removeLayer(this.carMarker);

    const carIcon = L.icon({
      iconUrl: 'assets/images/car-marker.png',
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

    // MELHORIA 3: O marcador do carro não é mais removido ao selecionar um stand
    this.clearMapForNavigation(false);
    this.showDestinationMarker(selectedStand);
    this.createRouteTo(selectedStand.coords);
  }

  private clearMapForNavigation(clearCarMarker: boolean): void {
    this.map.removeLayer(this.standMarkers);
    if (this.destinationMarker) this.map.removeLayer(this.destinationMarker);
    if (this.routingControl) this.map.removeControl(this.routingControl);
    if (clearCarMarker && this.carMarker) {
      this.map.removeLayer(this.carMarker);
      this.carMarker = null;
    }
  }

  // Mostra um único marcador com a imagem da empresa
  private showDestinationMarker(stand: Stand): void {
    this.map.removeLayer(this.standMarkers);

    const popupContent = `
        <div style="text-align: center;">
          <b>${stand.name}</b><br>
          <img src="${stand.imageUrl}" alt="${stand.name} Logo" style="width:100px; margin-top: 8px;"/>
        </div>
      `;

    // CORREÇÃO 3: O popup é corretamente vinculado e aberto ao clicar
    this.destinationMarker = L.marker(stand.coords, { icon: defaultIcon })
      .addTo(this.map)
      .bindPopup(popupContent);

    // Abre o popup uma vez na criação para feedback imediato
    this.destinationMarker.openPopup();
  }

  private createRouteTo(destination: L.LatLngExpression): void {
    if (!this.userLocation) {
      this.zone.run(() => alert("Aguardando sua localização..."));
      return;
    }
    if (this.routingControl) this.map.removeControl(this.routingControl);

    this.routingControl = L.Routing.control({
      waypoints: [this.userLocation, L.latLng(destination)],
      routeWhileDragging: false,
      addWaypoints: false,
      show: false,
      lineOptions: {
        styles: [{ color: '#005b9f', opacity: 0.8, weight: 6 }],
        extendToWaypoints: true,
        missingRouteTolerance: 1
      } as any
    })
    // MELHORIA 2: Adiciona os event listeners para a mensagem de recálculo
    .on('routingstart', () => {
      if (this.recalculatingControl?.getContainer()) {
        this.recalculatingControl.getContainer()!.style.display = 'block';
      }
    })
    .on('routesfound', () => {
      if (this.recalculatingControl?.getContainer()) {
        this.recalculatingControl.getContainer()!.style.display = 'none';
      }
    })
    .on('routingerror', () => {
      if (this.recalculatingControl?.getContainer()) {
        this.recalculatingControl.getContainer()!.style.display = 'none';
      }
    })
    .addTo(this.map);
  }

  private onLocationFound(e: L.LocationEvent): void {
   alert('Localização encontrada:' + e.latlng.toString());
    this.userLocation = e.latlng;
    if (!this.userLocationMarker) {
      this.userLocationMarker = L.marker(this.userLocation, { icon: defaultIcon }).addTo(this.map).bindPopup("Você está aqui!");
    } else {
      alert('Atualizando marcador usuario' + e.latlng.toString());
      this.userLocationMarker.setLatLng(this.userLocation);
    }
    
    // MELHORIA 1 (CORREÇÃO): Lógica correta para o GPS em tempo real
    if (this.routingControl) {
      const waypoints = this.routingControl.getWaypoints();
      // Apenas atualiza se o ponto de partida for diferente, para evitar chamadas desnecessárias
      if (!waypoints[0].latLng.equals(this.userLocation)) {
        alert('recalculando:');
        this.routingControl.setWaypoints([this.userLocation, waypoints[1].latLng]);
      }
    }
  }
  private setupRecalculatingMessage(): void {
    const RecalculatingControl = L.Control.extend({
      onAdd: (map: L.Map) => {
        const container = L.DomUtil.create('div', 'leaflet-control recalculating-message'); // Usa a classe CSS
        container.style.display = 'none'; // Começa oculto
        container.innerHTML = 'Recalculando rota...';
        return container;
      },
      onRemove: (map: L.Map) => {}
    });
    this.recalculatingControl = new RecalculatingControl({ position: 'bottomleft' }).addTo(this.map);
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
