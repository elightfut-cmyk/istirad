const fs = require('fs');
const path = require('path');

const dir = 'src/pages/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'AdminRequests.tsx' && f !== 'AdminOrders.tsx');

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes("from 'lucide-react'")) {
    content = content.replace("from 'lucide-react'", "from 'lucide-react'");
    // Actually we need to add Package inside the curly braces
    // Let's just find "from 'lucide-react'" or 'from "lucide-react"'
    // A simpler way is to replace "} from 'lucide-react'" with ", Package } from 'lucide-react'"
    if (!content.includes('Package,') && !content.includes(' Package }')) {
      content = content.replace("} from 'lucide-react'", ", Package } from 'lucide-react'");
      content = content.replace("} from \"lucide-react\"", ", Package } from \"lucide-react\"");
      fs.writeFileSync(filePath, content);
      console.log("Fixed import in " + f);
    }
  }
});
