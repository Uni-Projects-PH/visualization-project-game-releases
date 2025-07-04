import * as d3 from 'd3';

export interface TimelineGame {
  title: string;
  year: number;
  game: Game;
}

export interface Game {
  name: string;
  date: Date;
  platform: string;
  publisher: string;
  developer: string;
  genre: string;
  shipped?: number;
  total?: number;
  europe?: number;
  japan?: number;
  america?: number;
  other?: number;
  critic?: number;
  user?: number;
}

export class TimelineChart {
  private _games: TimelineGame[] = [];
  private _currentYearRange: [number, number] = [2006, 2025];
  private _onBarClick: ((games: TimelineGame[], year: number) => void) | null = null;

  public set games(games: TimelineGame[]) {
    this._games = games;
  }

  public set onBarClick(callback: (games: TimelineGame[], year: number) => void) {
    this._onBarClick = callback;
  }

  public show(div: HTMLDivElement) {
    const width = div.clientWidth;
    const height = div.clientHeight;

    const selector = d3.select(div);
    selector.selectAll('*').remove();

    const svg = selector.append('svg')
      .attr('id', 'timeline-chart-svg')
      .attr('width', width)
      .attr('height', height);

    this.updateChart(svg, width, height);
  }

  public nextYear() {
    this._currentYearRange = [this._currentYearRange[0] + 1, this._currentYearRange[1] + 1];
    this.updateChart(d3.select('#timeline-chart-svg'), parseFloat(d3.select('#timeline-chart-svg').attr('width')), parseFloat(d3.select('#timeline-chart-svg').attr('height')));
  }

  public previousYear() {
    this._currentYearRange = [this._currentYearRange[0] - 1, this._currentYearRange[1] - 1];
    this.updateChart(d3.select('#timeline-chart-svg'), parseFloat(d3.select('#timeline-chart-svg').attr('width')), parseFloat(d3.select('#timeline-chart-svg').attr('height')));
  }

  private updateChart(svg: d3.Selection<SVGSVGElement, unknown, any, any>, width: number, height: number) {
    const { _games, _currentYearRange } = this;

    const gamesPerYear = d3.rollup(_games, v => v.length, d => d.year);
    const filteredYears = Array.from(gamesPerYear.keys())
      .filter(year => year >= _currentYearRange[0] && year <= _currentYearRange[1])
      .sort((a, b) => a - b);

    const xScale = d3.scaleBand()
      .domain(filteredYears.map(d => d.toString()))
      .range([50, width - 50])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(Array.from(gamesPerYear.values()))!])
      .nice()
      .range([height - 50, 50]);

    svg.selectAll('*').remove();

    const xAxis = svg.append('g')
      .attr('transform', `translate(0,${height - 50})`)
      .call(d3.axisBottom(xScale));

    xAxis.selectAll("text")
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        const year = parseInt((d as any).toString());
        if (this._onBarClick) {
          console.log('clicked', year);
          const gamesInYear = this._games.filter(game => game.year === year);
          console.log(gamesInYear)
          this._onBarClick(gamesInYear, year);
        }
      })
      .on('mouseover', function(_, d) {
      d3.select(this).attr('fill', 'red');
      })
      .on('mouseout', function(_, d) {
        d3.select(this).attr('fill', 'black');
      })
      .append('title')
      .text(d => `In diesem Jahr wurden ${gamesPerYear.get(parseInt((d as any).toString()))} Spiele veröffentlicht`);

    const bars = svg.selectAll('.bar')
      .data(filteredYears)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.toString())! + xScale.bandwidth() / 4)
      .attr('y', d => yScale(gamesPerYear.get(d)!))
      .attr('width', xScale.bandwidth() * 0.5)
      .attr('height', d => height - 50 - yScale(gamesPerYear.get(d)!))
      .attr('fill', 'blue')
      .style("cursor", "pointer")
      .on('mouseover', function(event, d) {
        d3.select(this).attr('fill', 'red');
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('fill', 'blue');
      })
      .on('click', (_, d) => {
        if (this._onBarClick) {
          const gamesInYear = this._games.filter(game => game.year === d);
          this._onBarClick(gamesInYear, d);
        }
      });

    bars.append('title')
      .text(d => `In diesem Jahr wurden ${gamesPerYear.get(d)} Spiele veröffentlicht`);
  }
}
