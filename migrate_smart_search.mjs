import fs from 'fs';
import path from 'path';

// 1. Remove from Merchant
const mDir = 'src/pages/merchant';
fs.readdirSync(mDir).filter(f => f.endsWith('.tsx')).forEach(file => {
  const filePath = path.join(mDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\s*\{\s*label:\s*'الاستيراد الذكي',\s*href:\s*'\/merchant\/smart-search',\s*icon:\s*<Search size=\{20\}\s*\/>\s*\},/g, '');
  fs.writeFileSync(filePath, content);
});

// 2. Add to Admin
const aDir = 'src/pages/admin';
fs.readdirSync(aDir).filter(f => f.endsWith('.tsx')).forEach(file => {
  const filePath = path.join(aDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const linkStr = "{ label: 'بحث علي بابا', href: '/admin/alibaba-search', icon: <Search size={20} /> },";
  if (!content.includes('/admin/alibaba-search') && content.includes('sidebarLinks={[')) {
    content = content.replace(/(\{\s*label:\s*'الاستيراد الذكي'.*?\},)/, (match, p1) => {
      return p1 + '\n        ' + linkStr;
    });
  }
  
  if (content.includes('lucide-react') && !content.includes('Search')) {
    content = content.replace(/(import\s+\{[^}]*)(}\s+from\s+['"]lucide-react['"];)/, (match, p1, p2) => {
      return p1 + ', Search ' + p2;
    });
  }
  fs.writeFileSync(filePath, content);
});

// 3. Update App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/import MerchantSmartSearch from '\.\/pages\/merchant\/MerchantSmartSearch';\n/g, '');
appContent = appContent.replace(/import MerchantSmartSearch from '\.\/pages\/merchant\/MerchantSmartSearch';/g, '');

if (!appContent.includes('import AdminAlibabaSearch')) {
  appContent = appContent.replace(/import AdminSmartImport from '\.\/pages\/admin\/AdminSmartImport';/, "import AdminSmartImport from './pages/admin/AdminSmartImport';\nimport AdminAlibabaSearch from './pages/admin/AdminAlibabaSearch';");
}

appContent = appContent.replace(/<Route path="\/merchant\/smart-search" element=\{\s*<ProtectedRoute allowedRoles=\{\['merchant'\]\}>\s*<MerchantSmartSearch \/>\s*<\/ProtectedRoute>\s*\} \/>\s*/g, '');

if (!appContent.includes('<Route path="/admin/alibaba-search"')) {
  appContent = appContent.replace(/<Route path="\/admin\/smart-import" element=\{\s*<ProtectedRoute allowedRoles=\{\['admin'\]\}>\s*<AdminSmartImport \/>\s*<\/ProtectedRoute>\s*\} \/>/, match => match + '\n\n          <Route path="/admin/alibaba-search" element={\n            <ProtectedRoute allowedRoles={[\'admin\']}>\n              <AdminAlibabaSearch />\n            </ProtectedRoute>\n          } />');
}

fs.writeFileSync('src/App.tsx', appContent);

console.log('Done migrating to admin');
