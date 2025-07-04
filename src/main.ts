import "@/styles/index.scss";
import "leaflet/dist/leaflet.css";
import * as d3 from 'd3';
import {Game, TimelineChart} from "@/scripts/timeline.ts";
import {DeveloperLocation, HeatmapChart} from "@/scripts/heatmap.ts";
import {resolveGame} from "@/scripts/resolve-game.ts";
import {makeDraggable} from "@/scripts/draggable-feature.ts";
import {LegendPopup} from "@/scripts/draggable-legend.ts";
import {setupGameAddingMechanic} from "@/scripts/game-adding-mechanism.ts";

export class FilterState {

  private _updaters: ((state: FilterState) => void)[] = [];
  private _filteredGameStudio?: string;
  private _filteredStartYear?: number;
  private _filteredEndYear?: number;
  private _filteredGenres: Set<string> = new Set<string>();
  private _filteredPlatforms: Set<string> = new Set<string>();

  constructor(
      private games: Game[],
      private locations: DeveloperLocation[],
  ) {
  }

  public onFilterUpdate(callback: (state: FilterState) => void) {
    this._updaters.push(callback);
  }

  public setGameStudioFilter(filter: string) {
    this._filteredGameStudio = filter;
    this.pushFilterUpdate();
  }

  public resetGameStudioFilter() {
    this._filteredGameStudio = undefined;
    this.pushFilterUpdate();
  }

  public setYearFilter(startYear: number, endYear: number) {
    this._filteredStartYear = startYear;
    this._filteredEndYear = endYear;
    this.pushFilterUpdate();
  }

  public resetYearFilter() {
    this._filteredStartYear = undefined;
    this._filteredEndYear = undefined;
    this.pushFilterUpdate();
  }

  private pushFilterUpdate() {
    this._updaters.forEach(updater => updater(this));
  }

  public getGameDetails(title: string): Game | undefined {
    return this.games.find(game => game.name === title);
  }

  public setGenreFilter(genres: Set<string>) {
    this._filteredGenres = genres;
    this.pushFilterUpdate();
  }

  public resetGenreFilter() {
    this._filteredGenres.clear();
    this.pushFilterUpdate();
  }

  public setPlatformFilter(platforms: Set<string>) {
    this._filteredPlatforms = platforms;
    this.pushFilterUpdate();
  }

  public resetPlatformFilter() {
    this._filteredPlatforms.clear();
    this.pushFilterUpdate();
  }

  public getUniquePropertyVals(property: keyof Game): Set<string> {
    const uniqueValues = new Set<string>();
    this.games.forEach(game => {
      const value = game[property];
      if (typeof value === 'string') {
        value.split('|').forEach(val => uniqueValues.add(val));
      }
    });
    return uniqueValues;
  }

  public get filteredGames(): Game[] {
    return this.games.filter(game => {
      if (isNaN(game.date.getTime())) {
        return false;
      }

      if (this._filteredGameStudio && game.developer !== this._filteredGameStudio) {
        return false;
      }

      if (this._filteredStartYear && game.date.getFullYear() < this._filteredStartYear) {
        return false;
      }

      if (this._filteredEndYear && game.date.getFullYear() > this._filteredEndYear) {
        return false;
      }

      if (this._filteredGenres.size > 0) {
        const gameGenres = new Set(game.genre.split('|'));
        if (![...this._filteredGenres].some(genre => gameGenres.has(genre))) {
          return false;
        }
      }

      if (this._filteredPlatforms.size > 0) {
        const gamePlatforms = new Set(game.platform.split('|'));
        if (![...this._filteredPlatforms].some(platform => gamePlatforms.has(platform))) {
          return false;
        }
      }

      return true;
    });
  }

  public get filteredLocations(): DeveloperLocation[] {
    const games = this.filteredGames;

    console.log("filteredLocations", games);

    return this.locations.filter(location => {
      if (this._filteredGameStudio && location.Developer !== this._filteredGameStudio) {
        return false;
      }

      if (games.filter(game => game.developer === location.Developer).length > 0) {
        return true;
      }

      return false;
    });
  }

