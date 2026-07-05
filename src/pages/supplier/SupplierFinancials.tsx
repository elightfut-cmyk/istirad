import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { DollarSign, ArrowDownLeft, ArrowUpRight, Wallet, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function SupplierFinancials() {
  const { user } = useAuthStore();
  const { formatCurrency } = useSettingsStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSales: 0, platformFees: 0, netEarned: 0, advanceTotal: 0, pending: 0 });

  useEffect(() => {
    if (user) {
      fetchFinancials();
    }
  }, [user]);

  const fetchFinancials = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_bids')
        .select(`
          id,
          price,
          cost_price,
          advance_percentage,
          status,
          shipping_status,
          is_fully_paid,
          is_paid_to_supplier,
          created_at,
          custom_requests (title, request_type, users (name, company_name))
        `)
        .eq('supplier_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let totalSales = 0;
      let platformFees = 0;
      let netEarned = 0;
      let advanceTotal = 0;
      let pending = 0;
      
      const { data: settings } = await supabase.from('platform_settings').select('platform_fee_percentage').single();
      const pFee = settings?.platform_fee_percentage || 0;

      const successfulTransactions: any[] = [];

      (data || []).forEach(bid => {
        if (bid.status === 'accepted' || bid.status === 'delivered' || bid.status === 'completed') {
          const advancePaid = (bid.price * bid.advance_percentage) / 100;
          let fee = 0;
          
          if (bid.is_fully_paid || bid.status === 'delivered' || bid.status === 'completed') {
            const profit = bid.price - (bid.cost_price || 0);
            fee = profit > 0 ? (profit * pFee / 100) : 0;
          } else if (bid.status === 'accepted') {
            fee = advancePaid * (pFee / 100);
          }
          
          totalSales += bid.price;
          platformFees += fee;
          advanceTotal += advancePaid;
          
          if (!bid.is_paid_to_supplier) {
            if (bid.is_fully_paid || bid.status === 'delivered' || bid.status === 'completed') {
              netEarned += (bid.price - fee);
            } else if (bid.status === 'accepted') {
              netEarned += (advancePaid - fee);
            }
          }
          
          successfulTransactions.push({...bid, platform_fee: fee});
        } else if (bid.status === 'pending') {
          pending += bid.price;
        }
      });

      setStats({ totalSales, platformFees, netEarned, advanceTotal, pending });
      setTransactions(successfulTransactions);

    } catch (error) {
      console.error('Error fetching financials:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="التقارير المالية"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/supplier', icon: <Activity size={20} /> },
        { label: 'التقارير المالية', href: '/supplier/financials', icon: <DollarSign size={20} /> },
      ]}
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">التقارير المالية والمحفظة</h2>
        <p className="text-gray-500 mt-1">تتبع أرباحك، العربون المدفوع، وسجل العمليات المالية الخاصة بك</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Activity size={20} />
            </div>
            <h3 className="text-gray-500 text-sm font-medium">إجمالي المبيعات (قيمة الصفقات)</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? '...' : formatCurrency(stats.totalSales)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <ArrowDownLeft size={20} />
            </div>
            <h3 className="text-gray-500 text-sm font-medium">عمولة المنصة المقتطعة</h3>
          </div>
          <p className="text-3xl font-bold text-red-600 mt-2">{loading ? '...' : formatCurrency(stats.platformFees)}</p>
        </div>

        <div className="bg-gradient-to-br from-[#4f46e5] to-[#4338ca] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-green-100 text-sm font-medium mb-1">صافي مستحقاتك (الربح الفعلي)</h3>
            <p className="text-4xl font-bold">{loading ? '...' : formatCurrency(stats.netEarned)}</p>
          </div>
          <Wallet size={120} className="absolute -left-8 -bottom-8 text-white opacity-10" />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <ArrowUpRight size={20} />
            </div>
            <h3 className="text-gray-500 text-sm font-medium">عروض قيد المراجعة</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? '...' : formatCurrency(stats.pending)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">سجل العمليات الناجحة</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm">
                <th className="px-6 py-4 font-medium">التاريخ</th>
                <th className="px-6 py-4 font-medium">البيان (الطلب)</th>
                <th className="px-6 py-4 font-medium">التاجر</th>
                <th className="px-6 py-4 font-medium">إجمالي الصفقة</th>
                <th className="px-6 py-4 font-medium text-red-500">عمولة المنصة</th>
                <th className="px-6 py-4 font-medium text-green-600">الصافي لك</th>
                <th className="px-6 py-4 font-medium">العربون المحصل</th>
                <th className="px-6 py-4 font-medium">حالة الدفع</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">جاري التحميل...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">لا توجد عمليات مالية بعد.</td></tr>
              ) : (
                transactions.map((tx) => {
                  const advancePaid = (tx.price * (tx.advance_percentage || 0)) / 100;
                  const fee = tx.platform_fee || 0;
                  const netAmount = tx.price - fee;
                  const merchantData = Array.isArray(tx.custom_requests?.users) ? tx.custom_requests.users[0] : tx.custom_requests?.users;
                  const merchantName = merchantData?.name || merchantData?.company_name || 'تاجر غير معروف';
                  return (
                    <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(tx.created_at).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {tx.custom_requests?.title}
                        {tx.custom_requests?.request_type === 'direct' ? (
                          <span className="mr-2 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-normal">مباشر</span>
                        ) : (
                          <span className="mr-2 bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs font-normal">مناقصة</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{merchantName}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(tx.price)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-red-500">{fee > 0 ? `-${formatCurrency(fee)}` : '0'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-600">{formatCurrency(netAmount)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600">{formatCurrency(advancePaid)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`font-bold ${tx.is_fully_paid || tx.shipping_status === 'delivered' ? 'text-green-600' : 'text-orange-600'}`}>
                          {tx.is_fully_paid || tx.shipping_status === 'delivered' ? 'مكتمل' : 'بانتظار الباقي'}
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
