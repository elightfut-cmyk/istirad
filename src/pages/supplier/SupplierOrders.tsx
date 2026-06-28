import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ShoppingBag, Package, CheckCircle2, Clock, DollarSign, Truck, Box } from 'lucide-react';
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
        .eq('status', 'accepted')
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
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1">
                <CheckCircle2 size={14} /> مؤكد (تم دفع العربون)
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
                <span className="font-bold text-gray-900">{new Date(order.created_at).toLocaleString('ar-MA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
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

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('direct')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'direct' ? 'border-[#065f46] text-[#065f46]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          الطلبات المباشرة الواردة
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'custom' ? 'border-[#065f46] text-[#065f46]' : 'border-transparent text-gray-500 hover:text-gray-700'
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
    </DashboardLayout>
  );
}