  public async addNewGame(name: string) {
    const res = await resolveGame(name);
    if (!res) {
      alert('Spiel oder Spieleentwickler nicht gefunden');
      return;
    }

    this.games.push(res.game);
    console.log(res.game, res.game.date.getFullYear())

    /*
    if (res.developer) {
      this.locations.push(res.developer);
    }*/

    this.pushFilterUpdate();
  }
}

function updateGameInfoSidebar(game: Game) {
  const genreDisplay = game.genre === "Unknown" ? "Unbekannt" : game.genre === "Misc" ? "Miscellaneous" : game.genre;
  const platformsDisplay = game.platform.replace(/\|/g, ' | ');

  let content = `
        <p><strong>Name:</strong> ${game.name}</p>
        <p><strong>Genre(s):</strong> ${genreDisplay}</p>
        <p><strong>Plattform(en):</strong> ${platformsDisplay}</p>
        <p><strong>Publisher:</strong> ${game.publisher}</p>
        <p><strong>Entwickler:</strong> ${game.developer}</p>
        <p><strong>Erscheinungsdatum:</strong> ${game.date.toDateString()}</p>
        `;

  if (game.shipped !== undefined && game.shipped !== 0) content += `<p><strong>Ausgelieferte Einheiten:</strong> ${game.shipped} Millionen</p>`;
  if (game.total !== undefined && game.total !== 0) content += `<p><strong>Gesamtverkäufe:</strong> ${(game.total * 10)} Millionen</p>`;
  if (game.europe !== undefined && game.europe !== 0) content += `<p><strong>Verkäufe in Europa:</strong> ${(game.europe * 10)} Millionen</p>`;
  if (game.japan !== undefined && game.japan !== 0) content += `<p><strong>Verkäufe in Japan:</strong> ${(game.japan * 10)} Millionen</p>`;
  if (game.america !== undefined && game.america !== 0) content += `<p><strong>Verkäufe in Amerika:</strong> ${(game.america * 10)} Millionen</p>`;
  if (game.other !== undefined && game.other !== 0) content += `<p><strong>Verkäufe in anderen Gebieten:</strong> ${(game.other * 10)} Millionen</p>`;
  if (game.critic !== undefined && game.critic !== 0) content += `<p><strong>Presse-Score:</strong> ${game.critic}</p>`;
  if (game.user !== undefined && game.user !== 0) content += `<p><strong>Spieler-Score:</strong> ${game.user}</p>`;

  const gameInfoContent = document.getElementById('game-info-content') as HTMLDivElement;
  gameInfoContent.innerHTML = content;
  const gameInfoSidebar = document.getElementById('game-info-sidebar') as HTMLDivElement;
  gameInfoSidebar.style.display = 'block';
}

