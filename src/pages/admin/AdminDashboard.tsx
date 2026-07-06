import { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Settings, MessageSquare, TrendingUp, Ticket } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';
import AdminSettings from '../../components/admin/AdminSettings';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { formatCurrency } = useSettingsStore();
  const [stats, setStats] = useState({ totalMerchants: 0, totalSuppliers: 0, totalSales: 0 });
  const [obligations, setObligations] = useState({ supplierDues: 0, walletDues: 0, pointsDues: 0 });
  const [platformProfits, setPlatformProfits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payingDues, setPayingDues] = useState(false);
  
  const [users, setUsers] = useState<any[]>([]);
  const [allBids, setAllBids] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  
  const [selectedRole, setSelectedRole] = useState<'supplier' | 'merchant'>('supplier');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

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
      const { data: usersData, error: usersError } = await supabase.from('users').select('id, name, company_name, role, wallet_balance, loyalty_points');
      let walletSum = 0;
      let pointsSum = 0;
      if (usersData && !usersError) {
        setUsers(usersData);
        walletSum = usersData.reduce((acc, user) => acc + (user.wallet_balance || 0), 0);
        pointsSum = usersData.reduce((acc, user) => acc + (user.loyalty_points || 0), 0);
      }
      
      const { data: settingsData } = await supabase.from('platform_settings').select('loyalty_points_to_dzd_ratio, profit_fixed_amount, profit_percentage').single();
      setPlatformSettings(settingsData);
      const pointsDues = pointsSum * (settingsData?.loyalty_points_to_dzd_ratio || 10);

      // Fetch supplier dues and platform profits
      const { data: bidsData, error: bidsError } = await supabase.from('supplier_bids').select('id, supplier_id, request_id, price, cost_price, status, advance_percentage, is_fully_paid, is_paid_to_supplier, custom_requests(quantity)');
      const { data: reqData } = await supabase.from('custom_requests').select('id, merchant_id, status');
      
      let supplierSum = 0;
      let profitsSum = 0;
      if (bidsData && !bidsError) {
        setAllBids(bidsData);
        if (reqData) setAllRequests(reqData);
        const fixedAmount = settingsData?.profit_fixed_amount ?? 100;
        const percentage = settingsData?.profit_percentage ?? 5;
        bidsData.forEach(bid => {
          const price = bid.price || 0;
          const advancePct = bid.advance_percentage || 20;
          const advancePaid = (price * advancePct) / 100;
          const quantity = (bid.custom_requests as any)?.quantity || 1;
          const totalFee = (quantity * fixedAmount) + (price * (percentage / 100));
          
          if (bid.status === 'cancelled') {
            const fee = advancePaid * (percentage / 100);
            profitsSum += fee;
          } else if (bid.is_fully_paid || bid.status === 'delivered' || bid.status === 'completed') {
            const fee = totalFee;
            profitsSum += fee;
            if (!bid.is_paid_to_supplier) supplierSum += (price - fee);
          } else if (bid.status === 'accepted') {
            const fee = advancePaid * (percentage / 100);
            profitsSum += fee;
            if (!bid.is_paid_to_supplier) supplierSum += (advancePaid - fee);
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

  const handlePaySupplierDues = async (supplierId: string) => {
    if (!window.confirm('هل أنت متأكد من تأكيد دفع جميع المستحقات لهذا المورد؟ لن يمكن التراجع عن هذه العملية.')) return;
    setPayingDues(true);
    try {
      // Find all unpaid bids for this supplier that have dues
      const unpaidBids = allBids.filter(b => b.supplier_id === supplierId && !b.is_paid_to_supplier && (b.status === 'accepted' || b.status === 'delivered' || b.status === 'completed' || b.is_fully_paid));
      
      const ids = unpaidBids.map(b => b.id);
      
      if (ids.length > 0) {
        const { error } = await supabase.from('supplier_bids').update({ is_paid_to_supplier: true }).in('id', ids);
        if (error) throw error;
        toast.success('تم تأكيد الدفع بنجاح');
        fetchStats(); // Refresh data
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الدفع');
    } finally {
      setPayingDues(false);
    }
  };

  const getDetailedStats = () => {
    if (!selectedUserId) return null;
    
    const user = users.find(u => u.id === selectedUserId);
    if (!user) return null;

    const fixedAmount = platformSettings?.profit_fixed_amount ?? 100;
    const percentage = platformSettings?.profit_percentage ?? 5;

    if (user.role === 'supplier') {
      const userBids = allBids.filter(b => b.supplier_id === user.id);
      let totalSales = 0;
      let totalDues = 0;
      
      userBids.forEach(bid => {
        if (bid.status === 'accepted' || bid.status === 'delivered' || bid.status === 'completed' || bid.is_fully_paid) {
          totalSales += (bid.price || 0);
          
          const price = bid.price || 0;
          const advancePct = bid.advance_percentage || 20;
          const advancePaid = (price * advancePct) / 100;
          const quantity = (bid.custom_requests as any)?.quantity || 1;
          const totalFee = (quantity * fixedAmount) + (price * (percentage / 100));
          
          if (bid.is_fully_paid || bid.status === 'delivered' || bid.status === 'completed') {
            const fee = totalFee;
            if (!bid.is_paid_to_supplier) totalDues += (price - fee);
          } else if (bid.status === 'accepted') {
            const fee = advancePaid * (percentage / 100);
            if (!bid.is_paid_to_supplier) totalDues += (advancePaid - fee);
          }
        }
      });
      return { totalSales, totalDues, walletBalance: user.wallet_balance || 0 };
    } else {
      // Merchant
      const userRequests = allRequests.filter(r => r.merchant_id === user.id);
      const requestIds = userRequests.map(r => r.id);
      const userPurchases = allBids.filter(b => requestIds.includes(b.request_id) && (b.status === 'accepted' || b.status === 'delivered' || b.status === 'completed' || b.is_fully_paid));
      
      let totalPurchases = 0;
      userPurchases.forEach(bid => {
        totalPurchases += (bid.price || 0);
      });
      
      return { totalPurchases, walletBalance: user.wallet_balance || 0, loyaltyPoints: user.loyalty_points || 0 };
    }
  };

  const detailedStats = getDetailedStats();

  return (
    <DashboardLayout
      title="الرئيسية - الإدارة"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
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

      {/* Detailed User Statistics */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold mb-6 text-gray-800">إحصاءات المستخدمين التفصيلية</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1 w-full md:w-max">
            <button 
              onClick={() => { setSelectedRole('supplier'); setSelectedUserId(''); }}
              className={`flex-1 px-6 py-2 text-sm font-bold rounded-md transition ${selectedRole === 'supplier' ? 'bg-white text-[#4f46e5] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              الموردين
            </button>
            <button 
              onClick={() => { setSelectedRole('merchant'); setSelectedUserId(''); }}
              className={`flex-1 px-6 py-2 text-sm font-bold rounded-md transition ${selectedRole === 'merchant' ? 'bg-white text-[#4f46e5] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              التجار
            </button>
          </div>
          
          <select 
            value={selectedUserId} 
            onChange={e => setSelectedUserId(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 text-sm"
          >
            <option value="">-- اختر {selectedRole === 'supplier' ? 'المورد' : 'التاجر'} --</option>
            {users.filter(u => u.role === selectedRole).map(u => (
              <option key={u.id} value={u.id}>{u.name} {u.company_name ? `(${u.company_name})` : ''}</option>
            ))}
          </select>
        </div>

        {selectedUserId && detailedStats && (
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-800">
              سجل {selectedRole === 'supplier' ? 'المورد' : 'التاجر'}: {users.find(u => u.id === selectedUserId)?.name}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {selectedRole === 'supplier' ? (
                <>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">إجمالي المبيعات (الطلبات المقبولة)</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(detailedStats.totalSales || 0)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">المستحقات (الأرباح المستحقة الدفع)</p>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency((detailedStats as any).totalDues || 0)}</p>
                    {(detailedStats as any).totalDues > 0 && (
                      <button 
                        onClick={() => handlePaySupplierDues(selectedUserId)}
                        disabled={payingDues}
                        className="mt-3 w-full bg-[#4f46e5] text-white py-2 rounded-lg text-sm font-bold hover:bg-[#4338ca] transition disabled:opacity-50"
                      >
                        {payingDues ? 'جاري الدفع...' : 'تأكيد دفع المستحقات'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">إجمالي المشتريات (الطلبات المقبولة)</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(detailedStats.totalPurchases || 0)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">رصيد المحفظة</p>
                    <p className="text-xl font-bold text-teal-600">{formatCurrency(detailedStats.walletBalance)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1">نقاط الولاء</p>
                    <p className="text-xl font-bold text-purple-600">{detailedStats.loyaltyPoints} نقطة</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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
          <Settings size={24} className="text-[#4f46e5]" />
          إعدادات المنصة
        </h2>
        <AdminSettings />
      </div>
    </DashboardLayout>
  );
}
