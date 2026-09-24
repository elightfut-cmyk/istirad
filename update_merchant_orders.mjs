import fs from 'fs';

let content = fs.readFileSync('src/pages/merchant/MerchantOrders.tsx', 'utf8');

// Insert states
if (!content.includes('const [deleteModalOpen')) {
  content = content.replace(/const \[cancellingDealId, setCancellingDealId\] = useState<string \| null>\(null\);/, match => match + '\n  const [deleteModalOpen, setDeleteModalOpen] = useState(false);\n  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);\n  const [deleteReason, setDeleteReason] = useState(\'\');');
}

// Replace handleDeleteRequest
const oldDeleteFn = /const handleDeleteRequest = async \(reqId: string\) => \{[\s\S]*?toast\.error\('حدث خطأ أثناء محاولة حذف الطلب\. يرجى التأكد من الصلاحيات\.'\);\s*\}\s*\};/;
const newDeleteFn = `const handleDeleteRequest = (reqId: string) => {
    setDeletingRequestId(reqId);
    setDeleteReason('');
    setDeleteModalOpen(true);
  };

  const confirmDeleteRequest = async () => {
    if (!deletingRequestId || !deleteReason.trim()) return;
    try {
      const { error } = await supabase.from('custom_requests').update({
        status: 'cancelled',
        cancellation_reason: deleteReason.trim()
      }).eq('id', deletingRequestId);
      if (error) throw error;
      
      const req = requests.find(r => r.id === deletingRequestId);
      if (req) {
        sendNotification('all_admins', 'إلغاء مناقصة', \`قام التاجر بإلغاء المناقصة: \${req.title} لسبب: \${deleteReason.trim()}\`, 'error');
        if (req.supplier_bids && req.supplier_bids.length > 0) {
          req.supplier_bids.forEach((bid: any) => {
            sendNotification(bid.supplier_id, 'إلغاء مناقصة', \`قام التاجر بإلغاء المناقصة: \${req.title}. السبب: \${deleteReason.trim()}\`, 'error');
          });
        }
      }

      setRequests(requests.map(r => r.id === deletingRequestId ? { ...r, status: 'cancelled', cancellation_reason: deleteReason.trim() } : r));
      setDeleteModalOpen(false);
      setDeletingRequestId(null);
      toast.success('تم حذف الطلب بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء محاولة الحذف.');
    }
  };`;
content = content.replace(oldDeleteFn, newDeleteFn);

// Insert Modal
const modalCode = `
      {/* Delete Reason Modal */}
      {deleteModalOpen && deletingRequestId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => { setDeleteModalOpen(false); setDeletingRequestId(null); setDeleteReason(''); }} className="absolute top-4 left-4 text-gray-400 hover:text-gray-700">
              <XCircle size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">سبب حذف المناقصة</h2>
            
            <p className="text-gray-600 text-sm mb-4">
              يرجى كتابة سبب حذف هذه المناقصة. سيتم إرسال هذا السبب للإدارة وللموردين الذين قدموا عروضاً.
            </p>

            <div className="space-y-4">
              <div>
                <textarea
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 min-h-[100px]"
                  placeholder="اكتب سبب الحذف هنا..."
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button onClick={confirmDeleteRequest} disabled={!deleteReason.trim()} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50">
                  تأكيد الحذف
                </button>
                <button onClick={() => { setDeleteModalOpen(false); setDeletingRequestId(null); setDeleteReason(''); }} className="px-6 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
`;
if (!content.includes('{/* Delete Reason Modal */}')) {
  content = content.replace(/<\/DashboardLayout>/, modalCode);
}

fs.writeFileSync('src/pages/merchant/MerchantOrders.tsx', content);
console.log('MerchantOrders.tsx updated');
