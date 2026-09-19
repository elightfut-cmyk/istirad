const fs = require('fs');
const file = 'src/pages/admin/AdminRequests.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Calculator')) {
  // Let's just find "from 'lucide-react';" and replace with it
  content = content.replace("} from 'lucide-react';", ", Calculator } from 'lucide-react';");
}

fs.writeFileSync(file, content);
console.log('done');
