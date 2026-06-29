import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Gavel, CheckCircle2, Link as LinkIcon, Image as ImageIcon, DollarSign } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { sendNotification } from '../../store/useNotificationStore';

export default function SupplierRequests() {
  const { user } = useAuthStore();
  const { formatCurrency, currency, exchangeRate } = useSettingsStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [biddingRequest, setBiddingRequest] = useState<any>(null);
  const [bidForm, setBidForm] = useState({ price: 0, cost_price: 0, advance_percentage: 20, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    fetchRequests();
    
    const handleRefresh = () => fetchRequests();
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('custom_requests')
        .select(`
          id, title, description, quantity, status, created_at, request_type, notes, image_url, product_link, merchant_id,
          merchant:users!merchant_id(name, company_name),
          supplier_bids (id, supplier_id, price, advance_percentage, notes, status, created_at)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      const filteredData = (data || []).filter(req => req.request_type !== 'direct');
      setRequests(filteredData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !biddingRequest) return;
    setSubmitting(true);
    
    if (bidForm.price <= bidForm.cost_price) {
      alert('الرجاء التأكد من أن السعر الإجمالي أكبر من سعر التكلفة لتحقيق ربح.');
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('supplier_bids').insert({
        request_id: biddingRequest.id,
        supplier_id: user.id,
        price: bidForm.price,
        cost_price: bidForm.cost_price,
        advance_percentage: bidForm.advance_percentage,
        notes: bidForm.notes,
      });

      if (error) throw error;
      sendNotification(biddingRequest.merchant_id, 'عرض سعر جديد', `تلقيت عرضاً جديداً من ${user.name} على مناقصتك: ${biddingRequest.title}`, 'info');
      
      // Optimistic UI update
      setRequests(requests.map(req => {
        if (req.id === biddingRequest.id) {
          return {
            ...req,
            supplier_bids: [
              ...(req.supplier_bids || []),
              {
                id: Math.random().toString(), // temporary ID
                supplier_id: user.id,
                price: bidForm.price,
                advance_percentage: bidForm.advance_percentage,
                notes: bidForm.notes,
                status: 'pending',
                created_at: new Date().toISOString()
              }
            ]
          };
        }
        return req;
      }));
      
      setBiddingRequest(null);
      setBidForm({ price: 0, cost_price: 0, advance_percentage: 20, notes: '' });
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء تقديم العرض');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="مناقصات التجار"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/supplier', icon: <LayoutDashboard size={20} /> },
        { label: 'منتجاتي', href: '/supplier/products', icon: <Package size={20} /> },
        { label: 'سوق الطلبات', href: '/supplier/requests', icon: <Gavel size={20} /> },
        { label: 'الطلبات الواردة', href: '/supplier/orders', icon: <ShoppingBag size={20} /> },
        { label: 'التقارير المالية', href: '/supplier/financials', icon: <DollarSign size={20} /> },
      ]}
    >
      <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">سوق الطلبات والمناقصات</h2>
          <p className="text-gray-500 text-sm mt-1">تصفح طلبات التجار الخاصة وقدم أفضل عروضك للفوز بالصفقة.</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 w-max">
          <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 text-sm font-bold rounded-md transition ${filterStatus === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>الكل</button>
          <button onClick={() => setFilterStatus('open')} className={`px-4 py-2 text-sm font-bold rounded-md transition ${filterStatus === 'open' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>مفتوحة</button>
          <button onClick={() => setFilterStatus('closed')} className={`px-4 py-2 text-sm font-bold rounded-md transition ${filterStatus === 'closed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>مغلقة</button>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
            <Gavel size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد طلبات مفتوحة حالياً</h3>
          </div>
        ) : (
          requests.filter(req => {
            if (filterStatus === 'all') return true;
            if (filterStatus === 'open') return req.status !== 'closed';
            if (filterStatus === 'closed') return req.status === 'closed';
            return true;
          }).map(req => {
            const myBid = req.supplier_bids?.find((b: any) => b.supplier_id === user?.id);
            const isClosed = req.status === 'closed';

            return (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
                <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-l border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md mb-2 inline-block">
                        التاجر: {req.merchant?.company_name}
                      </span>
                      <h3 className="font-bold text-xl text-gray-900">{req.title}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isClosed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isClosed ? 'مغلق (تمت الصفقة)' : 'مفتوح لتلقي العروض'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{req.description}</p>
                  
                  {req.notes && (
                    <p className="text-gray-500 text-sm italic mb-4">ملاحظات التاجر: {req.notes}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm mt-4">
                    <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">الكمية المطلوبة: {req.quantity} وحدة</span>
                    
                    {req.product_link && (
                      <a href={req.product_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition">
                        <LinkIcon size={16} /> فتح الرابط
                      </a>
                    )}
                    {req.image_url && (
                      <a href={req.image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg transition">
                        <ImageIcon size={16} /> عرض الصورة
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-6 md:w-1/3 bg-gray-50 flex flex-col justify-center items-center text-center">
                  {myBid ? (
                    <div className="w-full">
                      <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">عرضك المقدم</h4>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">سعر الإجمالي:</span>
                        <span className="font-bold">{formatCurrency(myBid.price)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-4">
                        <span className="text-gray-500">الدفعة المقدمة:</span>
                        <span className="font-bold bg-orange-100 text-orange-800 px-2 rounded">{myBid.advance_percentage}%</span>
                      </div>
                      
                      {myBid.status === 'accepted' ? (
                        <div className="bg-green-100 text-green-800 p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm">
                          <CheckCircle2 size={18} />
                          تهانينا! تم قبول عرضك وتم دفع العربون
                        </div>
                      ) : isClosed ? (
                        <div className="bg-gray-200 text-gray-600 p-3 rounded-xl font-bold text-sm">
                          تم إغلاق الطلب وقبول عرض مورد آخر
                        </div>
                      ) : (
                        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-xl font-bold text-sm">
                          قيد المراجعة من قبل التاجر
                        </div>
                      )}
                    </div>
                  ) : isClosed ? (
                    <div className="text-gray-500 font-medium">الطلب مغلق. لم تقدم عرضاً عليه.</div>
                  ) : (
                    <div className="w-full">
                      <p className="text-sm text-gray-500 mb-4">قدم عرض سعر تنافسي الآن للفوز بهذه الصفقة قبل إغلاقها.</p>
                      <button 
                        onClick={() => setBiddingRequest(req)}
                        className="w-full bg-[#065f46] text-white py-3 rounded-xl font-bold hover:bg-[#044c38] transition shadow-sm"
                      >
                        تقديم عرض سعر
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bid Modal */}
      {biddingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
              <h2 className="text-xl font-bold text-gray-900 mb-2">تقديم عرض سعر</h2>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 text-sm text-blue-800">
                <strong>ملاحظة هامة:</strong> يرجى إدخال السعر بالدينار الجزائري (د.ج) دائماً. سيتم تحويله تلقائياً للتجار الذين يفضلون العرض بالدولار.
              </div>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">{biddingRequest.title}</p>
            
            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السعر الإجمالي المطلوب (د.ج)</label>
                <input 
                  type="number" required min="1" step="0.01"
                  value={bidForm.price || ''} 
                  onChange={e => setBidForm({...bidForm, price: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">سعر التكلفة الحقيقي (د.ج)</label>
                <p className="text-xs text-gray-500 mb-2">سعر التكلفة مخفي عن التاجر، ويُستخدم فقط لحساب رسوم المنصة من ربحك الصافي.</p>
                <input 
                  type="number" required min="0" step="0.01"
                  value={bidForm.cost_price || ''} 
                  onChange={e => setBidForm({...bidForm, cost_price: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                />
              </div>

              {bidForm.price > 0 && bidForm.price > bidForm.cost_price && (
                <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex justify-between items-center text-sm">
                  <span className="text-green-700 font-bold">ربحك الصافي:</span>
                  <span className="font-bold text-green-800">{formatCurrency(bidForm.price - bidForm.cost_price)}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نسبة الدفعة المقدمة (عربون) %</label>
                <input 
                  type="number" required min="0" max="100"
                  value={bidForm.advance_percentage} 
                  onChange={e => setBidForm({...bidForm, advance_percentage: parseInt(e.target.value)})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] bg-gray-50"
                />
                <p className="text-xs text-gray-400 mt-1">يُدفع هذا العربون فور قبول عرضك عبر بوابة Chargily.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات إضافية للتاجر</label>
                <textarea 
                  rows={3} 
                  value={bidForm.notes} 
                  onChange={e => setBidForm({...bidForm, notes: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] bg-gray-50"
                  placeholder="مثال: متوفر بجميع الألوان، مدة الشحن 5 أيام..."
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button type="submit" disabled={submitting} className="flex-1 bg-[#065f46] text-white py-3 rounded-xl font-bold hover:bg-[#044c38] transition disabled:opacity-50">
                  {submitting ? 'جاري الإرسال...' : 'تأكيد العرض'}
                </button>
                <button type="button" onClick={() => setBiddingRequest(null)} className="px-6 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