async function setup() {
  const studiosData = await d3.csv('/data/studios_geocode.csv');
  const unfilteredLocations: DeveloperLocation[] = studiosData.map(d => ({
    Developer: d.Developer,
    Latitude: parseFloat(d.Latitude),
    Longitude: parseFloat(d.Longitude),
    PlaceName: d['Place Name'],
    Address: d.Address
  }));

  const gamesData = await d3.csv('/data/unified_data.csv');
  const unfilteredGames: Game[] = gamesData.map(d => ({
    name: d.name,
    date: new Date(d.date),
    platform: d.platform,
    publisher: d.publisher,
    developer: d.developer,
    genre: d.genre,
    shipped: d.shipped ? parseInt(d.shipped) : undefined,
    total: d.total ? parseInt(d.total) : undefined,
    europe: d.europe ? parseInt(d.europe) : undefined,
    japan: d.japan ? parseInt(d.japan) : undefined,
    america: d.america ? parseInt(d.america) : undefined,
    other: d.other ? parseInt(d.other) : undefined,
    critic: d.critic ? parseInt(d.critic) : undefined,
    user: d.user ? parseInt(d.user) : undefined
  }));

  const filteredGames = new Map<string, Game>();
  unfilteredGames.forEach(game => {
    if (!filteredGames.has(game.name)) {
      filteredGames.set(game.name, game);
    }
  });

  const games = Array.from(filteredGames.values());
  const studios = Array.from(new Set(games.map(game => game.developer))).sort();
  const state = new FilterState(games, unfilteredLocations);

  const heatmap = await setupMap(state, studios);
  await setupTimeline(state, heatmap);
  setupGameAddingMechanic(state);

  const gameTitleSearch = document.getElementById('game-title-search') as HTMLInputElement;
  const searchButton = document.getElementById('game-title-search-button') as HTMLButtonElement;
  searchButton.addEventListener('click', async () => {
    const title = gameTitleSearch.value.trim();
    if (!title) {
      alert('Bitte geben Sie einen Spielnamen ein.');
      return;
    }

    const game = state.getGameDetails(title);
    if (!game) {
      alert('Spiel nicht gefunden.');
      return;
    }

    updateGameInfoSidebar(game);

    const developer = game.developer;
    heatmap.filterOutDevs(developer);

    const developerLocations = state.filteredLocations.find(location => location.Developer === developer);
    if (developerLocations) {
      console.log('Showing pin for developer:', developer);
      heatmap.showADevPin(developerLocations.Latitude, developerLocations.Longitude);
    } else {
      console.log('No location found for developer:', developer);
    }

    const releaseYer = game.date.getFullYear();
    state.setYearFilter(releaseYer, releaseYer);
    document.getElementById('timeline-from-filter')?.setAttribute('value', releaseYer.toString());
    document.getElementById('timeline-to-filter')?.setAttribute('value', releaseYer.toString());

    gameTitleSearch.value = '';
  });

  const uniqueGenres = state.getUniquePropertyVals('genre');
  console.log(uniqueGenres);

  const openGenreFilterButton = document.getElementById('open-genre-settings-filter') as HTMLButtonElement;
  const genreFilterPopup = document.getElementById('genre-filter-popup') as HTMLDivElement;
  const genreFilterContent = document.getElementById('genre-filter-content') as HTMLDivElement;
  const closeGenreFilterButton = document.getElementById('close-genre-filter-button') as HTMLSpanElement;

  makeDraggable(genreFilterPopup);

  openGenreFilterButton.addEventListener('click', () => {
    genreFilterPopup.style.display = 'block';
    genreFilterContent.innerHTML = '';

    const sortedGenres = Array.from(uniqueGenres).sort();

    sortedGenres.forEach(genre => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = genre;
      checkbox.value = genre;

      const label = document.createElement('label');
      label.htmlFor = genre;
      label.textContent = genre;

      const div = document.createElement('div');
      div.appendChild(checkbox);
      div.appendChild(label);

      genreFilterContent.appendChild(div);
    });

    const applyFilterButton = document.getElementById('apply-genre-filter-button') as HTMLButtonElement;
    const resetGenreFilterButton = document.getElementById('reset-genre-filter') as HTMLButtonElement;

    applyFilterButton.addEventListener('click', () => {
      const selectedGenres = new Set<string>();
      genreFilterContent.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        selectedGenres.add((checkbox as HTMLInputElement).value);
      });

      state.setGenreFilter(selectedGenres);
      genreFilterPopup.style.display = 'none';
      resetGenreFilterButton.style.removeProperty('display');
    });

    resetGenreFilterButton.addEventListener('click', () => {
      state.resetGenreFilter();
      resetGenreFilterButton.style.display = 'none';
    });

    closeGenreFilterButton.addEventListener('click', () => {
      genreFilterPopup.style.display = 'none';
    });
  });

  const uniquePlatforms = state.getUniquePropertyVals('platform');
  console.log(uniquePlatforms);

  const openPlatformFilterButton = document.getElementById('open-platform-settings-filter') as HTMLButtonElement;
  const platformFilterPopup = document.getElementById('platform-filter-popup') as HTMLDivElement;
  const platformFilterContent = document.getElementById('platform-filter-content') as HTMLDivElement;
  const closePlatformFilterButton = document.getElementById('close-platform-filter-button') as HTMLSpanElement;

  makeDraggable(platformFilterPopup);

  openPlatformFilterButton.addEventListener('click', () => {
    platformFilterPopup.style.display = 'block';
    platformFilterContent.innerHTML = '';

    const sortedPlatforms = Array.from(uniquePlatforms)
     .filter(platform => platform.trim() !== '')
     .sort();

    sortedPlatforms.forEach(platform => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = platform;
      checkbox.value = platform;

      const label = document.createElement('label');
      label.htmlFor = platform;
      label.textContent = platform;

      const div = document.createElement('div');
      div.appendChild(checkbox);
      div.appendChild(label);

      platformFilterContent.appendChild(div);
    });

    const applyPlatformFilterButton = document.getElementById('apply-platform-filter-button') as HTMLButtonElement;
    const resetPlatformFilterButton = document.getElementById('reset-plaform-filter') as HTMLButtonElement;

    applyPlatformFilterButton.addEventListener('click', () => {
      const selectedPlatforms = new Set<string>();
      platformFilterContent.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        selectedPlatforms.add((checkbox as HTMLInputElement).value);
      });

      state.setPlatformFilter(selectedPlatforms);
      platformFilterPopup.style.display = 'none';
      resetPlatformFilterButton.style.removeProperty('display');
    });

    resetPlatformFilterButton.addEventListener('click', () => {
      state.resetPlatformFilter();
      resetPlatformFilterButton.style.display = 'none';
    });

    closePlatformFilterButton.addEventListener('click', () => {
      platformFilterPopup.style.display = 'none';
    });
  });
}

