import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Search, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  MessageSquare, 
  Ticket, 
  Video, 
  Trash2, 
  Gavel, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  AlertTriangle,
  Check,
  X,
  Store
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';
import toast from 'react-hot-toast';
import { sendNotification } from '../../store/useNotificationStore';
import SupplierBadge from '../../components/SupplierBadge';

export default function AdminOrders() {
  const { formatCurrency, shippingPricePerKilo, bidWindowExchangeRate } = useSettingsStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [manualPayments, setManualPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'custom' | 'direct' | 'manual'>('custom');
  const [filterTenderStatus, setFilterTenderStatus] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    fetchRequests();
    fetchManualPayments();

    const handleRefresh = () => {
      fetchRequests();
      fetchManualPayments();
    };
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_requests')
        .select(`
          id, title, description, quantity, status, created_at, request_type, notes, image_url, product_link, approx_weight_grams, avg_price_china, cancellation_reason,
          merchant:users!merchant_id(name, company_name, phone, email, address),
          supplier_bids(
            id, price, status, created_at, is_fully_paid, advance_percentage, allow_negotiation, negotiated_price, negotiated_by, customer_reply,
            supplier:users!supplier_id(id, name, company_name, phone, verification_badge, supplier_tier, average_rating, total_reviews)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching admin orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManualPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('manual_payments')
        .select(`
          id, amount, payment_method, transaction_id, status, created_at, merchant_id, receipt_url,
          merchant:users!merchant_id(name, company_name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setManualPayments(data || []);
    } catch (error) {
      console.error('Error fetching manual payments:', error);
    }
  };

  const handleApprovePayment = async (payment: any) => {
    if (!window.confirm(`هل أنت متأكد من الموافقة على الدفعة بقيمة ${formatCurrency(payment.amount)} وإضافتها لرصيد التاجر؟`)) return;

    try {
      const { data, error } = await supabase.rpc('admin_approve_manual_payment', { p_payment_id: payment.id });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.message);

      sendNotification(payment.merchant_id, 'الموافقة على شحن الرصيد', `تمت الموافقة على طلب الشحن اليدوي بقيمة ${formatCurrency(payment.amount)} وإضافتها لمحفظتك بنجاح.`, 'success');
      toast.success('تمت الموافقة على الدفعة بنجاح وإضافة الرصيد للتاجر.');
      fetchManualPayments();
    } catch (error: any) {
      console.error(error);
      toast.error('حدث خطأ أثناء معالجة الموافقة: ' + (error.message || ''));
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!window.confirm('هل أنت متأكد من رفض هذه الدفعة؟')) return;
    try {
      const { error } = await supabase
        .from('manual_payments')
        .update({ status: 'rejected' })
        .eq('id', paymentId);

      if (error) throw error;
      fetchManualPayments();

      const payment = manualPayments.find(p => p.id === paymentId);
      if (payment) {
        sendNotification(payment.merchant_id, 'رفض طلب شحن الرصيد', `تم رفض طلب الشحن اليدوي بقيمة ${formatCurrency(payment.amount)}.`, 'error');
      }
      toast.error('تم رفض الدفعة.');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء رفض الدفعة');
    }
  };

  const handleDeleteManualPayment = async (paymentId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف سجل الشحن اليدوي هذا؟')) return;
    try {
      const { error } = await supabase.from('manual_payments').delete().eq('id', paymentId);
      if (error) throw error;
      setManualPayments(prev => prev.filter(p => p.id !== paymentId));
      toast.success('تم حذف السجل بنجاح.');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحذف: ' + (err.message || ''));
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً مع جميع عروضه؟')) return;
    try {
      const { error } = await supabase.from('custom_requests').delete().eq('id', requestId);
      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('تم حذف الطلب بنجاح.');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحذف: ' + (err.message || ''));
    }
  };

  const handleDeleteBid = async (bidId: string, requestId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف عرض المورد هذا نهائياً؟')) return;
    try {
      const { error } = await supabase.from('supplier_bids').delete().eq('id', bidId);
      if (error) throw error;
      setRequests(prev => prev.map(r => 
        r.id === requestId 
          ? { ...r, supplier_bids: (r.supplier_bids || []).filter((b: any) => b.id !== bidId) } 
          : r
      ));
      toast.success('تم حذف عرض المورد بنجاح.');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء حذف العرض: ' + (err.message || ''));
    }
  };


  // Filter tender requests
  const tenderRequests = requests.filter(req => {
    const isTender = req.request_type !== 'direct';
    const titleMatch = (req.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const merchantMatch = (req.merchant?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (req.merchant?.company_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = titleMatch || merchantMatch;

    if (!isTender || !matchesSearch) return false;
    if (filterTenderStatus === 'all') return true;
    if (filterTenderStatus === 'open') return req.status !== 'closed' && req.status !== 'cancelled';
    if (filterTenderStatus === 'closed') return req.status === 'closed' || req.status === 'cancelled';
    return true;
  });

  // Filter direct requests
  const directRequests = requests.filter(req => {
    const isDirect = req.request_type === 'direct';
    const titleMatch = (req.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const merchantMatch = (req.merchant?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (req.merchant?.company_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return isDirect && (titleMatch || merchantMatch);
  });

  // Filter manual payments
  const filteredManualPayments = manualPayments.filter(p => {
    const term = searchQuery.toLowerCase();
    const merchantName = (p.merchant?.name || '').toLowerCase();
    const companyName = (p.merchant?.company_name || '').toLowerCase();
    const txId = (p.transaction_id || '').toLowerCase();
    return merchantName.includes(term) || companyName.includes(term) || txId.includes(term);
  });

  return (
    <DashboardLayout
      title="مراقبة الطلبات والمناقصات"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات والمناقصات', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'التنبيهات والإشعارات', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
        { label: 'فيديو الرئيسية', href: '/admin/main-video', icon: <Video size={20} /> },
      ]}
    >
      <div className="space-y-6">

        {/* ── Main Header & 3 Primary Tabs ── */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-5">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">إدارة ومراقبة كافة الطلبات</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                سوق طلبات المناقصة بتصميم متكامل، الطلبات المباشرة، وحركات الشحن اليدوي مع إمكانية الحذف الفوري لأي طلب أو عرض.
              </p>
            </div>

            {/* Top 3 Navigation Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('custom')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
                  activeTab === 'custom' 
                    ? 'bg-white dark:bg-gray-800 text-[#4f46e5] shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Gavel size={16} />
                <span>سوق طلبات المناقصة</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-black">
                  {tenderRequests.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('direct')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
                  activeTab === 'direct' 
                    ? 'bg-white dark:bg-gray-800 text-[#4f46e5] shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Store size={16} />
                <span>الطلبات المباشرة</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 font-black">
                  {directRequests.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('manual')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
                  activeTab === 'manual' 
                    ? 'bg-white dark:bg-gray-800 text-[#4f46e5] shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <CreditCard size={16} />
                <span>الشحن اليدوي</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-black">
                  {manualPayments.length}
                </span>
              </button>
            </div>
          </div>

          {/* Search bar & sub-filters */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-5">
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder={
                  activeTab === 'custom' 
                    ? 'ابحث في المناقصات أو باسم التاجر...' 
                    : activeTab === 'direct'
                    ? 'ابحث في الطلبات المباشرة...'
                    : 'ابحث برقم المعاملة أو اسم التاجر...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-sm bg-gray-50 dark:bg-gray-900"
              />
              <Search className="absolute left-3 top-3 text-gray-400" size={17} />
            </div>

            {activeTab === 'custom' && (
              <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setFilterTenderStatus('all')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                    filterTenderStatus === 'all' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'
                  }`}
                >
                  الكل ({requests.filter(r => r.request_type !== 'direct').length})
                </button>
                <button
                  onClick={() => setFilterTenderStatus('open')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                    filterTenderStatus === 'open' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'
                  }`}
                >
                  مفتوحة لتلقي العروض
                </button>
                <button
                  onClick={() => setFilterTenderStatus('closed')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                    filterTenderStatus === 'closed' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'
                  }`}
                >
                  مغلقة / تمت الصفقة
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Tab 1: سوق طلبات المناقصة (Card Layout identical to Supplier Marketplace) ── */}
        {activeTab === 'custom' && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-500">
                جاري تحميل سوق المناقصات...
              </div>
            ) : tenderRequests.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                <Gavel size={48} className="mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">لا توجد مناقصات مطابقة</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">لم يتم العثور على طلبات مناقصة تطابق خيارات البحث.</p>
              </div>
            ) : (
              tenderRequests.map((req) => {
                const isClosed = req.status === 'closed';
                const isCancelled = req.status === 'cancelled';
                const bidsCount = req.supplier_bids?.length || 0;

                return (
                  <div key={req.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col transition hover:border-indigo-200 dark:hover:border-indigo-900">
                    
                    {/* Tender Header & Main Details */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h3 className="font-black text-xl text-gray-900 dark:text-white">{req.title}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 font-mono">
                              #{req.id.slice(0, 8)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                            <span>
                              بواسطة التاجر: <strong className="text-gray-800 dark:text-gray-200">{req.merchant?.name || 'غير معروف'}</strong>
                              {req.merchant?.company_name && ` (${req.merchant.company_name})`}
                            </span>
                            {req.merchant?.phone && (
                              <span className="text-xs text-gray-400 font-mono">| {req.merchant.phone}</span>
                            )}
                            {req.merchant?.email && (
                              <span className="text-xs text-gray-400">| {req.merchant.email}</span>
                            )}
                          </div>
                        </div>

                        {/* Status badge & Admin Delete button */}
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isCancelled 
                              ? 'bg-red-100 text-red-700' 
                              : isClosed 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isCancelled ? 'ملغاة' : isClosed ? 'مغلق (تمت الصفقة)' : 'مفتوح لتلقي العروض'}
                          </span>

                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition flex items-center gap-1 text-xs font-bold border border-red-100"
                            title="حذف هذه المناقصة بالكامل"
                          >
                            <Trash2 size={16} />
                            <span className="hidden sm:inline">حذف المناقصة</span>
                          </button>
                        </div>
                      </div>

                      {/* Cancellation Banner if cancelled */}
                      {isCancelled && (
                        <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl mb-4 text-sm flex items-center gap-2">
                          <AlertTriangle size={17} className="text-red-600 shrink-0" />
                          <span>تم إلغاء هذه المناقصة: {req.cancellation_reason || 'بدون سبب معلن'}</span>
                        </div>
                      )}

                      {/* Description & Notes */}
                      {req.description && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-3">
                          {req.description}
                        </p>
                      )}
                      {req.notes && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs italic mb-4 bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                          ملاحظات التاجر: {req.notes}
                        </p>
                      )}

                      {/* Specs Tags */}
                      <div className="flex flex-wrap items-center gap-3 text-xs mt-3">
                        <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                          الكمية المطلوبة: {req.quantity} وحدة
                        </span>

                        {req.approx_weight_grams > 0 && (
                          <span className="font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                            الوزن التقريبي: {req.approx_weight_grams}غ
                          </span>
                        )}

                        {req.avg_price_china > 0 && (
                          <span className="font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                            سعر الصين: ${req.avg_price_china}
                          </span>
                        )}

                        {(req.approx_weight_grams > 0 || req.avg_price_china > 0) && (
                          <span className="font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                            السعر التقريبي: {(((req.avg_price_china || 0) + ((req.approx_weight_grams || 0) / 1000) * shippingPricePerKilo) * bidWindowExchangeRate).toFixed(2)} دج
                          </span>
                        )}

                        {req.product_link && (
                          <a 
                            href={req.product_link} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition font-bold"
                          >
                            <LinkIcon size={14} /> رابط المنتج
                          </a>
                        )}

                        {req.image_url && (
                          <a 
                            href={req.image_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-1 text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg transition font-bold"
                          >
                            <ImageIcon size={14} /> عرض الصورة
                          </a>
                        )}

                        <span className="text-gray-400 mr-auto text-xs flex items-center gap-1">
                          <Clock size={13} />
                          {new Date(req.created_at).toLocaleDateString('ar-DZ')}
                        </span>
                      </div>
                    </div>

                    {/* ── Bids Section for this Tender ── */}
                    <div className="p-6 bg-gray-50/60 dark:bg-gray-900/40">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-black text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <Gavel size={16} className="text-[#4f46e5]" />
                          <span>عروض الموردين المقدمة لهذه المناقصة ({bidsCount})</span>
                        </h4>
                      </div>

                      {bidsCount === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                          لا توجد عروض أسعار مقدمة من الموردين على هذه المناقصة حتى الآن.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {req.supplier_bids.map((bid: any) => {
                            const isAccepted = bid.status === 'accepted';
                            const isFullyPaid = bid.is_fully_paid === true;

                            return (
                              <div
                                key={bid.id}
                                className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                                  isAccepted
                                    ? 'border-green-300 bg-green-50/70 dark:bg-green-950/20'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                }`}
                              >
                                <div>
                                  {/* Supplier Info & Tier */}
                                  <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex flex-col gap-1">
                                      <SupplierBadge
                                        supplierId={bid.supplier_id}
                                        name={bid.supplier?.name}
                                        companyName={bid.supplier?.company_name}
                                        tier={bid.supplier?.supplier_tier || (
                                          bid.supplier?.verification_badge === 'platinum' ? 'PLATINUM' :
                                          bid.supplier?.verification_badge === 'gold' ? 'GOLD' :
                                          (bid.supplier?.verification_badge === 'silver' || bid.supplier?.verification_badge === 'blue') ? 'SILVER' :
                                          'NEW'
                                        )}
                                        rating={bid.supplier?.average_rating}
                                        totalReviews={bid.supplier?.total_reviews}
                                        size="xs"
                                      />
                                      {bid.supplier?.phone && (
                                        <span className="text-[11px] text-gray-400 font-mono">
                                          {bid.supplier.phone}
                                        </span>
                                      )}
                                    </div>

                                    {isAccepted && (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-0.5 shrink-0">
                                        <CheckCircle2 size={11} /> مقبول
                                      </span>
                                    )}
                                  </div>

                                  {/* Price and Payment Details */}
                                  <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 text-xs space-y-1.5 mb-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-500">السعر المعروض:</span>
                                      <span className="font-black text-[#4f46e5] text-sm">
                                        {formatCurrency(bid.price)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-500">نسبة العربون:</span>
                                      <span className="font-bold text-gray-700 dark:text-gray-300">
                                        {bid.advance_percentage}%
                                      </span>
                                    </div>
                                    {isAccepted && (
                                      <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-500">حالة الدفع:</span>
                                        <span className={`font-bold ${isFullyPaid ? 'text-green-600' : 'text-amber-600'}`}>
                                          {isFullyPaid ? 'مدفوع بالكامل' : 'العربون مدفوع (بانتظار المتبقي)'}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Negotiation Details if any */}
                                  {bid.negotiated_by && (
                                    <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 text-[11px] mb-3">
                                      <p className="font-bold text-orange-800 dark:text-orange-300">تفاوض:</p>
                                      <p className="text-gray-700 dark:text-gray-300">
                                        السعر المقترح: <strong>{formatCurrency(bid.negotiated_price)}</strong>
                                      </p>
                                      {bid.customer_reply && (
                                        <p className="text-gray-500 italic mt-0.5">"{bid.customer_reply}"</p>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Admin Action: Delete this bid */}
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                  <button
                                    onClick={() => handleDeleteBid(bid.id, req.id)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition border border-transparent hover:border-red-200"
                                    title="حذف هذا العرض المقدم من المورد"
                                  >
                                    <Trash2 size={13} />
                                    <span>حذف العرض</span>
                                  </button>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Tab 2: الطلبات المباشرة (Direct Orders) ── */}
        {activeTab === 'direct' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-xs">
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الطلب المباشر</th>
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200">التاجر والمورد</th>
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200">السعر الإجمالي</th>
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200">حالة العربون</th>
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200">المبلغ المتبقي</th>
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200 text-center">إجراء الحذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                    </tr>
                  ) : directRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-500">لم يتم العثور على طلبات مباشرة.</td>
                    </tr>
                  ) : (
                    directRequests.map((req) => {
                      const directBid = req.supplier_bids?.[0];
                      const advancePaid = directBid?.status === 'accepted';
                      const remainingPaid = directBid?.is_fully_paid === true;

                      return (
                        <tr key={req.id} className="hover:bg-gray-50 dark:bg-gray-900/50 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                                <Store size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100">{req.title}</p>
                                <p className="text-xs text-gray-400">الكمية: {req.quantity} وحدة</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs">
                            <p className="font-bold text-gray-800 dark:text-gray-200">التاجر: {req.merchant?.name || '-'}</p>
                            <div className="mt-1">
                              {directBid?.supplier ? (
                                <SupplierBadge
                                  supplierId={directBid.supplier_id}
                                  name={directBid.supplier?.name}
                                  companyName={directBid.supplier?.company_name}
                                  tier={directBid.supplier?.supplier_tier || 'NEW'}
                                  rating={directBid.supplier?.average_rating}
                                  totalReviews={directBid.supplier?.total_reviews}
                                  size="xs"
                                />
                              ) : (
                                <p className="text-gray-400">مورد غير محدد</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-black text-[#4f46e5]">
                            {directBid ? formatCurrency(directBid.price) : '-'}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              advancePaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {advancePaid ? 'مدفوع' : 'قيد الانتظار'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              remainingPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {remainingPaid ? 'مدفوع' : 'غير مدفوع'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteRequest(req.id)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition border border-red-100"
                              title="حذف هذا الطلب المباشر"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 3: الشحن اليدوي (Manual Shipping / Payments) ── */}
        {activeTab === 'manual' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-xs">
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200">التاجر</th>
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200">المبلغ</th>
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200">طريقة الدفع / المعاملة</th>
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200">وصل التحويل</th>
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الحالة</th>
                    <th className="p-4 font-bold text-gray-700 dark:text-gray-200 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                    </tr>
                  ) : filteredManualPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-500">لا توجد طلبات شحن يدوي مسجلة.</td>
                    </tr>
                  ) : (
                    filteredManualPayments.map((payment) => {
                      const isPending = payment.status === 'pending';
                      const isApproved = payment.status === 'approved';
                      const isRejected = payment.status === 'rejected';

                      return (
                        <tr key={payment.id} className="hover:bg-gray-50 dark:bg-gray-900/50 transition">
                          <td className="p-4">
                            <div>
                              <p className="font-bold text-gray-900 dark:text-gray-100">{payment.merchant?.name || '-'}</p>
                              <p className="text-xs text-gray-500">{payment.merchant?.company_name || payment.merchant?.phone || '-'}</p>
                            </div>
                          </td>
                          <td className="p-4 font-black text-emerald-600 text-base">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="p-4 text-xs">
                            <span className="font-bold block text-gray-800 dark:text-gray-200">{payment.payment_method || 'شحن يدوي'}</span>
                            <span className="text-gray-400 font-mono">رقم: {payment.transaction_id || '-'}</span>
                          </td>
                          <td className="p-4">
                            {payment.receipt_url ? (
                              <a
                                href={payment.receipt_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition"
                              >
                                <ImageIcon size={13} />
                                <span>معاينة الوصل</span>
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">لا يوجد وصل</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              isApproved 
                                ? 'bg-green-100 text-green-700' 
                                : isRejected 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isApproved ? 'معتمد' : isRejected ? 'مرفوض' : 'قيد المراجعة'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleApprovePayment(payment)}
                                    className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition border border-green-200"
                                    title="الموافقة وإيداع الرصيد"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleRejectPayment(payment.id)}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition border border-red-200"
                                    title="رفض الدفعة"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteManualPayment(payment.id)}
                                className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition border border-gray-200"
                                title="حذف السجل نهائياً"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
