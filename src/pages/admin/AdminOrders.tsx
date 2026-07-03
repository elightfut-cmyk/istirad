import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Search, Package, CheckCircle2, Clock, ChevronDown, ChevronUp, User, CreditCard, MessageSquare } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function AdminOrders() {
  const { formatCurrency } = useSettingsStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [manualPayments, setManualPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'custom' | 'direct' | 'manual'>('custom');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

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
          id, title, quantity, status, created_at, request_type,
          merchant:users!merchant_id(name, company_name),
          supplier_bids(
            id, price, status, created_at, is_fully_paid, advance_percentage,
            supplier:users!supplier_id(name, company_name)
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
          id, amount, payment_method, transaction_id, status, created_at,
          merchant:users!merchant_id(name, company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setManualPayments(data || []);
    } catch (error) {
      console.error('Error fetching manual payments:', error);
    }
  };

  const handleApprovePayment = async (payment: any) => {
    if (!window.confirm(`هل أنت متأكد من الموافقة على الدفعة بقيمة ${payment.amount} وإضافتها لرصيد التاجر؟`)) return;

    try {
      // 1. Update manual_payment status
      const { error: updateError } = await supabase
        .from('manual_payments')
        .update({ status: 'approved' })
        .eq('id', payment.id);
      if (updateError) throw updateError;

      // 2. Add to wallet_transactions
      const { error: txError } = await supabase.from('wallet_transactions').insert({
        merchant_id: payment.merchant.id || payment.merchant_id, // we might need merchant_id from original if nested
        amount: payment.amount,
        type: 'deposit',
        status: 'completed',
        description: `شحن يدوي موافق عليه: ${payment.payment_method}`
      });
      if (txError) throw txError;

      // 3. Update user wallet balance (We have to fetch it first or use an RPC)
      // For simplicity, fetch the user, add, update.
      const { data: userData } = await supabase.from('users').select('id, wallet_balance').eq('id', payment.merchant_id || payment.merchant?.id).single();
      if (userData) {
        const newBalance = (userData.wallet_balance || 0) + payment.amount;
        await supabase.from('users').update({ wallet_balance: newBalance }).eq('id', userData.id);
      }

      alert('تمت الموافقة على الدفعة بنجاح وإضافة الرصيد للتاجر.');
      fetchManualPayments();
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء معالجة الموافقة.');
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
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء رفض الدفعة.');
    }
  };

  const filteredRequests = requests.filter(req => {
    const titleMatch = (req.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const merchantMatch = (req.merchant?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (req.merchant?.company_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSearch = titleMatch || merchantMatch;
    // Map db 'request_type' (default is 'custom' if null, otherwise 'direct' or 'custom')
    const reqType = req.request_type || 'custom';
    const matchesTab = reqType === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const toggleExpand = (id: string) => {
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  return (
    <DashboardLayout
      title="مراقبة الطلبات والمناقصات"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'الإشعارات (تلغرام)', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
      ]}
    >
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => { setActiveTab('custom'); setExpandedRequestId(null); }}
            className={`px-6 py-4 text-sm font-bold border-b-4 transition-colors ${
              activeTab === 'custom' ? 'border-[#065f46] text-[#065f46]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            المناقصات (طلبات عامة)
          </button>
          <button
            onClick={() => { setActiveTab('direct'); setExpandedRequestId(null); }}
            className={`px-6 py-4 text-sm font-bold border-b-4 transition-colors ${
              activeTab === 'direct' ? 'border-[#065f46] text-[#065f46]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            الطلبات المباشرة
          </button>
          <button
            onClick={() => { setActiveTab('manual'); setExpandedRequestId(null); }}
            className={`px-6 py-4 text-sm font-bold border-b-4 transition-colors ${
              activeTab === 'manual' ? 'border-[#065f46] text-[#065f46]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            طلبات الشحن اليدوي
          </button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="ابحث باسم الطلب أو التاجر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#065f46] text-sm"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'custom' ? (
            <table className="w-full text-right border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="p-4 font-bold text-gray-700 w-12"></th>
                  <th className="p-4 font-bold text-gray-700">عنوان المناقصة</th>
                  <th className="p-4 font-bold text-gray-700">التاجر</th>
                  <th className="p-4 font-bold text-gray-700">الكمية المطلوبة</th>
                  <th className="p-4 font-bold text-gray-700">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">لم يتم العثور على أي مناقصات.</td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <React.Fragment key={req.id}>
                      <tr 
                        onClick={() => toggleExpand(req.id)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedRequestId === req.id ? 'bg-green-50/30' : ''}`}
                      >
                        <td className="p-4 text-center">
                          {expandedRequestId === req.id ? (
                            <ChevronUp size={20} className="text-gray-400 mx-auto" />
                          ) : (
                            <ChevronDown size={20} className="text-gray-400 mx-auto" />
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <Package size={20} className="text-gray-500" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{req.title}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(req.created_at).toLocaleDateString('ar-SA')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-gray-700">{req.merchant?.name || 'غير معروف'}</p>
                          <p className="text-xs text-gray-500">{req.merchant?.company_name || '-'}</p>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-gray-700">{req.quantity} وحدة</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-2 items-start">
                            {req.status === 'open' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                                <Clock size={14} />
                                قيد الانتظار
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700">
                                <CheckCircle2 size={14} />
                                مغلق
                              </span>
                            )}
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {req.supplier_bids?.length || 0} عروض
                            </span>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Bids Section */}
                      {expandedRequestId === req.id && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={5} className="p-0">
                            <div className="p-6 border-t border-gray-100">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                تفاصيل العروض المقدمة
                              </h4>
                              
                              {(!req.supplier_bids || req.supplier_bids.length === 0) ? (
                                <p className="text-sm text-gray-500 italic">لا توجد عروض مقدمة حتى الآن.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {req.supplier_bids.map((bid: any) => (
                                    <div 
                                      key={bid.id} 
                                      className={`p-4 rounded-xl border ${
                                        bid.status === 'accepted' 
                                          ? 'border-green-200 bg-green-50' 
                                          : 'border-gray-200 bg-white'
                                      }`}
                                    >
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                          <div className="bg-gray-100 p-1.5 rounded-lg">
                                            <User size={16} className="text-gray-600" />
                                          </div>
                                          <div>
                                            <p className="font-bold text-sm text-gray-800">{bid.supplier?.name}</p>
                                            <p className="text-xs text-gray-500">{bid.supplier?.company_name}</p>
                                          </div>
                                        </div>
                                        {bid.status === 'accepted' && (
                                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center gap-1">
                                            <CheckCircle2 size={12} />
                                            مقبول
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-4 pt-3 border-t border-gray-100/50 flex justify-between items-end">
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">السعر المعروض:</p>
                                          <p className={`font-bold ${bid.status === 'accepted' ? 'text-green-700' : 'text-gray-800'}`}>
                                            {formatCurrency(bid.price)}
                                          </p>
                                        </div>
                                        {bid.status === 'accepted' && (
                                          <div className="flex flex-col gap-1 items-end">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">
                                              العربون: مدفوع
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${bid.is_fully_paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                              المتبقي: {bid.is_fully_paid ? 'مدفوع' : 'بانتظار الدفع'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'direct' ? (
            <table className="w-full text-right border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="p-4 font-bold text-gray-700">عنوان الطلب</th>
                  <th className="p-4 font-bold text-gray-700">التاجر / المورد</th>
                  <th className="p-4 font-bold text-gray-700">الإجمالي</th>
                  <th className="p-4 font-bold text-gray-700">حالة العربون</th>
                  <th className="p-4 font-bold text-gray-700">حالة المبلغ المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">لم يتم العثور على طلبات مباشرة.</td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const directBid = req.supplier_bids && req.supplier_bids.length > 0 ? req.supplier_bids[0] : null;
                    const advancePaid = directBid?.status === 'accepted';
                    const remainingPaid = directBid?.is_fully_paid === true;

                    return (
                      <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <Package size={20} className="text-gray-500" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{req.title}</p>
                              <p className="text-xs text-gray-500 mt-1">الكمية: {req.quantity}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-gray-800">التاجر: {req.merchant?.name || '-'}</span>
                            <span className="text-sm text-gray-600">المورد: {directBid?.supplier?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-gray-700">{directBid ? formatCurrency(directBid.price) : '-'}</span>
                        </td>
                        <td className="p-4">
                          {advancePaid ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700">
                              <CheckCircle2 size={14} />
                              مدفوع
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700">
                              <Clock size={14} />
                              بانتظار الدفع
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {remainingPaid ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700">
                              <CheckCircle2 size={14} />
                              مدفوع
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                              <CreditCard size={14} />
                              غير مدفوع
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-right border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="p-4 font-bold text-gray-700">التاجر</th>
                  <th className="p-4 font-bold text-gray-700">المبلغ / العملة</th>
                  <th className="p-4 font-bold text-gray-700">رقم المعاملة (TxID)</th>
                  <th className="p-4 font-bold text-gray-700">الحالة</th>
                  <th className="p-4 font-bold text-gray-700 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                  </tr>
                ) : manualPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">لا توجد طلبات شحن يدوية.</td>
                  </tr>
                ) : (
                  manualPayments.map((pmt) => (
                    <tr key={pmt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-gray-800">{pmt.merchant?.name}</p>
                        <p className="text-xs text-gray-500">{pmt.merchant?.company_name}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-gray-900">{pmt.amount}</span>
                        <p className="text-xs text-gray-500">{pmt.payment_method}</p>
                      </td>
                      <td className="p-4 font-mono text-sm text-gray-600">
                        {pmt.transaction_id}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          pmt.status === 'approved' ? 'bg-green-50 text-green-700' :
                          pmt.status === 'rejected' ? 'bg-red-50 text-red-700' :
                          'bg-orange-50 text-orange-700'
                        }`}>
                          {pmt.status === 'approved' ? 'مقبول' : pmt.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {pmt.status === 'pending' ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleApprovePayment(pmt)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 transition"
                            >
                              موافقة
                            </button>
                            <button
                              onClick={() => handleRejectPayment(pmt.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200 transition"
                            >
                              رفض
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
