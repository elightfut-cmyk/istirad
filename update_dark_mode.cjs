const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync('src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Backgrounds
  content = content.replace(/bg-white(?!\s+dark:)/g, 'bg-white dark:bg-gray-800');
  content = content.replace(/bg-gray-50(?!\s+dark:)/g, 'bg-gray-50 dark:bg-gray-900');
  content = content.replace(/bg-gray-100(?!\s+dark:)/g, 'bg-gray-100 dark:bg-gray-800');
  
  // Text colors
  content = content.replace(/text-gray-900(?!\s+dark:)/g, 'text-gray-900 dark:text-white');
  content = content.replace(/text-gray-800(?!\s+dark:)/g, 'text-gray-800 dark:text-gray-100');
  content = content.replace(/text-gray-700(?!\s+dark:)/g, 'text-gray-700 dark:text-gray-200');
  content = content.replace(/text-gray-600(?!\s+dark:)/g, 'text-gray-600 dark:text-gray-300');
  content = content.replace(/text-gray-500(?!\s+dark:)/g, 'text-gray-500 dark:text-gray-400');
  
  // Borders
  content = content.replace(/border-gray-100(?!\s+dark:)/g, 'border-gray-100 dark:border-gray-700');
  content = content.replace(/border-gray-200(?!\s+dark:)/g, 'border-gray-200 dark:border-gray-700');
  content = content.replace(/border-gray-300(?!\s+dark:)/g, 'border-gray-300 dark:border-gray-600');

  // Divide
  content = content.replace(/divide-gray-100(?!\s+dark:)/g, 'divide-gray-100 dark:divide-gray-700');
  content = content.replace(/divide-gray-200(?!\s+dark:)/g, 'divide-gray-200 dark:divide-gray-700');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
