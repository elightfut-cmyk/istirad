import fs from 'fs';
import path from 'path';

function removeUnused(filePath, searchStr) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(searchStr, '');
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/\{\s*,/g, '{');
  content = content.replace(/,\s*\}/g, '}');
  fs.writeFileSync(filePath, content);
}

// 1. AdminAlibabaSearch
const adminAlibabaPath = 'src/pages/admin/AdminAlibabaSearch.tsx';
let adminContent = fs.readFileSync(adminAlibabaPath, 'utf8');
adminContent = adminContent.replace(/,\s*ShoppingCart/g, '');
adminContent = adminContent.replace(/ShoppingCart\s*,/g, '');
adminContent = adminContent.replace(/const { formatCurrency } = useSettingsStore\(\);\n/, '');
adminContent = adminContent.replace(/import { useSettingsStore } from '\.\.\/\.\.\/store\/useSettingsStore';\n/, '');
fs.writeFileSync(adminAlibabaPath, adminContent);

// 2. Others unused 'Search'
const filesToFix = [
  'src/pages/admin/AdminNotifications.tsx',
  'src/pages/merchant/MerchantComplaints.tsx',
  'src/pages/merchant/MerchantDashboard.tsx',
  'src/pages/merchant/MerchantReferrals.tsx',
  'src/pages/merchant/MerchantWallet.tsx'
];

filesToFix.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/,\s*Search/g, '');
    content = content.replace(/Search\s*,/g, '');
    fs.writeFileSync(f, content);
  }
});

console.log('Fixed imports');