async function setupMap(state: FilterState, studios: string[]): Promise<HeatmapChart> {
  const mapCanvas = document.getElementById('map-canvas') as HTMLDivElement;
  const map = new HeatmapChart();
  map.locations = state.filteredLocations;
  map.show(mapCanvas);

  const legendPopup = new LegendPopup(state.filteredLocations);
  let legendPopupIsHidden = true;

  const legendButton = document.querySelector('.open-legend-button') as HTMLButtonElement;
  legendButton.addEventListener('click', () => {
    legendPopupIsHidden = !legendPopupIsHidden;
    legendButton.innerText = legendPopupIsHidden ? 'Legende einblenden' : 'Legende ausblenden';
    legendPopup.toggleLegendVisibility();
  });


  state.onFilterUpdate(state => {
    console.log(state.filteredLocations.length)
    map.locations = state.filteredLocations;
  });

  const studioSelect = d3.select('#game-developer-filter');
  studioSelect.append('option').text('Alle Studios').attr('value', '');
  studios.forEach(studio => {
    studioSelect.append('option').text(studio).attr('value', studio);
  });

  studioSelect.on('change', () => {
    const val = studioSelect.property('value');
    if (val !== '') {
      state.setGameStudioFilter(val);
      const developerLocations = state.filteredLocations.find(location => location.Developer === val);
      if (developerLocations) {
        console.log('Showing pin for developer:', val);
        map.showADevPin(developerLocations.Latitude, developerLocations.Longitude);
      } else {
        console.log('No location found for developer:', val);
      }
    } else {
      state.resetGameStudioFilter();
      map.removeTheDevPin();
    }
  });

  const toggleHeatmapButton = document.getElementById('toggle-heatmap-mode') as HTMLButtonElement;
  toggleHeatmapButton.addEventListener('click', () => {
    map.toggleHeatmapMode();
    toggleHeatmapButton.innerText = map.heatConsistsOfPins ? 'Wechsel zu Heatmap' : 'Wechsel zu Pins';
  });

  const resetButton = document.getElementById('reset-pin-to-heat-button') as HTMLButtonElement;
  resetButton.addEventListener('click', () => {
    map.removeTheDevPin();
  });

  const reinitButton = document.getElementById('toggle-reinitialization-of-map') as HTMLButtonElement;
  reinitButton.addEventListener('click', () => {
    map.removeTheDevPin();
  });

  return map;
}

