import * as d3 from 'd3';
import * as L from 'leaflet';
import 'leaflet.heat';

export interface DeveloperLocation {
  Developer: string;
  Latitude: number;
  Longitude: number;
  PlaceName: string;
  Address: string;
}

export class HeatmapChart {
  private developerLocations: DeveloperLocation[] = [];
  private map: L.Map | null = null;
  private svgOverlay: d3.Selection<SVGSVGElement, unknown, null, unknown> | null = null;
  private svgGroup: d3.Selection<SVGGElement, unknown, null, unknown> | null = null;
  private heatLayer: L.Layer | null = null;
  public heatConsistsOfPins: boolean = false;
  public devPinIsActive: boolean = false;
  private originalDeveloperLocations: DeveloperLocation[] = [];

  public set locations(locations: DeveloperLocation[]) {
    this.developerLocations = locations;
    this.originalDeveloperLocations = [...locations];
    this.updateHeatmap();
  }

  public show(div: HTMLDivElement) {
    if (!this.map) {
      console.log('Initializing map...');
      this.map = L.map(div, {
        center: [20, 0],
        zoom: 2,
        worldCopyJump: true,
        layers: [
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          })
        ]
      });

      console.log('Map initialized successfully:', this.map);

      this.map.dragging.disable();
      this.map.scrollWheelZoom.disable();

      this.svgOverlay = d3.select(this.map.getPanes().overlayPane).append('svg').attr("style", "pointer-events: none;");
      this.svgGroup = this.svgOverlay.append('g').attr('class', 'leaflet-zoom-hide');

