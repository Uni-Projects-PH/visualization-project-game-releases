const axios = require('axios');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const readline = require('readline');

const API_KEY = "AIzaSyAXZEZeHvZa-LDKUHnanr89VxC7eakGmXE";

const csvWriter = createCsvWriter({
  path: 'studios_geocode.csv',
  header: [
    {id: 'developer', title: 'Developer'},
    {id: 'lat', title: 'Latitude'},
    {id: 'lng', title: 'Longitude'},
    {id: 'name', title: 'Place Name'},
    {id: 'address', title: 'Address'}
  ]
});

async function getCoordinates(developer) {
  const encodedDeveloper = encodeURIComponent(developer);
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedDeveloper}&inputtype=textquery&fields=formatted_address,name,geometry,types&key=${API_KEY}`;
  
  try {
    const response = await axios.get(url);
    if (response.data.status === 'OK' && response.data.candidates.length > 0) {
      // Iterate over the results to find the most relevant one
      for (const candidate of response.data.candidates) {
        // Check if the 'types' array contains relevant information (e.g., 'point_of_interest', 'establishment')
        if (candidate.types.includes('establishment') || candidate.types.includes('point_of_interest')) {
          return {
            developer: developer,
            lat: candidate.geometry.location.lat,
            lng: candidate.geometry.location.lng,
            name: candidate.name,
            address: candidate.formatted_address
          };
        }
      }
      // If no valid candidate is found, return the first one with a warning
      const fallback = response.data.candidates[0];
      console.log(`No exact match for ${developer}. Using fallback: ${fallback.name}`);
      return {
        developer: developer,
        lat: fallback.geometry.location.lat,
        lng: fallback.geometry.location.lng,
        name: fallback.name,
        address: fallback.formatted_address
      };
    } else {
      console.log(`No results found for ${developer}.`);
      return null; // Return null if no results are found
    }
  } catch (error) {
    console.error(`Error fetching data for ${developer}: `, error);
    return null; // Return null in case of an error
  }
}

async function main() {
  const geocodedData = [];
  
  const fileStream = fs.createReadStream('unique_developers.txt');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const developer = line.trim();
    if (developer) {
      console.log(`Fetching coordinates for ${developer}...`);
      const data = await getCoordinates(developer);
      if (data) {
        geocodedData.push(data);
      }
    }
  }

  if (geocodedData.length > 0) {
    await csvWriter.writeRecords(geocodedData);
    console.log('CSV file created successfully!');
  } else {
    console.log('No valid data to write to CSV.');
  }
}

main();