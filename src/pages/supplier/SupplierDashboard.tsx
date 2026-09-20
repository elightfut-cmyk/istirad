import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Gavel, DollarSign, Calculator } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { calculateFinalPrice, calculateSupplierPriceFromFinal } from '../../utils/profitCalculator';

export default function SupplierDashboard() {
  const { user } = useAuthStore();
  const settings = useSettingsStore();
  const { formatCurrency } = settings;
  const [stats, setStats] = useState({ sales: 0, pending: 0, products: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculator states
  const [calcMode, setCalcMode] = useState<'rawToFinal' | 'finalToRaw'>('rawToFinal');
  const [calcAmount, setCalcAmount] = useState<number | ''>('');
  const [calcQty, setCalcQty] = useState<number>(1);

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
          { title: 'إجمالي المبيعات', value: formatCurrency(stats.sales), color: 'text-[#4f46e5]' },
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
      
      {/* Calculator Widget */}
      <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mb-8">
        <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Calculator className="text-[#4f46e5]" size={20} />
          آلة حاسبة تفاعلية للفوائد والأسعار
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-bold text-indigo-900 mb-2">نوع العملية</label>
            <select 
              className="w-full p-3 rounded-xl border border-indigo-200 text-indigo-900 focus:ring-[#4f46e5]"
              value={calcMode}
              onChange={(e) => setCalcMode(e.target.value as any)}
            >
              <option value="rawToFinal">حساب السعر للتاجر (انطلاقاً من سعر المورد الخام)</option>
              <option value="finalToRaw">حساب السعر للمورد (انطلاقاً من السعر النهائي للتاجر)</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-bold text-indigo-900 mb-2">
              {calcMode === 'rawToFinal' ? 'سعر القطعة الخام (دج)' : 'السعر النهائي للقطعة (دج)'}
            </label>
            <input 
              type="number" min="0" step="0.01"
              className="w-full p-3 rounded-xl border border-indigo-200 focus:ring-[#4f46e5]"
              value={calcAmount}
              onChange={(e) => setCalcAmount(parseFloat(e.target.value) || '')}
              placeholder="أدخل السعر هنا..."
            />
          </div>
          
          <div className="w-full md:w-32">
            <label className="block text-sm font-bold text-indigo-900 mb-2">الكمية</label>
            <input 
              type="number" min="1"
              className="w-full p-3 rounded-xl border border-indigo-200 focus:ring-[#4f46e5]"
              value={calcQty}
              onChange={(e) => setCalcQty(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
        
        {calcAmount !== '' && Number(calcAmount) > 0 && (
          <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm">
            {calcMode === 'rawToFinal' ? (() => {
              const finalPricing = calculateFinalPrice(Number(calcAmount), calcQty, settings);
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">السعر الإجمالي الخام:</p>
                    <p className="font-bold">{formatCurrency(finalPricing.supplierTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">نسبة المنصة المطبقة:</p>
                    <p className="font-bold text-orange-600">{(finalPricing.markupPercentage * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">رسوم الطلب الثابتة:</p>
                    <p className="font-bold">{formatCurrency(settings.orderFixedFee)}</p>
                  </div>
                  <div className="md:col-span-3 pt-3 border-t border-gray-100 flex justify-between items-center bg-indigo-50/30 p-3 rounded-lg">
                    <span className="font-bold text-indigo-900">السعر النهائي للتاجر (للقطعة):</span>
                    <span className="text-xl font-black text-[#4f46e5]">{formatCurrency(finalPricing.finalItemPrice)}</span>
                  </div>
                </div>
              );
            })() : (() => {
              const rawUnitPrice = calculateSupplierPriceFromFinal(Number(calcAmount), calcQty, settings);
              const finalPricing = calculateFinalPrice(rawUnitPrice, calcQty, settings);
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">السعر النهائي الإجمالي:</p>
                    <p className="font-bold">{formatCurrency(Number(calcAmount) * calcQty)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">ربح المنصة الإجمالي (تقريبي):</p>
                    <p className="font-bold text-orange-600">{formatCurrency(finalPricing.platformProfit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">رسوم الطلب الثابتة المخصومة:</p>
                    <p className="font-bold">{formatCurrency(settings.orderFixedFee)}</p>
                  </div>
                  <div className="md:col-span-3 pt-3 border-t border-gray-100 flex justify-between items-center bg-green-50/50 p-3 rounded-lg border-green-100">
                    <span className="font-bold text-green-900">السعر الصافي (الخام) للمورد (للقطعة):</span>
                    <span className="text-xl font-black text-green-700">{formatCurrency(rawUnitPrice)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        <div className="mt-6 text-sm text-indigo-800 leading-relaxed space-y-2 border-t border-indigo-200 pt-4">
          <p className="font-bold text-indigo-900 mb-2">كيف يتم حساب الأسعار والفوائد؟</p>
          <p><strong>1. السعر الخام:</strong> هو السعر الصافي الذي تطلبه أنت كمورد (سعر القطعة الخام × الكمية).</p>
          <p><strong>2. السعر بالفائدة (للتاجر):</strong> السعر الخام + <strong>نسبة ربح المنصة</strong> + <strong>رسوم ثابتة ({formatCurrency(settings.orderFixedFee)})</strong>.</p>
          <div className="mt-3 p-3 bg-white border border-indigo-100 rounded-lg text-indigo-800 font-medium">
            <span className="font-bold text-indigo-900">عملية التفاوض:</span><br />
            عند تفاوض التاجر، يقوم النظام تلقائياً بالحساب العكسي ويعرض لك "السعر الخام" الصافي مباشرة. يمكنك استخدام الأداة أعلاه متى ما أردت محاكاة أسعار مختلفة بحرية لمعرفة الفوارق بين السعر الخام والسعر النهائي.
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">أحدث الطلبات الواردة (الصفقات الناجحة)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
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
                    <td className="py-4 text-sm text-[#4f46e5] font-bold">{formatCurrency(advancePaid)}</td>
                    <td className="py-4 text-sm">
                      <span className={`font-bold ${order.is_fully_paid || order.shipping_status === 'delivered' ? 'text-green-600' : 'text-red-600'}`}>
                        {order.is_fully_paid || order.shipping_status === 'delivered' ? 'تم الدفع' : formatCurrency(remainingAmount)}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
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
