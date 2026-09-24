import fs from 'fs';
import path from 'path';

const dir = 'src/pages/merchant';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add Search to lucide-react imports if not there
  if (content.includes('lucide-react') && !content.includes('Search')) {
    content = content.replace(/(import\s+\{[^}]*)(}\s+from\s+['"]lucide-react['"];)/, (match, p1, p2) => {
      return p1 + ', Search ' + p2;
    });
  }

  // Add Smart Search to sidebarLinks
  const linkStr = "{ label: 'الاستيراد الذكي', href: '/merchant/smart-search', icon: <Search size={20} /> },";
  if (!content.includes('/merchant/smart-search') && content.includes('sidebarLinks={[')) {
    content = content.replace(/(\{\s*label:\s*'تصفح المنتجات'.*?\},)/, (match, p1) => {
      return p1 + '\n        ' + linkStr;
    });
  }

  fs.writeFileSync(filePath, content);
});

console.log('Done updating merchant sidebars');
