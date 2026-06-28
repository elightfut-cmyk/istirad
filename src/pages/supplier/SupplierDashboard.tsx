import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Gavel, DollarSign } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function SupplierDashboard() {
  const { user } = useAuthStore();
  const { formatCurrency } = useSettingsStore();
  const [stats, setStats] = useState({ sales: 0, pending: 0, products: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
    
    const handleRefresh = () => {
      if (user) fetchDashboardData();
    };
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats using RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_supplier_stats', { p_supplier_id: user!.id });
      
      if (!rpcError && rpcData) {
        setStats({
          sales: rpcData.sales || 0,
          pending: rpcData.pending || 0,
          products: rpcData.products || 0
        });
      }

      // Fetch Recent Orders (Accepted Bids)
      const { data: orders } = await supabase
        .from('supplier_bids')
        .select(`
          id,
          price,
          advance_percentage,
          status,
          shipping_status,
          is_fully_paid,
          created_at,
          custom_requests (title, request_type, users (name, company_name))
        `)
        .eq('supplier_id', user!.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(orders || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="الرئيسية - مورد"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/supplier', icon: <LayoutDashboard size={20} /> },
        { label: 'منتجاتي', href: '/supplier/products', icon: <Package size={20} /> },
        { label: 'سوق الطلبات', href: '/supplier/requests', icon: <Gavel size={20} /> },
        { label: 'الطلبات الواردة', href: '/supplier/orders', icon: <ShoppingBag size={20} /> },
        { label: 'التقارير المالية', href: '/supplier/financials', icon: <DollarSign size={20} /> },
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'إجمالي المبيعات', value: formatCurrency(stats.sales), color: 'text-[#065f46]' },
          { title: 'العروض المعلقة', value: stats.pending.toString(), color: 'text-orange-500' },
          { title: 'المنتجات النشطة', value: stats.products.toString(), color: 'text-blue-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>
              {loading ? '...' : stat.value}
            </p>
          </div>
        ))}
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">أحدث الطلبات الواردة (الصفقات الناجحة)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-sm">
                <th className="pb-3 font-medium">الطلب / السلعة</th>
                <th className="pb-3 font-medium">التاجر</th>
                <th className="pb-3 font-medium">إجمالي الصفقة</th>
                <th className="pb-3 font-medium">المدفوع (عربون)</th>
                <th className="pb-3 font-medium">المتبقي</th>
                <th className="pb-3 font-medium">التاريخ</th>
                <th className="pb-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">جاري التحميل...</td></tr>
              ) : recentOrders.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">لا توجد طلبات واردة بعد.</td></tr>
              ) : (
                recentOrders.map((order) => {
                  const advancePaid = (order.price * (order.advance_percentage || 0)) / 100;
                  const remainingAmount = order.price - advancePaid;
                  const merchantData = Array.isArray(order.custom_requests?.users) ? order.custom_requests.users[0] : order.custom_requests?.users;
                  const merchantName = merchantData?.name || merchantData?.company_name || 'تاجر غير معروف';
                  return (
                  <tr key={order.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-4 text-sm font-bold">
                      {order.custom_requests?.title || 'طلب غير معروف'}
                      {order.custom_requests?.request_type === 'direct' ? (
                        <span className="mr-2 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-normal">مباشر</span>
                      ) : (
                        <span className="mr-2 bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs font-normal">مناقصة</span>
                      )}
                    </td>
                    <td className="py-4 text-sm font-medium">{merchantName}</td>
                    <td className="py-4 text-sm text-gray-900 font-bold">{formatCurrency(order.price)}</td>
                    <td className="py-4 text-sm text-[#065f46] font-bold">{formatCurrency(advancePaid)}</td>
                    <td className="py-4 text-sm">
                      <span className={`font-bold ${order.is_fully_paid || order.shipping_status === 'delivered' ? 'text-green-600' : 'text-red-600'}`}>
                        {order.is_fully_paid || order.shipping_status === 'delivered' ? 'تم الدفع' : formatCurrency(remainingAmount)}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleString('ar-MA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                    <td className="py-4 text-sm">
                      <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-medium">
                        تم التأكيد والدفع
                      </span>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
