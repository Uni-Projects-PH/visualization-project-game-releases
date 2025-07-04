import {makeDraggable} from "@/scripts/draggable-feature.ts";
import {DeveloperLocation, HeatmapChart} from "@/scripts/heatmap.ts";

export class LegendPopup {
    private legendElement: HTMLDivElement;
    private isVisible: boolean = false;
    private heatmap: HeatmapChart;

    constructor(developerLocations: DeveloperLocation[]) {
        this.legendElement = document.createElement('div');
        this.legendElement.classList.add('legend-popup');
        this.legendElement.style.display = 'none';
        this.legendElement.style.position = 'fixed';
        document.body.appendChild(this.legendElement);
        this.heatmap = new HeatmapChart();
        this.heatmap.locations = developerLocations;
        this.createStaticLegendContent();

        makeDraggable(this.legendElement);
    }

    private createStaticLegendContent() {
        const densityThresholds = this.heatmap.calcDensityThresholds();

      this.legendElement.innerHTML = `
          <h3 class="heat-legend-header">Heatmap-Legende</h3>
          <p>Der Heat wird über die Menge der Entwickler-Positionen bestimmt.</p>
          <div class="legend-gradient"></div>
          <div class="legend-labels">
            ${densityThresholds.map(threshold => `<div class="label">${threshold}</div>`).join('')}
          </div>
    `;
    }

    toggleLegendVisibility() {
        this.isVisible = !this.isVisible;
        this.legendElement.style.display = this.isVisible ? 'block' : 'none';
    }
}
