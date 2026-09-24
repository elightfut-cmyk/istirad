const fs = require('fs');
let envContent = fs.readFileSync('.env', 'utf8');
if (!envContent.includes('VITE_RAPIDAPI_KEY')) {
  fs.appendFileSync('.env', '\n# RapidAPI Key for Smart Import (Alibaba/1688 AliExpress Lens)\nVITE_RAPIDAPI_KEY=""\n');
  console.log('Added VITE_RAPIDAPI_KEY to .env');
} else {
  console.log('VITE_RAPIDAPI_KEY already exists in .env');
}
