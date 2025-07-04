const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const file1Path = path.resolve(__dirname,'vgchartz-database.csv');  // project dataset
const file2Path = path.resolve(__dirname,'vgchartz-2024.csv');    // dataset with genres
const outputFilePath = path.resolve(__dirname,'merged_data.csv');   // output file path

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

async function mergeCSVFiles() {
  try {
    const projectData = await readCSV(file1Path);
    const genreData = await readCSV(file2Path);

    const genreMap = {};
    genreData.forEach(row => {
      genreMap[row.name] = row.genre; 
    });

    let complianceCount = 0;

    const mergedData = projectData.map(row => {
      if (genreMap[row.name]) {
        row.genre = genreMap[row.name]; 
        console.log(`Compliance found: Game ${row.name} with genre ${row.genre}`);
        complianceCount++;
      } else {
        row.genre = 'Unknown'; 
      }
      return row;
    });

    saveAsCSV(mergedData, outputFilePath);
    console.log(`CSV files have been successfully merged and saved under: ${outputFilePath}`);
    console.log(`Number of successful merges: ${complianceCount}`);
  } catch (error) {
    console.error('Fehler beim Zusammenführen der CSV-Dateien:', error);
  }
}


function saveAsCSV(data, filePath) {
  const header = Object.keys(data[0]).join(','); 
  const rows = data.map(row => Object.values(row).join(',')); 
  const csvContent = [header, ...rows].join('\n'); 

  fs.writeFileSync(filePath, csvContent, 'utf8');
}

mergeCSVFiles();
