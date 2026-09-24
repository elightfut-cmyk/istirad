import fs from 'fs';
import path from 'path';

const dir = 'src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add Lightbulb to lucide-react imports if not there
  if (content.includes('lucide-react') && !content.includes('Lightbulb')) {
    content = content.replace(/(import\s+\{[^}]*)(}\s+from\s+['"]lucide-react['"];)/, (match, p1, p2) => {
      return p1 + ', Lightbulb ' + p2;
    });
  }

  // Add Suggestions to sidebarLinks
  const linkStr = "{ label: 'الاقتراحات', href: '/admin/suggestions', icon: <Lightbulb size={20} /> },";
  if (!content.includes('/admin/suggestions') && content.includes('sidebarLinks={[')) {
    content = content.replace(/(\{\s*label:\s*'الشكاوى'.*?\},)/, (match, p1) => {
      return p1 + '\n        ' + linkStr;
    });
  }

  fs.writeFileSync(filePath, content);
});

// Update App.tsx just in case
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (!appContent.includes('import AdminSuggestions')) {
  appContent = appContent.replace(/import AdminComplaints from '\.\/pages\/admin\/AdminComplaints';/g, "import AdminComplaints from './pages/admin/AdminComplaints';\nimport AdminSuggestions from './pages/admin/AdminSuggestions';");
}
if (!appContent.includes('<Route path="/admin/suggestions"')) {
  appContent = appContent.replace(/<Route path="\/admin\/complaints" element=\{\s*<ProtectedRoute allowedRoles=\{\['admin'\]\}>\s*<AdminComplaints \/>\s*<\/ProtectedRoute>\s*\} \/>/, match => match + '\n\n          <Route path="/admin/suggestions" element={\n            <ProtectedRoute allowedRoles={[\'admin\']}>\n              <AdminSuggestions />\n            </ProtectedRoute>\n          } />');
}
fs.writeFileSync('src/App.tsx', appContent);
console.log('Done updating admin sidebars and App.tsx');
