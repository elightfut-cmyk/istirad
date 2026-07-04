import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ShoppingBag, Package, CheckCircle2, DollarSign, Truck, Box, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { sendNotification } from '../../store/useNotificationStore';

export default function SupplierOrders() {
  const { user } = useAuthStore();
  const { formatCurrency } = useSettingsStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
    
    const handleRefresh = () => {
      if (user) fetchOrders();
    };
    
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_bids')
        .select(`
          id,
          price,
          advance_percentage,
          status,
          shipping_status,
          is_fully_paid,
          created_at,
          last_reminder_at,
          custom_requests (
            title, 
            description, 
            quantity, 
            image_url, 
            product_link, 
            request_type,
            merchant_id,
            merchant:users!merchant_id(company_name, name, email, phone)
          )
        `)
        .eq('supplier_id', user!.id)
        .in('status', ['pending', 'accepted'])
        .eq('supplier_hidden', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHideOrder = async (bidId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الطلب من السجل؟ (لن يظهر لك بعد الآن)')) return;
    try {
      const { error } = await supabase
        .from('supplier_bids')
        .update({ supplier_hidden: true })
        .eq('id', bidId);
      if (error) throw error;
      setOrders(orders.filter(o => o.id !== bidId));
    } catch (error) {
      console.error('Error hiding order:', error);
      alert('حدث خطأ أثناء إخفاء الطلب');
    }
  };

  const updateShippingStatus = async (bidId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('supplier_bids')
        .update({ shipping_status: status })
        .eq('id', bidId);
      if (error) throw error;
      setOrders(orders.map(o => o.id === bidId ? { ...o, shipping_status: status } : o));
      
      const order = orders.find(o => o.id === bidId);
      if (order && order.custom_requests?.merchant_id) {
        const statusText = status === 'shipped' ? 'قيد الشحن' : status === 'delivered' ? 'مُسلّمة' : 'قيد التجهيز';
        sendNotification(order.custom_requests.merchant_id, 'تحديث حالة الشحن', `قام المورد ${user?.company_name} بتحديث حالة شحن طلبك إلى: ${statusText}`, 'info');
      }
    } catch (error) {
      console.error('Error updating shipping status:', error);
      alert('حدث خطأ أثناء تحديث حالة الشحن');
    }
  };

  const handleRemindMerchant = async (bid: any) => {
    try {
      const { error } = await supabase.from('supplier_bids').update({ last_reminder_at: new Date().toISOString() }).eq('id', bid.id);
      if (error) throw error;
      setOrders(orders.map(o => o.id === bid.id ? { ...o, last_reminder_at: new Date().toISOString() } : o));
      
      const req = bid.custom_requests;
      if (req?.merchant_id) {
        const typeDesc = bid.status === 'pending' ? 'دفع العربون' : 'دفع المبلغ المتبقي';
        sendNotification(req.merchant_id, 'تنبيه بالدفع', `يرجى ${typeDesc} للطلب: ${req.title}`, 'warning');
      }
      alert('تم إرسال التنبيه بنجاح');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء إرسال التنبيه');
    }
  };

  const handleCancelOrder = async (bid: any) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذه المعاملة بسبب تأخر الدفع؟ سيتم اقتطاع رسوم المنصة من العربون (إن وُجد) وتحويل الباقي لمحفظتك.')) return;
    
    try {
      if (bid.status === 'accepted') {
        // They paid the deposit, but didn't pay remaining.
        // We take platform fee from deposit, give rest to supplier.
        const deposit = (bid.price * bid.advance_percentage) / 100;
        const { data: settings } = await supabase.from('platform_settings').select('platform_fee_percentage').single();
        const pFee = settings?.platform_fee_percentage || 0;
        const platformCut = deposit * (pFee / 100);
        const supplierCut = deposit - platformCut;

        if (supplierCut > 0) {
          const { data: userData } = await supabase.from('users').select('wallet_balance').eq('id', user!.id).single();
          const newBalance = (userData?.wallet_balance || 0) + supplierCut;
          await supabase.from('users').update({ wallet_balance: newBalance }).eq('id', user!.id);
          await supabase.from('wallet_transactions').insert({
            merchant_id: user!.id,
            amount: supplierCut,
            type: 'deposit',
            description: `تعويض إلغاء معاملة (بعد خصم عمولة المنصة)`
          });
        }
      }
      
      await supabase.from('supplier_bids').update({ status: 'cancelled' }).eq('id', bid.id);
      await supabase.from('custom_requests').update({ status: 'closed' }).eq('id', bid.custom_requests?.id || ''); // Wait, custom_requests might not have id here if not selected
      
      setOrders(orders.filter(o => o.id !== bid.id));
      alert('تم إلغاء المعاملة بنجاح');
      
      if (bid.custom_requests?.merchant_id) {
        sendNotification(bid.custom_requests.merchant_id, 'إلغاء الطلب', `تم إلغاء الطلب بسبب التأخر في الدفع.`, 'error');
      }
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء إلغاء المعاملة');
    }
  };

  const [activeTab, setActiveTab] = useState<'custom' | 'direct'>('direct');

  const customOrders = orders.filter(order => order.custom_requests?.request_type !== 'direct');
  const directOrders = orders.filter(order => order.custom_requests?.request_type === 'direct');

  const renderOrderList = (list: any[]) => {
    if (list.length === 0) {
      return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد طلبات واردة</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            بمجرد قيام التجار بشراء منتجاتك وتأكيد عروضك، ستظهر طلباتهم هنا للمراجعة والمعالجة.
          </p>
        </div>
      );
    }

    return list.map((order) => {
      const req = order.custom_requests;
      const merchant = req?.merchant;
      const advancePaid = (order.price * order.advance_percentage) / 100;
      const remaining = order.price - advancePaid;

      return (
        <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
          <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-l border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">{req?.title?.replace('طلب مباشر: ', '')}</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{req?.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {order.status === 'pending' ? <><Clock size={14} /> بانتظار العربون</> : <><CheckCircle2 size={14} /> مؤكد (تم دفع العربون)</>}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm mt-auto bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <span className="block text-gray-500 text-xs mb-1">الكمية المطلوبة</span>
                <span className="font-bold text-gray-900">{req?.quantity} وحدة</span>
              </div>
              <div className="w-px h-8 bg-gray-200 hidden md:block"></div>
              <div>
                <span className="block text-gray-500 text-xs mb-1">تاريخ الطلب</span>
                <span className="font-bold text-gray-900">{new Date(order.created_at).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
              </div>
              
              <div className="flex gap-2 ml-auto">
                {req?.product_link && (
                  <a href={req.product_link} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg font-bold border border-blue-100 transition">
                    رابط المنتج
                  </a>
                )}
                {req?.image_url && (
                  <a href={req.image_url} target="_blank" rel="noreferrer" className="text-xs bg-purple-50 text-purple-600 hover:text-purple-800 px-3 py-1.5 rounded-lg font-bold border border-purple-100 transition">
                    صورة توضيحية
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 md:w-1/3 bg-gray-50 flex flex-col justify-center">
            <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">تفاصيل العميل والدفع</h4>
            
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-900">{merchant?.company_name}</p>
              <p className="text-xs text-gray-500 mt-1">الاسم: {merchant?.name}</p>
              <p className="text-xs text-gray-500 mt-1">الهاتف: {merchant?.phone || 'غير متوفر'}</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-100 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">إجمالي الصفقة:</span>
                <span className="font-bold">{formatCurrency(order.price)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-green-600">عربون مدفوع ({order.advance_percentage}%):</span>
                <span className="font-bold text-green-600">{formatCurrency(advancePaid)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-50">
                <span className="text-gray-500">المبلغ المتبقي:</span>
                <span className={`font-bold ${order.is_fully_paid ? 'text-green-600' : 'text-orange-600'}`}>
                  {order.is_fully_paid ? 'تم دفع المبلغ كاملا' : formatCurrency(remaining)}
                </span>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4 flex flex-col gap-2">
              {(() => {
                const now = new Date();
                const lastReminder = order.last_reminder_at ? new Date(order.last_reminder_at) : null;
                const hoursSinceReminder = lastReminder ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60) : 24;
                const canRemind = hoursSinceReminder >= 24;
                
                const created = new Date(order.created_at);
                const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                const canCancel = daysSinceCreation >= 3;
                const needsPayment = order.status === 'pending' || (!order.is_fully_paid && order.shipping_status !== 'delivered');

                if (needsPayment) {
                  return (
                    <div className="flex flex-col gap-2 bg-red-50 p-3 rounded-lg border border-red-100">
                      <p className="text-xs text-red-800 font-bold mb-1">تنبيهات الدفع</p>
                      <button
                        onClick={() => handleRemindMerchant(order)}
                        disabled={!canRemind}
                        className="bg-orange-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-orange-600 transition disabled:opacity-50"
                      >
                        {canRemind ? 'إرسال تنبيه بالدفع' : 'تم الإرسال (يمكن التكرار كل 24س)'}
                      </button>
                      
                      {canCancel && (
                        <button
                          onClick={() => handleCancelOrder(order)}
                          className="bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition"
                        >
                          إلغاء المعاملة (لتجاوز 3 أيام)
                        </button>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {order.status === 'accepted' && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">حالة الشحن والتوصيل</label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => updateShippingStatus(order.id, 'processing')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${
                      (order.shipping_status || 'processing') === 'processing' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Box size={14} /> تجهيز
                  </button>
                  <button
                    onClick={() => updateShippingStatus(order.id, 'shipped')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${
                      order.shipping_status === 'shipped' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Truck size={14} /> مشحون
                  </button>
                  <button
                    onClick={() => updateShippingStatus(order.id, 'delivered')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${
                      order.shipping_status === 'delivered' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <CheckCircle2 size={14} /> موصل
                  </button>
                </div>
              </div>
            )}
            
            {order.shipping_status === 'delivered' && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <button
                  onClick={() => handleHideOrder(order.id)}
                  className="w-full bg-red-50 text-red-600 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition border border-red-200"
                >
                  حذف من السجل
                </button>
              </div>
            )}

          </div>
        </div>
      );
    });
  };

  return (
    <DashboardLayout
      title="الطلبات الواردة"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/supplier', icon: <Package size={20} /> },
        { label: 'منتجاتي', href: '/supplier/products', icon: <Package size={20} /> },
        { label: 'سوق الطلبات', href: '/supplier/requests', icon: <Package size={20} /> },
        { label: 'الطلبات الواردة', href: '/supplier/orders', icon: <ShoppingBag size={20} /> },
        { label: 'التقارير المالية', href: '/supplier/financials', icon: <DollarSign size={20} /> },
      ]}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">الطلبات الواردة</h2>
        <p className="text-gray-500 mt-1">تتبع وإدارة طلبات الشراء المؤكدة من التجار (الصفقات الناجحة)</p>
      </div>

      <div className="relative">
        {user?.status === 'pending' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md mx-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag size={32} className="text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">حسابك قيد المراجعة</h3>
              <p className="text-gray-500">
                لا يمكنك الاطلاع على الطلبات أو إدارتها حتى يتم مراجعة حسابك وقبوله من قِبل الإدارة.
              </p>
            </div>
          </div>
        )}
        <div className={`${user?.status === 'pending' ? 'pointer-events-none select-none opacity-50 blur-sm' : ''}`}>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('direct')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'direct' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          الطلبات المباشرة الواردة
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'custom' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          مناقصاتي الرابحة
        </button>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : activeTab === 'direct' ? (
          renderOrderList(directOrders)
        ) : (
          renderOrderList(customOrders)
        )}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
