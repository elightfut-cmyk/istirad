const fs = require('fs');
const file = 'src/store/useSettingsStore.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "formatCurrency: (amount: number) => {",
  "formatCurrency: (amount: number) => {\n          if (amount === undefined || amount === null || isNaN(amount)) amount = 0;"
);

fs.writeFileSync(file, content);
console.log('fixed formatCurrency');
