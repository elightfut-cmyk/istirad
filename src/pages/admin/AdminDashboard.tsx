import { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Settings, MessageSquare, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';
import AdminSettings from '../../components/admin/AdminSettings';

export default function AdminDashboard() {
  const { formatCurrency } = useSettingsStore();
  const [stats, setStats] = useState({ totalMerchants: 0, totalSuppliers: 0, totalSales: 0 });
  const [obligations, setObligations] = useState({ supplierDues: 0, walletDues: 0, pointsDues: 0 });
  const [platformProfits, setPlatformProfits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    const handleRefresh = () => {
      fetchStats();
    };
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_stats');
      if (data && !error) {
        setStats({
          totalMerchants: data.totalMerchants || 0,
          totalSuppliers: data.totalSuppliers || 0,
          totalSales: data.totalSales || 0
        });
      }

      // Fetch wallet dues and points
      const { data: usersData, error: usersError } = await supabase.from('users').select('wallet_balance, loyalty_points');
      let walletSum = 0;
      let pointsSum = 0;
      if (usersData && !usersError) {
        walletSum = usersData.reduce((acc, user) => acc + (user.wallet_balance || 0), 0);
        pointsSum = usersData.reduce((acc, user) => acc + (user.loyalty_points || 0), 0);
      }
      
      const { data: settingsData } = await supabase.from('platform_settings').select('loyalty_points_to_dzd_ratio, platform_fee_percentage').single();
      const pointsDues = pointsSum * (settingsData?.loyalty_points_to_dzd_ratio || 10);

      // Fetch supplier dues and platform profits
      const { data: bidsData, error: bidsError } = await supabase.from('supplier_bids').select('price, cost_price, status, advance_percentage, is_fully_paid');
      let supplierSum = 0;
      let profitsSum = 0;
      if (bidsData && !bidsError) {
        const pFee = settingsData?.platform_fee_percentage || 0;
        bidsData.forEach(bid => {
          const price = bid.price || 0;
          const cost = bid.cost_price || 0;
          const advancePct = bid.advance_percentage || 20;
          const advancePaid = (price * advancePct) / 100;
          
          if (bid.status === 'cancelled') {
            // If cancelled, the deposit is kept and platform takes its fee from it
            const fee = advancePaid * (pFee / 100);
            profitsSum += fee;
          } else if (bid.is_fully_paid || bid.status === 'delivered' || bid.status === 'completed') {
            // User requested: When fully paid (or delivered/completed), recalculate and take percentage from profit margin only.
            const profitMargin = price - cost;
            const fee = profitMargin > 0 ? (profitMargin * pFee / 100) : 0;
            profitsSum += fee;
            // Supplier gets the full price minus platform fee
            supplierSum += (price - fee);
          } else if (bid.status === 'accepted') {
            // User requested: When only deposit is paid, platform takes its percentage from the WHOLE deposit.
            const fee = advancePaid * (pFee / 100);
            profitsSum += fee;
            // Supplier gets the rest of the deposit
            supplierSum += (advancePaid - fee);
          }
        });
      }
      
      setPlatformProfits(profitsSum);
      
      setObligations({ supplierDues: supplierSum, walletDues: walletSum, pointsDues: pointsDues });

    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="الرئيسية - الإدارة"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'الإشعارات (تلغرام)', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'إجمالي التجار', value: loading ? '...' : stats.totalMerchants.toString(), color: 'text-blue-600', bg: 'bg-blue-50', icon: <Users size={24} className="text-blue-600" /> },
          { title: 'إجمالي الموردين', value: loading ? '...' : stats.totalSuppliers.toString(), color: 'text-green-600', bg: 'bg-green-50', icon: <Users size={24} className="text-green-600" /> },
          { title: 'إجمالي المبيعات', value: loading ? '...' : formatCurrency(stats.totalSales), color: 'text-purple-600', bg: 'bg-purple-50', icon: <ShoppingBag size={24} className="text-purple-600" /> },
          { title: 'أرباح المنصة الصافية', value: loading ? '...' : formatCurrency(platformProfits), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <TrendingUp size={24} className="text-emerald-600" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-4 rounded-xl ${stat.bg}`}>
              {stat.icon}
            </div>
            <div>
              <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold mb-6 text-gray-800">الالتزامات المالية للمنصة (الديون)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-orange-50 p-6 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-4">
            <div className="p-4 rounded-xl bg-orange-100">
              <ShoppingBag size={24} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-gray-600 text-sm font-medium">مستحقات الموردين</h3>
              <p className="text-2xl font-bold mt-1 text-orange-600">{loading ? '...' : formatCurrency(obligations.supplierDues)}</p>
            </div>
          </div>
          <div className="bg-teal-50 p-6 rounded-2xl shadow-sm border border-teal-100 flex items-center gap-4">
            <div className="p-4 rounded-xl bg-teal-100">
              <Users size={24} className="text-teal-600" />
            </div>
            <div>
              <h3 className="text-gray-600 text-sm font-medium">أرصدة محافظ المستخدمين</h3>
              <p className="text-2xl font-bold mt-1 text-teal-600">{loading ? '...' : formatCurrency(obligations.walletDues)}</p>
            </div>
          </div>
          <div className="bg-purple-50 p-6 rounded-2xl shadow-sm border border-purple-100 flex items-center gap-4">
            <div className="p-4 rounded-xl bg-purple-100">
              <Users size={24} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-gray-600 text-sm font-medium">قيمة نقاط الولاء (احتياطي)</h3>
              <p className="text-2xl font-bold mt-1 text-purple-600">{loading ? '...' : formatCurrency(obligations.pointsDues)}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
          <Settings size={24} className="text-[#065f46]" />
          إعدادات المنصة
        </h2>
        <AdminSettings />
      </div>
    </DashboardLayout>
  );
}