async function setupTimeline(state: FilterState, heatmap: HeatmapChart) {
  const timelineCanvas = document.getElementById('timeline-canvas') as HTMLDivElement;
  const timeline = new TimelineChart();

  const gamesWithDetails = state.filteredGames;
  const gamesMap = new Map<string, Game>();
  gamesWithDetails.forEach(game => gamesMap.set(game.name, game));

  timeline.games = gamesWithDetails.map(game => ({ title: game.name, year: game.date.getFullYear(), game }));

  const gameInfoSidebar = document.getElementById('game-info-sidebar') as HTMLDivElement;
  const closeSidebarButton = document.getElementById('close-sidebar-button') as HTMLSpanElement;

  closeSidebarButton.addEventListener('click', () => {
    gameInfoSidebar.style.display = 'none';
  });

  timeline.onBarClick = (gamesForYear, year) => {
    const gameList = d3.select('#timeline-games-list');
    gameList.selectAll('*').remove();

    gamesForYear.sort((a, b) => a.game.name.localeCompare(b.game.name)).forEach(g => {
      const game = g.game;

      const genreDisplay = game.genre === "Unknown" ? "Unbekannt" : game.genre === "Misc" ? "Verschiedenes" : game.genre;
      const platformsDisplay = game.platform.replace(/\|/g, ' | ');

      let tooltipText = `Name: ${game.name}\nGenre(s): ${genreDisplay}\nPlattform(en): ${platformsDisplay}\nPublisher: ${game.publisher}\nEntwickler: ${game.developer}\nErscheinungsdatum: ${game.date.toDateString()}`;

      if (game.shipped !== undefined && game.shipped !== 0) tooltipText += `\nAusgelieferte Einheiten: ${game.shipped * 10} Millionen`;
      if (game.total !== undefined && game.total !== 0) tooltipText += `\nGesamtverkäufe: ${(game.total * 10)} Millionen`;
      if (game.europe !== undefined && game.europe !== 0) tooltipText += `\nVerkäufe in Europa: ${(game.europe * 10)} Millionen`;
      if (game.japan !== undefined && game.japan !== 0) tooltipText += `\nVerkäufe in Japan: ${(game.japan * 10)} Millionen`;
      if (game.america !== undefined && game.america !== 0) tooltipText += `\nVerkäufe in Amerika: ${(game.america * 10)} Millionen`;
      if (game.other !== undefined && game.other !== 0) tooltipText += `\nVerkäufe in anderen Gebieten: ${(game.other * 10)} Millionen`;
      if (game.critic !== undefined && game.critic !== 0) tooltipText += `\nPresse-Score: ${game.critic}`;
      if (game.user !== undefined && game.user !== 0) tooltipText += `\nSpieler-Score: ${game.user}`;

      gameList.append('div')
        .text(game.name)
        .attr('title', tooltipText)
        .style('cursor', 'pointer')
        .style('margin', '5px 0')
        .on('mouseover', function() {
          d3.select(this).style('color', 'blue');
        })
        .on('mouseout', function() {
          d3.select(this).style('color', 'black');
        })
        .on('click', function() {
          updateGameInfoSidebar(game);
          const developer = game.developer;
          heatmap.filterOutDevs(developer);

          const developerLocations = state.filteredLocations.find(location => location.Developer === developer);
          if (developerLocations) {
            console.log('Showing pin for developer:', developer);
            heatmap.showADevPin(developerLocations.Latitude, developerLocations.Longitude);
          } else {
            console.log('No location found for developer:', developer);
          }
        });
    });

    d3.select('#timeline-games-year').text(year);

    state.setYearFilter(year, year);
    document.getElementById('timeline-from-filter')?.setAttribute('value', year.toString());
    document.getElementById('timeline-to-filter')?.setAttribute('value', year.toString());
  };

  timeline.show(timelineCanvas);

  const sidebar = document.getElementById('game-info-sidebar') as HTMLDivElement;
  makeDraggable(sidebar);

  d3.select('#timeline-prev').on('click', () => timeline.previousYear());
  d3.select('#timeline-next').on('click', () => timeline.nextYear());
  d3.select('#timeline-interval-reset').on('click', () => {
    state.resetYearFilter();
    (document.getElementById('timeline-from-filter') as HTMLInputElement).value = '';
    (document.getElementById('timeline-to-filter') as HTMLInputElement).value = '';
  });

  d3.select('#timeline-interval-apply').on('click', () => {
    const startYear = parseInt((document.getElementById('timeline-from-filter') as HTMLInputElement).value);
    const endYear = parseInt((document.getElementById('timeline-to-filter') as HTMLInputElement).value);
    state.setYearFilter(startYear, endYear);
  });

  state.onFilterUpdate(state => {
    timeline.games = state.filteredGames.map(game => ({ title: game.name, year: game.date.getFullYear(), game }));
    timeline.show(timelineCanvas);
  });
}

setup()