import { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Search, Package, Clock, ChevronDown, ChevronUp, User, MessageSquare, Ticket } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';
import { calculateFinalPrice } from '../../utils/profitCalculator';
import toast from 'react-hot-toast';

export default function AdminRequests() {
  const settings = useSettingsStore();
  const { formatCurrency } = settings;
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();

    const handleRefresh = () => {
      fetchRequests();
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
          id, title, quantity, status, created_at, description,
          merchant:users!merchant_id(name, company_name),
          supplier_bids(
            id, price, cost_price, status, created_at, is_fully_paid, advance_percentage, allow_negotiation, negotiated_price, negotiated_by, customer_reply,
            supplier:users!supplier_id(name, company_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching admin requests:', error);
      toast.error('حدث خطأ أثناء تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const titleMatch = (req.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const merchantMatch = (req.merchant?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (req.merchant?.company_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || merchantMatch;
  });

  const toggleExpand = (id: string) => {
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  const getBidFinalPrices = (bid: any, reqQuantity: number) => {
    // Determine the raw price to use for calculation
    let baseRawPrice = bid.cost_price || bid.price;
    let isNegotiated = false;

    if (bid.negotiated_price && bid.negotiated_by === 'merchant') {
      baseRawPrice = bid.negotiated_price * reqQuantity;
      isNegotiated = true;
    }

    const finalPricing = calculateFinalPrice(baseRawPrice, reqQuantity, settings);

    return {
      rawPrice: baseRawPrice,
      finalTotal: finalPricing.finalTotal,
      isNegotiated
    };
  };

  return (
    <DashboardLayout
      title="سوق الطلبات"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'سوق الطلبات', href: '/admin/requests', icon: <Package size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'الإشعارات (تلغرام)', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
      ]}
    >
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        
        {/* Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ابحث عن طلب أو اسم التاجر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center p-8 text-gray-500">جاري التحميل...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center p-8 text-gray-500">لا توجد طلبات متاحة.</div>
          ) : (
            filteredRequests.map((req) => (
              <div key={req.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div 
                  className="p-5 flex flex-col md:flex-row items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(req.id)}
                >
                  <div className="flex-1 w-full md:w-auto">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{req.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        req.status === 'open' ? 'bg-green-50 text-green-700' :
                        req.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                        req.status === 'completed' ? 'bg-purple-50 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {req.status === 'open' ? 'مفتوح للعروض' :
                         req.status === 'in_progress' ? 'قيد التنفيذ' :
                         req.status === 'completed' ? 'مكتمل' : 'مغلق'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <User size={16} />
                        <span>{req.merchant?.name} ({req.merchant?.company_name})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Package size={16} />
                        <span>الكمية: {req.quantity}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={16} />
                        <span>{new Date(req.created_at).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-sm font-bold text-gray-500">
                      {req.supplier_bids?.length || 0} عروض
                    </div>
                    {expandedRequestId === req.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>

                {expandedRequestId === req.id && (
                  <div className="p-5 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm text-gray-700 mb-4 bg-white p-4 rounded-xl border border-gray-100">
                      <strong>الوصف:</strong> {req.description}
                    </p>

                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Package size={18} className="text-[#4f46e5]" />
                      عروض الموردين
                    </h4>
                    
                    {req.supplier_bids && req.supplier_bids.length > 0 ? (
                      <div className="space-y-3">
                        {req.supplier_bids.map((bid: any) => {
                          const { rawPrice, finalTotal, isNegotiated } = getBidFinalPrices(bid, req.quantity);
                          
                          return (
                            <div key={bid.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <User size={16} className="text-gray-400" />
                                  <span className="font-bold text-gray-800">{bid.supplier?.name}</span>
                                  <span className="text-xs text-gray-500">({bid.supplier?.company_name})</span>
                                  
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold mr-auto ${
                                    bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                    bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {bid.status === 'accepted' ? 'مقبول' : bid.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <div>
                                    <p className="text-xs text-gray-500 font-bold mb-1">السعر الخام (للمورد)</p>
                                    <p className="font-bold text-lg text-gray-900">{formatCurrency(rawPrice)}</p>
                                    {isNegotiated && (
                                      <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded ml-2 font-bold">
                                        سعر مقترح
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs text-[#4f46e5] font-bold mb-1">السعر بالفائدة (للتاجر)</p>
                                    <p className="font-bold text-lg text-[#4f46e5]">{formatCurrency(finalTotal)}</p>
                                  </div>
                                </div>

                                {bid.negotiated_by && bid.negotiated_by !== 'none' && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex gap-2 items-start text-sm">
                                      <MessageSquare size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                      <div>
                                        <p className="font-bold text-orange-800">حالة التفاوض:</p>
                                        <p className="text-gray-600">
                                          {bid.negotiated_by === 'merchant' && 'التاجر اقترح سعراً جديداً وفي انتظار رد المورد'}
                                          {bid.negotiated_by === 'supplier_accepted' && 'المورد قَبِل السعر المقترح من التاجر'}
                                          {bid.negotiated_by === 'supplier_rejected' && 'المورد رفض السعر المقترح من التاجر'}
                                        </p>
                                        {bid.customer_reply && (
                                          <p className="text-gray-500 mt-1 italic">"{bid.customer_reply}"</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center p-4 bg-white rounded-xl border border-gray-100">
                        لا توجد عروض لهذا الطلب بعد
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
