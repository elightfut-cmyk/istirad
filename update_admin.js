const fs = require('fs');
const path = require('path');

const dir = 'src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const newLink = "        { label: '”Êﬁ «·ÿ·»« ', href: '/admin/requests', icon: <Package size={20} /> },";

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes("href: '/admin/requests'")) {
    console.log("Skipping " + f + ", already has requests link.");
    return;
  }
  
  // Find where the orders link is, and insert the requests link after it
  const searchStr = "{ label: '«·ÿ·»«  «·⁄«„…', href: '/admin/orders', icon: <ShoppingBag size={20} /> },";
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, searchStr + '\n' + newLink);
    // Add import Package if it's missing
    if (!content.includes('Package') && content.includes('lucide-react')) {
      content = content.replace('lucide-react\';', ', Package } from \'lucide-react\';');
    }
    fs.writeFileSync(filePath, content);
    console.log("Updated " + f);
  }
});

// Update App.tsx
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
