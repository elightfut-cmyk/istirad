const fs = require('fs');
const path = require('path');

const dir = 'src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add Video to lucide-react imports if not there
  if (content.includes('lucide-react') && !content.includes('Video')) {
    content = content.replace(/(import\s+\{[^}]*)(}\s+from\s+['"]lucide-react['"];)/, (match, p1, p2) => {
      return p1 + ', Video ' + p2;
    });
  }

  // Add Video link to sidebarLinks
  const linkStr = "{ label: 'فيديو الرئيسية', href: '/admin/main-video', icon: <Video size={20} /> },";
  if (!content.includes('/admin/main-video') && content.includes('sidebarLinks={[')) {
    // find the last link and append after it or just find 'بحث علي بابا' and append after
    content = content.replace(/(\{\s*label:\s*'بحث علي بابا'.*?\},)/, (match, p1) => {
      return p1 + '\n        ' + linkStr;
    });
  }

  fs.writeFileSync(filePath, content);
});

// Update App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (!appContent.includes('import AdminMainVideo')) {
  appContent = appContent.replace(/import AdminAlibabaSearch from '\.\/pages\/admin\/AdminAlibabaSearch';/g, "import AdminAlibabaSearch from './pages/admin/AdminAlibabaSearch';\nimport AdminMainVideo from './pages/admin/AdminMainVideo';");
}
if (!appContent.includes('<Route path="/admin/main-video"')) {
  appContent = appContent.replace(/<Route path="\/admin\/alibaba-search" element=\{\s*<ProtectedRoute allowedRoles=\{\['admin'\]\}>\s*<AdminAlibabaSearch \/>\s*<\/ProtectedRoute>\s*\} \/>/, match => match + '\n\n          <Route path="/admin/main-video" element={\n            <ProtectedRoute allowedRoles={[\'admin\']}>\n              <AdminMainVideo />\n            </ProtectedRoute>\n          } />');
}
fs.writeFileSync('src/App.tsx', appContent);
console.log('Done updating admin sidebars and App.tsx');
