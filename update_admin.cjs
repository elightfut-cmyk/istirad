const fs = require('fs');
const path = require('path');

const dir = 'src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'AdminRequests.tsx');

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes("href: '/admin/requests'")) {
    console.log("Skipping " + f);
    return;
  }
  
  const searchStr = "href: '/admin/orders'";
  if (content.includes(searchStr)) {
    // Find the end of the line containing the search string
    const lines = content.split('\n');
    const newLines = [];
    let added = false;
    for (let i = 0; i < lines.length; i++) {
      newLines.push(lines[i]);
      if (lines[i].includes(searchStr) && !added) {
        // extract indent
        const indent = lines[i].match(/^\s*/)[0];
        // the next line has Arabic, let's use Buffer or Unicode escapes
        // "\u0633\u0648\u0642 \u0627\u0644\u0637\u0644\u0628\u0627\u062a" = ÓæÞ ÇáØáÈÇÊ
        newLines.push(indent + "{ label: '\u0633\u0648\u0642 \u0627\u0644\u0637\u0644\u0628\u0627\u062a', href: '/admin/requests', icon: <Package size={20} /> },");
        added = true;
      }
    }
    content = newLines.join('\n');
    
    if (!content.includes('Package') && content.includes('lucide-react')) {
      content = content.replace('lucide-react\';', ', Package } from \'lucide-react\';');
    }
    fs.writeFileSync(filePath, content);
    console.log("Updated " + f);
  }
});

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (!appContent.includes('AdminRequests')) {
  appContent = appContent.replace(
    "import AdminOrders from './pages/admin/AdminOrders';",
    "import AdminOrders from './pages/admin/AdminOrders';\nimport AdminRequests from './pages/admin/AdminRequests';"
  );
  appContent = appContent.replace(
    "<Route path=\"/admin/orders\"",
    "<Route path=\"/admin/requests\" element={\n              <ProtectedRoute allowedRoles={['admin']}>\n                <AdminRequests />\n              </ProtectedRoute>\n            } />\n            \n            <Route path=\"/admin/orders\""
  );
  fs.writeFileSync('src/App.tsx', appContent);
  console.log('Updated App.tsx');
}
