import { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Settings, MessageSquare } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';
import AdminSettings from '../../components/admin/AdminSettings';

export default function AdminDashboard() {
  const { formatCurrency } = useSettingsStore();
  const [stats, setStats] = useState({ totalMerchants: 0, totalSuppliers: 0, totalSales: 0 });
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'إجمالي التجار', value: loading ? '...' : stats.totalMerchants.toString(), color: 'text-blue-600', bg: 'bg-blue-50', icon: <Users size={24} className="text-blue-600" /> },
          { title: 'إجمالي الموردين', value: loading ? '...' : stats.totalSuppliers.toString(), color: 'text-green-600', bg: 'bg-green-50', icon: <Users size={24} className="text-green-600" /> },
          { title: 'المبيعات الكلية للمنصة', value: loading ? '...' : formatCurrency(stats.totalSales), color: 'text-purple-600', bg: 'bg-purple-50', icon: <ShoppingBag size={24} className="text-purple-600" /> },
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
