import fs from 'fs';

let content = fs.readFileSync('src/pages/supplier/SupplierRequests.tsx', 'utf8');

// Include cancelled requests in the open/closed filter if needed, or maybe all filter.
if (content.includes("if (filterStatus === 'closed') return req.status === 'closed';")) {
  content = content.replace(
    /if \(filterStatus === 'closed'\) return req\.status === 'closed';/,
    "if (filterStatus === 'closed') return req.status === 'closed' || req.status === 'cancelled';"
  );
}

// Ensure AlertTriangle is imported
if (!content.includes('AlertTriangle')) {
  content = content.replace(/import {([^}]*)} from 'lucide-react';/, "import {$1, AlertTriangle} from 'lucide-react';");
}

// Add the cancelled alert
if (!content.includes('req.cancellation_reason')) {
  const insertIndex = content.indexOf('{(req.supplier_bids?.length > 0 || activeInterests.length > 0) && (');
  const alertStr = `
                  {req.status === 'cancelled' && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-4">
                      <p className="font-bold flex items-center gap-2"><AlertTriangle size={18} /> تم إلغاء هذه المناقصة من قبل التاجر</p>
                      {req.cancellation_reason && <p className="text-sm mt-2 font-normal">سبب الإلغاء: {req.cancellation_reason}</p>}
                    </div>
                  )}
`;
  content = content.slice(0, insertIndex) + alertStr + content.slice(insertIndex);
}

// Add status label for cancelled
content = content.replace(
  /\{isClosed \? 'مغلق \(تمت الصفقة\)' : 'مفتوح لتلقي العروض'\}/,
  "{req.status === 'cancelled' ? 'ملغاة' : isClosed ? 'مغلق (تمت الصفقة)' : 'مفتوح لتلقي العروض'}"
);
content = content.replace(
  /\{isClosed \? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'\}/,
  "{req.status === 'cancelled' ? 'bg-red-100 text-red-700' : isClosed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}"
);

// If request is cancelled, block bidding
content = content.replace(
  /myBid\.status === 'accepted' \? \(/g,
  "req.status === 'cancelled' ? (<div className=\"text-gray-500 font-medium\">تم إلغاء الطلب من التاجر.</div>) : myBid.status === 'accepted' ? ("
);

content = content.replace(
  /\) : isClosed \? \(/,
  ") : isClosed || req.status === 'cancelled' ? ("
);

// We need to make sure custom_requests select includes cancellation_reason
if (!content.includes('cancellation_reason')) {
    content = content.replace(/image_url, product_link, merchant_id,/, "image_url, product_link, merchant_id, cancellation_reason,");
}

fs.writeFileSync('src/pages/supplier/SupplierRequests.tsx', content);
console.log('SupplierRequests.tsx updated');
