import { useState, useEffect } from 'react';
import { LayoutDashboard, Store, Package, CreditCard, Heart, Users } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useNavigate } from 'react-router-dom';

export default function MerchantDashboard() {
  const { user } = useAuthStore();
  const { formatCurrency } = useSettingsStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeOrders: 0, importedProducts: 0, totalExpenses: 0, remainingAmount: 0 });
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
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
      // 1. Fetch active orders & expenses using RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_merchant_stats', { p_merchant_id: user!.id });
      if (!rpcError && rpcData) {
        setStats({ 
          activeOrders: rpcData.activeOrders || 0, 
          importedProducts: rpcData.importedProducts || 0, 
          totalExpenses: rpcData.totalExpenses || 0, 
          remainingAmount: rpcData.remainingAmount || 0 
        });
      }

      // 2. Fetch suggested products (latest active products)
      const { data: products } = await supabase
        .from('products')
        .select('id, title, price, discount_price, images, supplier:users!supplier_id(company_name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);

      setSuggestedProducts(products || []);

    } catch (error) {
      console.error('Error fetching merchant dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="الرئيسية - تاجر"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/merchant', icon: <LayoutDashboard size={20} /> },
        { label: 'تصفح المنتجات', href: '/merchant/marketplace', icon: <Store size={20} /> },
        { label: 'طلباتي', href: '/merchant/orders', icon: <Package size={20} /> },
        { label: 'المحفظة', href: '/merchant/wallet', icon: <CreditCard size={20} /> },
        { label: 'نظام الإحالة', href: '/merchant/referrals', icon: <Users size={20} /> },
        { label: 'المفضلة', href: '/merchant/wishlist', icon: <Heart size={20} /> },
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'عروض قيد الانتظار', value: stats.activeOrders.toString(), color: 'text-blue-600' },
          { title: 'الطلبات المكتملة', value: stats.importedProducts.toString(), color: 'text-green-600' },
          { title: 'إجمالي المدفوعات', value: formatCurrency(stats.totalExpenses), color: 'text-purple-600' },
          { title: 'المبلغ المتبقي', value: formatCurrency(stats.remainingAmount), color: 'text-red-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
            <p className={`text-2xl font-bold mt-2 ${stat.color}`}>
              {loading ? '...' : stat.value}
            </p>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">أحدث المنتجات في السوق</h3>
        <button onClick={() => navigate('/merchant/marketplace')} className="text-[#4f46e5] text-sm font-bold hover:underline">
          عرض الكل
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-4 text-center py-8 text-gray-500">جاري التحميل...</div>
        ) : suggestedProducts.length === 0 ? (
          <div className="col-span-4 text-center py-8 text-gray-500">لا توجد منتجات حالياً في السوق.</div>
        ) : (
          suggestedProducts.map((product) => (
            <div 
              key={product.id} 
              onClick={() => navigate('/merchant/marketplace')}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="h-40 bg-gray-50 relative flex items-center justify-center p-2">
                {product.images && product.images.length > 0 ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">لا صورة</div>
                )}
                <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-lg text-xs font-bold text-[#4f46e5]">
                  جملة فقط
                </div>
              </div>
              <div className="p-4 flex flex-col justify-between" style={{ height: 'calc(100% - 10rem)' }}>
                <div>
                  <h4 className="font-bold text-gray-800 line-clamp-1">{product.title}</h4>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{product.supplier?.company_name}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-bold text-[#4f46e5]">{formatCurrency(product.price)}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">MOQ: {product.moq}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
