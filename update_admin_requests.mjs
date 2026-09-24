import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AdminRequests.tsx', 'utf8');

if (!content.includes('cancellation_reason')) {
  // Add to query
  content = content.replace(/id, title, quantity, status, created_at, description,/, 'id, title, quantity, status, created_at, description, cancellation_reason,');

  // Add badge logic
  content = content.replace(
    /req\.status === 'completed' \? 'bg-purple-50 text-purple-700' :/,
    "req.status === 'completed' ? 'bg-purple-50 text-purple-700' :\n                        req.status === 'cancelled' ? 'bg-red-50 text-red-700' :"
  );
  content = content.replace(
    /req\.status === 'completed' \? 'مكتمل' : 'مغلق'\}/,
    "req.status === 'completed' ? 'مكتمل' : \n                         req.status === 'cancelled' ? 'ملغاة' : 'مغلق'}"
  );

  // Add reason in expanded section
  const insertIndex = content.indexOf('<p className="text-sm text-gray-700 mb-4 bg-white p-4 rounded-xl border border-gray-100">');
  const alertStr = `
                    {req.status === 'cancelled' && (
                      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-4">
                        <p className="font-bold flex items-center gap-2">تم إلغاء هذه المناقصة من قبل التاجر</p>
                        {req.cancellation_reason && <p className="text-sm mt-2 font-normal">سبب الإلغاء: {req.cancellation_reason}</p>}
                      </div>
                    )}
`;
  content = content.slice(0, insertIndex) + alertStr + content.slice(insertIndex);
  
  fs.writeFileSync('src/pages/admin/AdminRequests.tsx', content);
  console.log('AdminRequests.tsx updated');
}
