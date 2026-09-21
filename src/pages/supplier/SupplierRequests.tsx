import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Gavel, CheckCircle2, Link as LinkIcon, Image as ImageIcon, DollarSign, Store, User, MapPin, Phone, Eye } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { sendNotification } from '../../store/useNotificationStore';
import toast from 'react-hot-toast';
import { calculateFinalPrice } from '../../utils/profitCalculator';

export default function SupplierRequests() {
  const { user } = useAuthStore();
  const { 
    formatCurrency,
    markupTier1Percentage,
    markupTier2Percentage,
    markupTier3Percentage,
    markupTier4Percentage,
    orderFixedFee
  } = useSettingsStore();
  
  const profitSettings = {
    markupTier1Percentage,
    markupTier2Percentage,
    markupTier3Percentage,
    markupTier4Percentage,
    orderFixedFee
  };

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [biddingRequest, setBiddingRequest] = useState<any>(null);
  const [bidForm, setBidForm] = useState({ id: null as string | null, price: 0, cost_price: 0, advance_percentage: 20, notes: '' });
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
          merchant:users!merchant_id(name, company_name, phone, address),
          supplier_bids (id, supplier_id, price, cost_price, advance_percentage, notes, status, created_at, allow_negotiation, negotiated_price, negotiated_by, customer_reply, supplier:users!supplier_id(name, company_name)),
          supplier_interests (supplier_id)
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
    
    const quantity = biddingRequest.quantity || 1;
    const calculation = calculateFinalPrice(bidForm.cost_price, quantity, profitSettings);
    
    const calculatedPriceTotal = calculation.finalTotal;
    const calculatedCostTotal = bidForm.cost_price * quantity;

    try {
      if (bidForm.id) {
        const { error } = await supabase.from('supplier_bids').update({
          price: calculatedPriceTotal,
          cost_price: calculatedCostTotal,
          price_usd: calculatedPriceTotal / exchangeRate,
          cost_price_usd: calculatedCostTotal / exchangeRate,
          advance_percentage: bidForm.advance_percentage,
          notes: bidForm.notes,
        }).eq('id', bidForm.id);

        if (error) throw error;
        sendNotification(biddingRequest.merchant_id, 'تعديل عرض سعر', `قام ${user.name} بتعديل عرضه على مناقصتك: ${biddingRequest.title}`, 'info');
      } else {
        const { error } = await supabase.from('supplier_bids').insert({
          request_id: biddingRequest.id,
          supplier_id: user.id,
          price: calculatedPriceTotal,
          cost_price: calculatedCostTotal,
          price_usd: calculatedPriceTotal / exchangeRate,
          cost_price_usd: calculatedCostTotal / exchangeRate,
          advance_percentage: bidForm.advance_percentage,
          notes: bidForm.notes,
          shipping_status: biddingRequest.request_type === 'direct' ? 'processing' : 'pending_in_china'
        });

        if (error) throw error;
        sendNotification(biddingRequest.merchant_id, 'عرض سعر جديد', `تلقيت عرضاً جديداً من ${user.name} على مناقصتك: ${biddingRequest.title}`, 'info');
      }
      
      await fetchRequests();
      setBiddingRequest(null);
      setBidForm({ id: null, price: 0, cost_price: 0, advance_percentage: 20, notes: '' });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تقديم العرض');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptProposedPrice = async (bid: any, reqQuantity: number, merchantId: string) => {
    try {
      const newPriceTotal = bid.negotiated_price * reqQuantity;
      const { error } = await supabase.from('supplier_bids').update({
        price: newPriceTotal,
        cost_price: newPriceTotal,
        price_usd: newPriceTotal / exchangeRate,
        cost_price_usd: newPriceTotal / exchangeRate,
        negotiated_price: null,
        negotiated_by: 'supplier_accepted'
      }).eq('id', bid.id);
      
      if (error) throw error;
      sendNotification(merchantId, 'تم قبول السعر المقترح', `وافق المورد ${user?.company_name || ''} على السعر المقترح، يرجى دفع العربون.`, 'success');
      toast.success('تم قبول السعر وتحديث العرض بنجاح');
      fetchRequests();
    } catch (error) {
      toast.error('حدث خطأ أثناء قبول السعر');
    }
  };

  const handleRejectProposedPrice = async (bidId: string, merchantId: string) => {
    if (!window.confirm('هل أنت متأكد من رفض السعر المقترح؟ سيتم إبلاغ التاجر برفضك وسيكون أمامه خيار قبول عرضك الأول أو رفضه نهائياً.')) return;
    try {
      const { error } = await supabase.from('supplier_bids').update({
        negotiated_by: 'supplier_rejected'
      }).eq('id', bidId);
      
      if (error) throw error;
      sendNotification(merchantId, 'رفض المورد للسعر المقترح', `رفض المورد السعر المقترح وتم إعادة العرض لخياره الأول.`, 'info');
      toast.success('تم رفض السعر المقترح');
      fetchRequests();
    } catch (error) {
      toast.error('حدث خطأ أثناء رفض السعر المقترح');
    }
  };

  const handleIndicateInterest = async (requestId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('supplier_interests').insert({
        request_id: requestId,
        supplier_id: user.id
      });
      if (error) {
        if (error.code === '23505') { // Unique violation
          toast.success('لقد قمت بإعلام التاجر مسبقاً.');
        } else {
          throw error;
        }
      } else {
        toast.success('تم إعلام التاجر بأنك تبحث عن عرض مناسب لطلبه.');
      }
      fetchRequests();
    } catch (error) {
      toast.error('حدث خطأ أثناء المحاولة');
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
            const activeInterests = req.supplier_interests?.filter((i: any) => !req.supplier_bids?.some((b: any) => b.supplier_id === i.supplier_id)) || [];

            return (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-l border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-xl text-gray-900">{req.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">بواسطة التاجر: <span className="font-bold">{req.merchant?.name || 'غير معروف'} {req.merchant?.company_name ? `(${req.merchant.company_name})` : ''}</span></p>
                      </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isClosed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isClosed ? 'مغلق (تمت الصفقة)' : 'مفتوح لتلقي العروض'}
                    </span>
                  </div>

                  {(req.supplier_bids?.length > 0 || activeInterests.length > 0) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {req.supplier_bids?.length > 0 && (
                        <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100 flex items-center gap-1">
                          <Gavel size={14} /> {req.supplier_bids.length} مورد(ين) قدموا عروضاً
                        </span>
                      )}
                      {activeInterests.length > 0 && (
                        <span className="text-xs font-bold bg-orange-50 text-orange-700 px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">
                          <Eye size={14} /> {activeInterests.length} مورد(ين) يبحثون عن المنتج
                        </span>
                      )}
                    </div>
                  )}

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
                          <span className="text-gray-600">سعرك الخام للقطعة:</span>
                          <span className="font-bold">{formatCurrency((myBid.cost_price || myBid.price) / (req.quantity || 1))}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">إجمالي سعرك الخام:</span>
                          <span className="font-bold text-[#4f46e5]">{formatCurrency(myBid.cost_price || myBid.price)}</span>
                        </div>
                        {(myBid.cost_price && myBid.cost_price !== myBid.price) ? (
                          <div className="flex justify-between items-center text-xs mt-1 mb-2 bg-indigo-50 p-2 rounded border border-indigo-100">
                            <span className="text-gray-600">السعر النهائي المعروض للتاجر:</span>
                            <span className="font-bold text-[#4f46e5]">{formatCurrency(myBid.price)}</span>
                          </div>
                        ) : null}
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
                      ) : myBid.status === 'rejected' ? (
                        <div className="bg-red-100 text-red-800 p-3 rounded-xl font-bold text-sm mb-4">
                          مرفوض: تم رفض العرض أو الصفقة مع التاجر.
                        </div>
                      ) : myBid.negotiated_by === 'merchant' ? (
                        <div className="bg-orange-100 text-orange-800 p-4 rounded-xl font-bold text-sm mb-4 border border-orange-200">
                          <p className="mb-3 text-base">التاجر يقترح سعراً جديداً: <strong className="text-orange-900">{formatCurrency(myBid.negotiated_price || (myBid.cost_price / (req.quantity || 1)) || 0)}</strong> للقطعة الواحدة. <span className="text-sm font-normal block mt-1">(ونسبة العربون المطلوبة: <strong>{myBid.advance_percentage}%</strong>)</span></p>
                          {myBid.customer_reply && (
                            <div className="mb-4 bg-white p-3 rounded-lg border border-orange-200 text-gray-700 font-normal">
                              <strong>رسالة التاجر:</strong> {myBid.customer_reply}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleAcceptProposedPrice(myBid, req.quantity || 1, req.merchant_id)}
                              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
                            >
                              قبول السعر المقترح
                            </button>
                            <button 
                              onClick={() => handleRejectProposedPrice(myBid.id, req.merchant_id)}
                              className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg hover:bg-red-100 transition"
                            >
                              رفض العرض
                            </button>
                          </div>
                        </div>
                      ) : myBid.negotiated_by === 'supplier_accepted' ? (
                        <div className="bg-green-100 text-green-800 p-3 rounded-xl font-bold text-sm mb-4">
                          تم قبول السعر المقترح، في انتظار التاجر لدفع العربون.
                        </div>
                      ) : myBid.negotiated_by === 'supplier_rejected' ? (
                        <div className="bg-red-100 text-red-800 p-3 rounded-xl font-bold text-sm mb-4">
                          قمت برفض السعر المقترح، في انتظار التاجر لقبول عرضك الأول أو إلغاء الصفقة.
                        </div>
                      ) : (
                        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-xl font-bold text-sm mb-4">
                          قيد المراجعة من قبل التاجر
                        </div>
                      )}

                      {!isClosed && myBid.status === 'pending' && myBid.negotiated_by !== 'merchant' && myBid.negotiated_by !== 'supplier_accepted' && myBid.negotiated_by !== 'supplier_rejected' && (
                        <button 
                          onClick={() => {
                            setBiddingRequest(req);
                            setBidForm({ 
                              id: myBid.id, 
                              price: myBid.price / req.quantity, 
                              cost_price: myBid.cost_price ? myBid.cost_price / req.quantity : myBid.price / req.quantity, 
                              advance_percentage: myBid.advance_percentage, 
                              notes: myBid.notes
                            });
                          }}
                          className="w-full bg-white text-blue-600 border border-blue-200 py-2 rounded-xl font-bold hover:bg-blue-50 transition shadow-sm"
                        >
                          تعديل العرض
                        </button>
                      )}


                    </div>
                  ) : isClosed ? (
                    <div className="text-gray-500 font-medium">الطلب مغلق. لم تقدم عرضاً عليه.</div>
                  ) : (
                    <div className="w-full flex flex-col gap-2">
                      <p className="text-sm text-gray-500 mb-2">قدم عرض سعر تنافسي الآن للفوز بهذه الصفقة قبل إغلاقها.</p>
                      <button 
                        onClick={() => setBiddingRequest(req)}
                        className="w-full bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition shadow-sm"
                      >
                        تقديم عرض سعر
                      </button>
                      {!req.supplier_interests?.some((i: any) => i.supplier_id === user?.id) ? (
                        <button 
                          onClick={() => handleIndicateInterest(req.id)}
                          className="w-full bg-orange-50 text-orange-600 border border-orange-200 py-3 rounded-xl font-bold hover:bg-orange-100 transition shadow-sm"
                        >
                          جاري البحث عن المنتج والسعر (إعلام التاجر)
                        </button>
                      ) : (
                        <div className="w-full bg-gray-50 text-gray-600 border border-gray-200 py-2 rounded-xl text-center text-sm font-bold">
                          تم إعلام التاجر باهتمامك بالطلب
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show other suppliers' bids */}
                  {req.supplier_bids && req.supplier_bids.filter((b: any) => b.supplier_id !== user?.id).length > 0 && (
                    <div className="w-full mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-bold text-gray-700 mb-3 text-sm text-right">عروض الموردين الآخرين ({req.supplier_bids.filter((b: any) => b.supplier_id !== user?.id).length})</h4>
                      <div className="space-y-3">
                        {req.supplier_bids.filter((b: any) => b.supplier_id !== user?.id).map((otherBid: any) => (
                          <div key={otherBid.id} className="bg-white border border-gray-200 rounded-lg p-3 text-right">
                            <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
                              <span className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                <Store size={14} className="text-gray-400" />
                                {otherBid.supplier?.name || 'مورد'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">سعر القطعة (الخام):</span>
                              <span className="font-bold text-sm">{formatCurrency((otherBid.cost_price || otherBid.price) / (req.quantity || 1))}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">السعر الإجمالي الخام (بنسبة عربون {otherBid.advance_percentage}%):</span>
                              <span className="font-bold text-sm text-[#4f46e5]">{formatCurrency(otherBid.cost_price || otherBid.price)}</span>
                            </div>
                            {(otherBid.negotiated_by === 'merchant' || otherBid.negotiated_by === 'supplier_accepted' || otherBid.negotiated_by === 'supplier_rejected') && (
                              <div className="mt-3 pt-3 border-t border-gray-100 bg-orange-50/50 p-2 rounded-lg">
                                <p className="text-xs font-bold text-orange-800 mb-1">تفاوض التاجر مع هذا المورد:</p>
                                <p className="text-xs text-gray-700">اقترح التاجر: <strong>{formatCurrency(otherBid.negotiated_price || (otherBid.cost_price / (req.quantity || 1)) || 0)}</strong> (بنسبة عربون: <strong>{otherBid.advance_percentage}%</strong>)</p>
                                {otherBid.customer_reply && (
                                  <p className="text-xs text-gray-600 mt-1 italic">"{otherBid.customer_reply}"</p>
                                )}
                                {otherBid.negotiated_by === 'supplier_accepted' && <p className="text-[10px] text-green-600 font-bold mt-1">قبل المورد السعر</p>}
                                {otherBid.negotiated_by === 'supplier_rejected' && <p className="text-[10px] text-red-600 font-bold mt-1">رفض المورد السعر</p>}
                                {otherBid.negotiated_by === 'merchant' && <p className="text-[10px] text-orange-600 font-bold mt-1">في انتظار رد المورد</p>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                </div>
                
                {/* Footer for Merchant Details */}
                <div className="bg-blue-50/30 border-t border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 flex-wrap">
                  <div className="flex items-center gap-2 text-gray-800">
                    <Store size={18} className="text-[#4f46e5]" />
                    <span className="font-bold text-sm">{req.merchant?.company_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <User size={18} className="text-gray-400" />
                    <span className="text-sm font-medium">{req.merchant?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={18} className="text-gray-400" />
                    <span className="text-sm font-medium">{req.merchant?.address || 'غير متوفر'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={18} className="text-gray-400" />
                    <span className="text-sm font-medium" dir="ltr">{req.merchant?.phone || 'غير متوفر'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bid Modal */}
      {biddingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col relative overflow-hidden">
            <div className="p-6 overflow-y-auto w-full">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{bidForm.id ? 'تعديل عرض السعر' : 'تقديم عرض سعر'}</h2>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 text-sm text-blue-800">
                <strong>ملاحظة هامة:</strong> يرجى إدخال السعر بالدينار (DZD). سيتم تحويله تلقائياً للدولار عند الحاجة.
                <br/><br/>
                <strong>توضيح بخصوص الأرباح:</strong> أرباح المنصة هي 10% من سعر البيع. وعلى هذا الأساس، أي سعر تدخله هنا سيتم إضافة 10% عليه ليظهر للتاجر (حق المنصة).
              </div>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">{biddingRequest.title}</p>
            
            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعرك الخام للقطعة الواحدة بالدينار (DZD)</label>
                <input 
                  type="number" step="0.01" required min="0.01"
                  value={bidForm.cost_price || ''} 
                  onChange={e => setBidForm({...bidForm, cost_price: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                  placeholder="أدخل السعر الخام للقطعة الواحدة"
                />
                
                {bidForm.cost_price > 0 && (
                  <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
                    <p className="text-gray-600 mb-1 text-xs font-bold">السعر النهائي الذي سيظهر للتاجر (بعد إضافة العمولة والرسوم):</p>
                    <div className="flex justify-between items-center font-bold">
                      <span>للقطعة الواحدة:</span>
                      <span className="text-[#4f46e5]">{formatCurrency(calculateFinalPrice(bidForm.cost_price, biddingRequest?.quantity || 1, profitSettings).finalItemPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold mt-1">
                      <span>الإجمالي:</span>
                      <span className="text-[#4f46e5]">{formatCurrency(calculateFinalPrice(bidForm.cost_price, biddingRequest?.quantity || 1, profitSettings).finalTotal)}</span>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">يساوي بالدولار (خام): ${Number(((bidForm.cost_price || 0) / exchangeRate).toFixed(2))} | إجمالي السعر الخام: {formatCurrency((bidForm.cost_price || 0) * biddingRequest.quantity)}</p>
              </div>
              

              
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
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
