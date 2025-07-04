import {DeveloperLocation} from "@/scripts/heatmap.ts";
import {Game} from "@/scripts/timeline.ts";

const GOOGLE_API_KEY = "AIzaSyAXZEZeHvZa-LDKUHnanr89VxC7eakGmXE";
const RAWG_API_KEY = "b062cd97f3414aea899acb6ae86b344b";

export async function resolveGame(name: string): Promise<{developer?: DeveloperLocation, game: Game}|undefined> {
  const slug = await findGameSlug(name);
  if (!slug) {
    return undefined;
  }

  const gameDetails = await findGameDetails(slug);
  if (!gameDetails) {
    return undefined;
  }
/*
  const developer = await findLocation(gameDetails.developers[0].name);
  if (!developer) {
    return {game: {
        name: gameDetails.name,
        date: new Date(gameDetails.released),
        genre: gameDetails.genres.map((genre: any) => genre.name).join(', '),
        platform: gameDetails.platforms.map((platform: any) => platform.platform.name).join(', '),
        publisher: gameDetails.publishers.map((publisher: any) => publisher.name).join(', '),
        developer: gameDetails.developers.map((developer: any) => developer.name).join(', ')
      }
    };
  }*/

  return {
    //developer,
    game: {
      name: gameDetails.name,
      date: new Date(gameDetails.released),
      genre: gameDetails.genres.map((genre: any) => genre.name).join(', '),
      platform: gameDetails.platforms.map((platform: any) => platform.platform.name).join(', '),
      publisher: gameDetails.publishers.map((publisher: any) => publisher.name).join(', '),
      developer: gameDetails.developers.map((developer: any) => developer.name).join(', ')
    }
  };
}

async function findGameDetails(slug: string): Promise<any|undefined> {
  try {
    const url = `https://api.rawg.io/api/games/${slug}?key=${RAWG_API_KEY}`;
    const response = await fetch(url);
    return await response.json();
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

async function findGameSlug(name: string): Promise<string|undefined> {
  try {
    const encodedName = encodeURIComponent(name);
    const url = `https://api.rawg.io/api/games?search=${encodedName}&key=${RAWG_API_KEY}&page_size=1`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.count === 0) {
      return undefined;
    }

    return data.results[0].slug;
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

/*
async function findLocation(developer: string): Promise<DeveloperLocation|undefined> {
  try {
    const encodedDeveloper = encodeURIComponent(developer);
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedDeveloper}&inputtype=textquery&fields=formatted_address,name,geometry,types&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK') {
      return undefined;
    }

    for (const candidate of data.candidates) {
      if (candidate.types.includes('establishment') || candidate.types.includes('point_of_interest')) {
        return {
          Developer: developer,
          Latitude: candidate.geometry.location.lat,
          Longitude: candidate.geometry.location.lng,
          PlaceName: candidate.name,
          Address: candidate.formatted_address
        };
      }
    }

    const fallback = data.candidates[0];
    return {
      Developer: developer,
      Latitude: fallback.geometry.location.lat,
      Longitude: fallback.geometry.location.lng,
      PlaceName: fallback.name,
      Address: fallback.formatted_address
    };
  } catch (e) {
    console.error(e);
    return undefined;
  }
}*/