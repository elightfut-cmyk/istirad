import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Gavel, CheckCircle2, Link as LinkIcon, Image as ImageIcon, DollarSign } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { sendNotification } from '../../store/useNotificationStore';
import toast from 'react-hot-toast';

export default function SupplierRequests() {
  const { user } = useAuthStore();
  const { formatCurrency } = useSettingsStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [biddingRequest, setBiddingRequest] = useState<any>(null);
  const [bidForm, setBidForm] = useState({ id: null as string | null, price: 0, cost_price: 0, advance_percentage: 20, notes: '', allow_negotiation: false });
  const exchangeRate = useSettingsStore(state => state.exchangeRate) || 135;
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
          supplier_bids (id, supplier_id, price, cost_price, advance_percentage, notes, status, created_at, allow_negotiation, negotiated_price, negotiated_by)
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
      toast.error('الرجاء التأكد من أن السعر الإجمالي أكبر من سعر التكلفة لتحقيق ربح.');
      setSubmitting(false);
      return;
    }

    try {
      if (bidForm.id) {
        const { error } = await supabase.from('supplier_bids').update({
          price: bidForm.price * biddingRequest.quantity,
          cost_price: bidForm.cost_price * biddingRequest.quantity,
          price_usd: (bidForm.price / exchangeRate) * biddingRequest.quantity,
          cost_price_usd: (bidForm.cost_price / exchangeRate) * biddingRequest.quantity,
          advance_percentage: bidForm.advance_percentage,
          notes: bidForm.notes,
          allow_negotiation: bidForm.allow_negotiation,
        }).eq('id', bidForm.id);

        if (error) throw error;
        sendNotification(biddingRequest.merchant_id, 'تعديل عرض سعر', `قام ${user.name} بتعديل عرضه على مناقصتك: ${biddingRequest.title}`, 'info');
      } else {
        const { error } = await supabase.from('supplier_bids').insert({
          request_id: biddingRequest.id,
          supplier_id: user.id,
          price: bidForm.price * biddingRequest.quantity,
          cost_price: bidForm.cost_price * biddingRequest.quantity,
          price_usd: (bidForm.price / exchangeRate) * biddingRequest.quantity,
          cost_price_usd: (bidForm.cost_price / exchangeRate) * biddingRequest.quantity,
          advance_percentage: bidForm.advance_percentage,
          notes: bidForm.notes,
          allow_negotiation: bidForm.allow_negotiation,
        });

        if (error) throw error;
        sendNotification(biddingRequest.merchant_id, 'عرض سعر جديد', `تلقيت عرضاً جديداً من ${user.name} على مناقصتك: ${biddingRequest.title}`, 'info');
      }
      
      await fetchRequests();
      setBiddingRequest(null);
      setBidForm({ id: null, price: 0, cost_price: 0, advance_percentage: 20, notes: '', allow_negotiation: false });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تقديم العرض');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptNegotiation = async (bid: any, req: any) => {
    try {
      const { error } = await supabase.from('supplier_bids').update({
        price: bid.negotiated_price,
        price_usd: bid.negotiated_price / exchangeRate,
        status: 'accepted',
        negotiated_by: 'supplier'
      }).eq('id', bid.id);
      if (error) throw error;
      
      await supabase.from('custom_requests').update({ status: 'closed' }).eq('id', req.id);
      
      sendNotification(req.merchant_id, 'تمت الموافقة على السعر', `وافق ${user?.name} على السعر المقترح في المناقصة: ${req.title}`, 'success');
      toast.success('تم قبول السعر بنجاح واعتماد العرض!');
      fetchRequests();
    } catch (error) {
      toast.error('حدث خطأ أثناء قبول السعر');
    }
  };

  const handleCounterOffer = async (bid: any, newPrice: number, req: any) => {
    try {
      const { error } = await supabase.from('supplier_bids').update({
        negotiated_price: newPrice,
        negotiated_by: 'supplier'
      }).eq('id', bid.id);
      if (error) throw error;
      
      sendNotification(req.merchant_id, 'رد على عرض السعر', `قدم ${user?.name} سعراً جديداً في المفاوضة على المناقصة: ${req.title}`, 'info');
      toast.success('تم إرسال مقترح السعر الجديد');
      fetchRequests();
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال المقترح');
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
        <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-max">
          <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 text-sm font-bold rounded-md transition ${filterStatus === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>الكل</button>
          <button onClick={() => setFilterStatus('open')} className={`px-4 py-2 text-sm font-bold rounded-md transition ${filterStatus === 'open' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>مفتوحة</button>
          <button onClick={() => setFilterStatus('closed')} className={`px-4 py-2 text-sm font-bold rounded-md transition ${filterStatus === 'closed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>مغلقة</button>
        </div>
      </div>

      <div className="relative">
        {user?.status === 'pending' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md mx-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gavel size={32} className="text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">حسابك قيد المراجعة</h3>
              <p className="text-gray-500">
                لا يمكنك الاطلاع على طلبات ومناقصات التجار أو تقديم عروض حتى يتم مراجعة حسابك وقبوله من قِبل الإدارة.
              </p>
            </div>
          </div>
        )}
        <div className={`space-y-6 ${user?.status === 'pending' ? 'pointer-events-none select-none opacity-50 blur-sm' : ''}`}>
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
                        <div className="flex justify-between items-center mb-1 text-sm">
                          <span className="text-gray-600">سعر القطعة الواحدة:</span>
                          <span className="font-bold">{formatCurrency(myBid.price / (req.quantity || 1))}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">السعر الإجمالي:</span>
                          <span className="font-bold text-[#4f46e5]">{formatCurrency(myBid.price)}</span>
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
                        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-xl font-bold text-sm mb-4">
                          قيد المراجعة من قبل التاجر
                        </div>
                      )}

                      {!isClosed && myBid.status !== 'accepted' && (
                        <button 
                          onClick={() => {
                            setBiddingRequest(req);
                            setBidForm({ 
                              id: myBid.id, 
                              price: myBid.price / req.quantity, 
                              cost_price: myBid.cost_price ? myBid.cost_price / req.quantity : 0, 
                              advance_percentage: myBid.advance_percentage, 
                              notes: myBid.notes,
                              allow_negotiation: myBid.allow_negotiation || false
                            });
                          }}
                          className="w-full bg-white text-blue-600 border border-blue-200 py-2 rounded-xl font-bold hover:bg-blue-50 transition shadow-sm"
                        >
                          تعديل العرض
                        </button>
                      )}

                      {myBid.allow_negotiation && myBid.negotiated_price && myBid.status !== 'accepted' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-3 text-sm">
                          <p className="font-bold text-blue-800 mb-2">المفاوضات</p>
                          {myBid.negotiated_by === 'merchant' ? (
                            <div>
                              <p className="text-gray-700 mb-2">التاجر يقترح سعراً للقطعة: <span className="font-bold">{formatCurrency(myBid.negotiated_price / (req.quantity || 1))}</span> <span className="text-xs text-gray-500">(الإجمالي: {formatCurrency(myBid.negotiated_price)})</span></p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleAcceptNegotiation(myBid, req)}
                                  className="flex-1 bg-green-600 text-white py-1.5 rounded-lg font-bold hover:bg-green-700 transition"
                                >
                                  قبول السعر
                                </button>
                                <button 
                                  onClick={() => {
                                    const newPiecePrice = prompt('أدخل سعر القطعة الواحدة الجديد الذي تقترحه (بالدينار):', (myBid.negotiated_price / (req.quantity || 1)).toString());
                                    if (newPiecePrice && !isNaN(parseFloat(newPiecePrice))) {
                                      handleCounterOffer(myBid, parseFloat(newPiecePrice) * (req.quantity || 1), req);
                                    }
                                  }}
                                  className="flex-1 bg-white text-blue-600 border border-blue-200 py-1.5 rounded-lg font-bold hover:bg-blue-50 transition text-xs"
                                >
                                  سعر آخر
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-600 text-xs font-bold">لقد قمت باقتراح السعر {formatCurrency(myBid.negotiated_price / (req.quantity || 1))} للقطعة. في انتظار رد التاجر...</p>
                          )}
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
                        className="w-full bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition shadow-sm"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 pb-12 max-h-[85vh] md:max-h-[90vh] overflow-y-auto relative">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{bidForm.id ? 'تعديل عرض السعر' : 'تقديم عرض سعر'}</h2>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 text-sm text-blue-800">
                <strong>ملاحظة هامة:</strong> يرجى إدخال السعر بالدينار (DZD). سيتم تحويله تلقائياً للدولار عند الحاجة.
              </div>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">{biddingRequest.title}</p>
            
            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعر القطعة الواحدة بالدينار (DZD)</label>
                <input 
                  type="number" step="0.01" required min="0.01"
                  value={bidForm.price || ''} 
                  onChange={e => setBidForm({...bidForm, price: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                  placeholder="أدخل سعر القطعة الواحدة"
                />
                <p className="text-xs text-gray-500 mt-1">يساوي بالدولار: ${((bidForm.price || 0) / exchangeRate).toFixed(2)} | الإجمالي: {formatCurrency((bidForm.price || 0) * biddingRequest.quantity)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعر التكلفة الحقيقي للقطعة الواحدة بالدينار (DZD)</label>
                <p className="text-xs text-gray-500 mb-2">سعر التكلفة مخفي عن التاجر، ويُستخدم فقط لحساب رسوم المنصة من ربحك الصافي.</p>
                <input 
                  type="number" required min="0" step="0.01"
                  value={bidForm.cost_price || ''} 
                  onChange={e => setBidForm({...bidForm, cost_price: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="أدخل سعر التكلفة للقطعة الواحدة"
                />
                <p className="text-xs text-gray-500 mt-1">يساوي بالدولار: ${((bidForm.cost_price || 0) / exchangeRate).toFixed(2)} | الإجمالي: {formatCurrency((bidForm.cost_price || 0) * biddingRequest.quantity)}</p>
              </div>

              {bidForm.price > 0 && bidForm.price > bidForm.cost_price && (
                <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex justify-between items-center text-sm">
                  <span className="text-green-700 font-bold">ربحك الصافي المتوقع الإجمالي:</span>
                  <span className="font-bold text-green-800">{formatCurrency((bidForm.price - bidForm.cost_price) * biddingRequest.quantity)}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نسبة الدفعة المقدمة (عربون) %</label>
                <input 
                  type="number" required min="0" max="100"
                  value={bidForm.advance_percentage} 
                  onChange={e => setBidForm({...bidForm, advance_percentage: parseInt(e.target.value)})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                />
                <p className="text-xs text-gray-400 mt-1">يُدفع هذا العربون فور قبول عرضك عبر بوابة Chargily.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات إضافية للتاجر</label>
                <textarea 
                  rows={3} 
                  value={bidForm.notes} 
                  onChange={e => setBidForm({...bidForm, notes: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                  placeholder="مثال: متوفر بجميع الألوان، مدة الشحن 5 أيام..."
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input 
                  type="checkbox" 
                  id="allow_negotiation" 
                  checked={bidForm.allow_negotiation}
                  onChange={e => setBidForm({...bidForm, allow_negotiation: e.target.checked})}
                  className="w-5 h-5 text-[#4f46e5] rounded border-gray-300 focus:ring-[#4f46e5]"
                />
                <label htmlFor="allow_negotiation" className="text-sm font-bold text-gray-800">
                  أقبل التفاوض على السعر مع التاجر
                </label>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="submit" disabled={submitting} className="flex-1 bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition disabled:opacity-50">
                  {submitting ? 'جاري الإرسال...' : 'تأكيد العرض'}
                </button>
                <button type="button" onClick={() => setBiddingRequest(null)} className="px-6 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
