import fs from 'fs';
import path from 'path';

// 1. Update App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (!appContent.includes('import AdminSmartImport')) {
  appContent = appContent.replace(/import AdminSuggestions from '\.\/pages\/admin\/AdminSuggestions';/, "import AdminSuggestions from './pages/admin/AdminSuggestions';\nimport AdminSmartImport from './pages/admin/AdminSmartImport';");
}
if (!appContent.includes('<Route path="/admin/smart-import"')) {
  appContent = appContent.replace(/<Route path="\/admin\/suggestions" element=\{\s*<ProtectedRoute allowedRoles=\{\['admin'\]\}>\s*<AdminSuggestions \/>\s*<\/ProtectedRoute>\s*\} \/>/, match => match + '\n\n          <Route path="/admin/smart-import" element={\n            <ProtectedRoute allowedRoles={[\'admin\']}>\n              <AdminSmartImport />\n            </ProtectedRoute>\n          } />');
}
fs.writeFileSync('src/App.tsx', appContent);

// 2. Update Admin Sidebars
const dir = 'src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'AdminSmartImport.tsx');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add Search to lucide-react imports if not there
  if (content.includes('lucide-react') && !content.includes('Search')) {
    content = content.replace(/(import\s+\{[^}]*)(}\s+from\s+['"]lucide-react['"];)/, (match, p1, p2) => {
      return p1 + ', Search ' + p2;
    });
  }

  // Add Smart Import to sidebarLinks
  const linkStr = "{ label: 'الاستيراد الذكي', href: '/admin/smart-import', icon: <Search size={20} /> },";
  if (!content.includes('/admin/smart-import') && content.includes('sidebarLinks={[')) {
    content = content.replace(/(\{\s*label:\s*'الاقتراحات'.*?\},)/, (match, p1) => {
      return p1 + '\n        ' + linkStr;
    });
  }

  fs.writeFileSync(filePath, content);
});
console.log('App.tsx and sidebars updated');