      const bounds = this.map.getBounds();
      const topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());
      const bottomRight = this.map.latLngToLayerPoint(bounds.getSouthEast());

      this.svgOverlay
          .attr('width', bottomRight.x - topLeft.x)
          .attr('height', bottomRight.y - topLeft.y)
          .style('left', `${topLeft.x}px`)
          .style('top', `${topLeft.y}px`);

      this.svgGroup.attr('transform', `translate(${-topLeft.x},${-topLeft.y})`);

      console.log('SVG group initialized:', this.svgGroup);

      this.map.on('click', () => {
        this.map!.dragging.enable();
        this.map!.scrollWheelZoom.enable();
      });

      this.map.on('mouseout', () => {
        this.map!.dragging.disable();
        this.map!.scrollWheelZoom.disable();
      });

      this.updateHeatmap();
    }
  }

  private updateHeatmap() {
    if (!this.map || this.devPinIsActive) return;

    console.log('Updating heatmap. heatConsistsOfPins:', this.heatConsistsOfPins);

    if (this.heatConsistsOfPins) {
      this.showPins();
    } else {
      this.showHeatmap();
    }
  }

  private showHeatmap() {
    if (!this.map) return;

    console.log('(Re-)Initializing heatmap...');

    this.svgGroup?.selectAll('circle').remove();

    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
    }

    console.log('Developer locations:', this.developerLocations);

    const heatData = this.developerLocations.map(location => [
      location.Latitude,
      location.Longitude,
      this.calcWeight(location)
    ]);

    this.heatLayer = L.heatLayer(heatData as any, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: {
        0.0: 'rgba(0, 0, 255, 0)',
        0.1: 'rgba(0, 255, 255, 0.6)',
        0.2: 'rgba(0, 255, 0, 0.7)',
        0.4: 'rgba(255, 255, 0, 0.8)',
        0.6: 'rgba(255, 165, 0, 0.9)',
        0.8: 'rgba(255, 0, 0, 0.9)',
        1.0: 'rgba(128, 0, 128, 1.0)'
      }
    }).addTo(this.map);

    console.log('Heatmap (re-)initialized');
  }

  private calcWeight(location: DeveloperLocation): number {
    const radiusInMeters = 1000;
    const locationLatLng = L.latLng(location.Latitude, location.Longitude);
    const locationPoint = this.map!.latLngToLayerPoint(locationLatLng);
    const baseWeight = 2;
    const maxWeight = 10;

    const nearbyLocationsCount = this.developerLocations.reduce((count, otherLocation) => {
      const otherLatLng = L.latLng(otherLocation.Latitude, otherLocation.Longitude);
      const otherPoint = this.map!.latLngToLayerPoint(otherLatLng);
      const distance = locationPoint.distanceTo(otherPoint);

      return distance <= radiusInMeters ? count + 1 : count;
    }, 0);

    let weight = baseWeight + nearbyLocationsCount * 0.5;
    weight = Math.min(weight, maxWeight);

    return weight;
  }

  public calcDensityThresholds(): number[] {
    const thresholds = [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0];
    const maxDensity = this.developerLocations.length;
    return thresholds.map(threshold => Math.ceil(threshold * maxDensity));
  }

  private showPins() {
    if (!this.map || !this.svgOverlay || !this.svgGroup) return;

    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = null;
    }

    this.svgGroup.selectAll('circle').remove();

    const projectLatLngToLayerPoint = (latLng: L.LatLngExpression) => {
      return this.map!.latLngToLayerPoint(latLng);
    };

    const circles = this.svgGroup.selectAll('circle')
        .data(this.developerLocations);

    const enterCircles = circles.enter().append('circle')
        .attr('opacity', 0.4);

    const updateCircles = () => {
      const zoomLevel = this.map!.getZoom();
      const radius = this.calculateCircleRadius(zoomLevel);

      circles.merge(enterCircles as any)
          .attr('cx', d => projectLatLngToLayerPoint([d.Latitude, d.Longitude]).x)
          .attr('cy', d => projectLatLngToLayerPoint([d.Latitude, d.Longitude]).y)
          .attr('r', radius)
          .attr('fill', d => this.determineColorBasedOnDensity(d, radius));
    };

    const throttledUpdate = this.throttle(updateCircles, 100);

    this.map.on('zoomend', () => {
      this.updateHeatmap();
      throttledUpdate();
    });
    this.map.on('moveend', () => {
      this.updateHeatmap();
      throttledUpdate();
    });

    updateCircles();
  }

  public toggleHeatmapMode() {
      this.heatConsistsOfPins = !this.heatConsistsOfPins;
      console.log('Toggled heatmap mode. heatConsistsOfPins:', this.heatConsistsOfPins);
      this.updateHeatmap();
  }

  public filterOutDevs(developer: string) {
    const filteredLocations = this.developerLocations.filter(location => location.Developer === developer);

    this.developerLocations = filteredLocations;
    this.updateHeatmap();
  }

  public resetDeveloperFilter() {
    this.updateHeatmap();
  }

  public resetDeveloperLocations() {
    this.developerLocations = [...this.originalDeveloperLocations];
    this.updateHeatmap();
  }

  private calculateCircleRadius(zoomLevel: number): number {
    return Math.max(5, Math.min(10 * (zoomLevel - 1), 20));
  }

  private determineColorBasedOnDensity(location: DeveloperLocation, radius: number): string {
    const nearbyLocationsCount = this.developerLocations.reduce((count, otherLocation) => {
      const distance = this.getDistanceBetweenLocations(location, otherLocation);
      return distance <= radius ? count + 1 : count;
    }, 0);

    if (nearbyLocationsCount > 20) {
      return 'red';
    } else if (nearbyLocationsCount > 10) {
      return 'orange';
    } else if (nearbyLocationsCount > 5) {
      return 'yellow';
    } else {
      return 'green';
    }
  }

  private getDistanceBetweenLocations(location1: DeveloperLocation, location2: DeveloperLocation): number {
    const lat1 = location1.Latitude;
    const lon1 = location1.Longitude;
    const lat2 = location2.Latitude;
    const lon2 = location2.Longitude;

    const earthRadius = 6371e3;
    const lat1Radians = lat1 * Math.PI / 180;
    const lat2Radians = lat2 * Math.PI / 180;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Radians) * Math.cos(lat2Radians) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
  }

  /**
   * Throttles a function to only be called once every `delay` milliseconds.
   */
  private throttle(func: Function, delay: number) {
    let lastCall = 0;
    return (...args: any[]) => {
      const now = new Date().getTime();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  public showADevPin(lat: number, lng: number) {
    if (!this.map || !this.svgGroup) return;

    this.svgGroup.selectAll('.developer-pin').remove();

    this.svgGroup?.selectAll('circle').remove();
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = null;
    }

    console.log('Adding pin at:', lat, lng);

    const pin = this.svgGroup
        ?.append('circle')
        .attr('class', 'developer-pin')
        .attr('cx', this.map.latLngToLayerPoint([lat, lng]).x)
        .attr('cy', this.map.latLngToLayerPoint([lat, lng]).y)
        .attr('r', 8)
        .attr('fill', 'red');

    const updatePinPosition = () => {
      pin?.attr('cx', this.map!.latLngToLayerPoint([lat, lng]).x)
          .attr('cy', this.map!.latLngToLayerPoint([lat, lng]).y);

      const bounds = this.map!.getBounds();
      const topLeft = this.map!.latLngToLayerPoint(bounds.getNorthWest());
      const bottomRight = this.map!.latLngToLayerPoint(bounds.getSouthEast());

      this.svgOverlay!
          .attr('width', bottomRight.x - topLeft.x)
          .attr('height', bottomRight.y - topLeft.y)
          .style('left', `${topLeft.x}px`)
          .style('top', `${topLeft.y}px`);

      this.svgGroup!.attr('transform', `translate(${-topLeft.x},${-topLeft.y})`);
    };

    this.map.on('zoomend', updatePinPosition);
    this.map.on('moveend', updatePinPosition);

    this.map.dragging.enable();
    this.map.scrollWheelZoom.enable();

    this.devPinIsActive = true;

    const resetButton = document.getElementById('reset-pin-to-heat-button') as HTMLButtonElement;
    if (resetButton) resetButton.style.display = 'block';
  }

  public removeTheDevPin() {
    if (!this.map || !this.svgGroup) return;

    if (this.devPinIsActive) {
      this.svgGroup.selectAll('.developer-pin').remove();

      this.map.dragging.disable();
      this.map.scrollWheelZoom.disable();

      this.devPinIsActive = false;

      console.log('Developer pin removed, reinitializing heatmap');
    }

    this.resetDeveloperLocations();

    if (!this.heatLayer) {
      if (this.heatConsistsOfPins) {
        this.showPins();
      } else {
        this.showHeatmap();
      }
    } else {
      this.updateHeatmap();
    }

    const resetButton = document.getElementById('reset-pin-to-heat-button') as HTMLButtonElement;
    if (resetButton) resetButton.style.display = 'none';
  }
}