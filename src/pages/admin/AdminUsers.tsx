import { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Search, Ban, CheckCircle, Trash2, ShieldAlert, MessageSquare, BadgeCheck, Wallet, Ticket, Award } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();

    const handleRefresh = () => {
      fetchUsers();
    };
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, phone, company_name, role, status, created_at, verification_badge, wallet_balance, loyalty_points')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = (currentStatus === 'banned' || currentStatus === 'pending') ? 'active' : 'banned';
    if (!window.confirm(`هل أنت متأكد من ${newStatus === 'active' ? 'تفعيل' : 'حظر'} هذا الحساب؟`)) return;

    try {
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      alert('حدث خطأ أثناء تغيير حالة الحساب');
      fetchUsers();
    }
  };

  const handleToggleBadge = async (userId: string, currentBadge: string) => {
    const nextBadge = currentBadge === 'blue' ? 'gold' : currentBadge === 'gold' ? 'none' : 'blue';
    try {
      setUsers(users.map(u => u.id === userId ? { ...u, verification_badge: nextBadge } : u));
      const { error } = await supabase.from('users').update({ verification_badge: nextBadge }).eq('id', userId);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating badge:', error);
      alert('حدث خطأ أثناء تغيير التوثيق');
      fetchUsers();
    }
  };



  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟ قد يسبب هذا مشاكل إذا كان المستخدم لديه طلبات سابقة. (يُنصح بالحظر بدلاً من الحذف).')) return;

    try {
      setUsers(users.filter(u => u.id !== userId));

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('حدث خطأ أثناء الحذف. لا يمكن حذف مستخدم مرتبط ببيانات أخرى في النظام.');
      fetchUsers();
    }
  };

  const handlePromoteToAdmin = async (userId: string, userName: string) => {
    if (!window.confirm(`هل أنت متأكد من ترقية (${userName}) ليكون مسؤولاً (أدمن)؟`)) return;

    try {
      setUsers(users.map(u => u.id === userId ? { ...u, role: 'admin' } : u));

      const { error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (error) throw error;
      alert(`تمت ترقية ${userName} إلى مسؤول بنجاح.`);
    } catch (error) {
      console.error('Error promoting user:', error);
      alert('حدث خطأ أثناء ترقية المستخدم.');
      fetchUsers();
    }
  };

  const handleClearWallet = async (userId: string, userName: string) => {
    if (!window.confirm(`هل أنت متأكد من تصفير رصيد المحفظة للتاجر (${userName})؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      setUsers(users.map(u => u.id === userId ? { ...u, wallet_balance: 0 } : u));
      const { error } = await supabase.from('users').update({ wallet_balance: 0 }).eq('id', userId);
      if (error) throw error;
      alert(`تم تصفير محفظة ${userName} بنجاح.`);
    } catch (error) {
      console.error('Error clearing wallet:', error);
      alert('حدث خطأ أثناء تصفير المحفظة.');
      fetchUsers();
    }
  };

  const handleClearPoints = async (userId: string, userName: string) => {
    if (!window.confirm(`هل أنت متأكد من تصفير نقاط الولاء للتاجر (${userName})؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      setUsers(users.map(u => u.id === userId ? { ...u, loyalty_points: 0 } : u));
      const { error } = await supabase.from('users').update({ loyalty_points: 0 }).eq('id', userId);
      if (error) throw error;
      alert(`تم تصفير نقاط ولاء ${userName} بنجاح.`);
    } catch (error) {
      console.error('Error clearing points:', error);
      alert('حدث خطأ أثناء تصفير النقاط.');
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.company_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <DashboardLayout
      title="إدارة المستخدمين"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'الإشعارات (تلغرام)', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
      ]}
    >
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="ابحث بالاسم، الإيميل، أو الشركة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-sm"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
            >
              <option value="all">كل الأدوار</option>
              <option value="merchant">التجار</option>
              <option value="supplier">الموردين</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                <th className="p-4 font-bold text-gray-700">المستخدم</th>
                <th className="p-4 font-bold text-gray-700">الشركة</th>
                <th className="p-4 font-bold text-gray-700">الدور</th>
                <th className="p-4 font-bold text-gray-700">الرصيد / النقاط</th>
                <th className="p-4 font-bold text-gray-700">الحالة</th>
                <th className="p-4 font-bold text-gray-700 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">لم يتم العثور على مستخدمين.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{u.name}</p>
                          {u.verification_badge === 'blue' && (
                            <BadgeCheck size={18} className="text-blue-500" fill="currentColor" color="white" />
                          )}
                          {u.verification_badge === 'gold' && (
                            <BadgeCheck size={18} className="text-yellow-500" fill="currentColor" color="white" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{u.email}</p>
                        <p className="text-xs text-gray-400">{u.phone}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{u.company_name || '-'}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        u.role === 'merchant' ? 'bg-blue-50 text-blue-700' : 
                        u.role === 'supplier' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {u.role === 'merchant' ? 'تاجر' : u.role === 'supplier' ? 'مورد' : 'أدمن'}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.role === 'merchant' ? (
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md inline-block text-center">{u.wallet_balance || 0} دج</span>
                          <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md inline-block text-center">{u.loyalty_points || 0} نقطة</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        u.status === 'banned' ? 'bg-red-50 text-red-700' : 
                        u.status === 'pending' ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {u.status === 'banned' ? 'محظور' : u.status === 'pending' ? 'قيد المراجعة' : 'نشط'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {u.role !== 'admin' && (
                          <>
                            <button 
                              onClick={() => handleToggleStatus(u.id, u.status)}
                              className={`p-2 rounded-xl transition-colors ${
                                (u.status === 'banned' || u.status === 'pending')
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                              }`}
                              title={(u.status === 'banned' || u.status === 'pending') ? 'تفعيل الحساب' : 'حظر الحساب'}
                            >
                              {(u.status === 'banned' || u.status === 'pending') ? <CheckCircle size={18} /> : <Ban size={18} />}
                            </button>
                            {u.role === 'supplier' && (
                              <button 
                                onClick={() => handleToggleBadge(u.id, u.verification_badge || 'none')}
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                                title="تغيير توثيق المورد (أزرق / ذهبي / بلا)"
                              >
                                <BadgeCheck size={18} />
                              </button>
                            )}
                            {u.role === 'merchant' && (
                              <>
                                <button 
                                  onClick={() => handleClearWallet(u.id, u.name)}
                                  className="p-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors"
                                  title="تصفير المحفظة"
                                >
                                  <Wallet size={18} />
                                </button>
                                <button 
                                  onClick={() => handleClearPoints(u.id, u.name)}
                                  className="p-2 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors"
                                  title="تصفير نقاط الولاء"
                                >
                                  <Award size={18} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => handlePromoteToAdmin(u.id, u.name)}
                              className="p-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors"
                              title="ترقية إلى مسؤول (أدمن)"
                            >
                              <ShieldAlert size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
                              title="حذف الحساب نهائياً"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
