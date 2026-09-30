const fs = require('fs');
const path = require('path');

const dir = 'src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const linkStr = "{ label: 'فيديو الرئيسية', href: '/admin/main-video', icon: <Video size={20} /> },";
  
  // Find where sidebarLinks array ends and insert the link before the closing bracket if not exists
  if (!content.includes("href: '/admin/main-video'")) {
    const sidebarLinksRegex = /sidebarLinks=\s*\{\s*\[\s*([\s\S]*?)\s*\]\s*\}/;
    const match = content.match(sidebarLinksRegex);
    
    if (match) {
      const linksContent = match[1];
      const newLinksContent = linksContent + ',\n        ' + linkStr;
      content = content.replace(sidebarLinksRegex, `sidebarLinks={[\n        ${newLinksContent.replace(/^,\n\s*/, '')}\n      ]}`);
    }
  }

  // Ensure Video is imported
  if (content.includes('lucide-react') && !content.includes('Video')) {
    content = content.replace(/(import\s+\{[^}]*)(}\s+from\s+['"]lucide-react['"];)/, (match, p1, p2) => {
      return p1 + ', Video ' + p2;
    });
  }

  // Clean up trailing commas and formatting in sidebar links just in case
  content = content.replace(/,\s*,/g, ',');

  fs.writeFileSync(filePath, content);
});

console.log('Fixed sidebars and video imports.');
