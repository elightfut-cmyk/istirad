const fs = require('fs');
const file = 'src/pages/supplier/SupplierRequests.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /{formatCurrency\(otherBid\.price \/ \(req\.quantity \|\| 1\)\)}/g,
  "{formatCurrency((otherBid.cost_price || otherBid.price) / (req.quantity || 1))}"
);
content = content.replace(
  /{formatCurrency\(otherBid\.price\)}/g,
  "{formatCurrency(otherBid.cost_price || otherBid.price)}"
);

content = content.replace(
  /<span className="text-xs text-gray-500">سعر القطعة:<\/span>/g,
  '<span className="text-xs text-gray-500">سعر القطعة (الخام):</span>'
);
content = content.replace(
  /<span className="text-xs text-gray-500">السعر الإجمالي \(بنسبة عربون {otherBid\.advance_percentage}%\):<\/span>/g,
  '<span className="text-xs text-gray-500">السعر الإجمالي الخام (بنسبة عربون {otherBid.advance_percentage}%):</span>'
);

fs.writeFileSync(file, content);
console.log('done');
