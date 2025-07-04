const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const inputFilePath = path.resolve(__dirname, 'merged_data.csv');  
const outputFilePath = path.resolve(__dirname, 'unified_data.csv');  

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

async function unifyPlatforms() {
  try {
    const gameData = await readCSV(inputFilePath);

    const unifiedData = {};

    const separator = '|';

    gameData.forEach(row => {
      try {
        const gameName = row.name;
        let platform = row.platform;

        if (!gameName || !platform) {
          console.warn(`Attention: Line with missing data has been skipped - ${JSON.stringify(row)}`);
          return;
        }

        if (platform.toLowerCase() === 'all') {
          console.log(`Info: Platform "All" for the game ${gameName} has been ignored.`);
          return;
        }

        if (unifiedData[gameName]) {
          unifiedData[gameName].platforms.add(platform);
          console.log(`Unified: Added platform ${platform} to game ${gameName}`);
        } else {
          unifiedData[gameName] = { ...row, platforms: new Set([platform]) };
          console.log(`Unified: Created new entry for game ${gameName} with platform ${platform}`);
        }
      } catch (innerError) {
        console.error(`Error when processing the line: ${JSON.stringify(row)} - Error: ${innerError.message}`);
      }
    });

    const mergedData = Object.values(unifiedData).map(row => {
      row.platform = Array.from(row.platforms).join(separator);
      delete row.platforms;
      return row;
    });

    saveAsCSV(mergedData, outputFilePath);
    console.log(`The unified CSV file was successfully saved under: ${outputFilePath}`);
  } catch (error) {
    console.error('Error when unifying the platforms:', error);
  }
}

function saveAsCSV(data, filePath) {
  const header = Object.keys(data[0]).join(','); 
  const rows = data.map(row => Object.values(row).join(',')); 
  const csvContent = [header, ...rows].join('\n'); 

  fs.writeFileSync(filePath, csvContent, 'utf8');
}

unifyPlatforms();
