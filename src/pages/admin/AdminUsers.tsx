import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Search, 
  Ban, 
  CheckCircle, 
  Trash2, 
  ShieldAlert, 
  MessageSquare, 
  BadgeCheck, 
  Wallet, 
  Ticket, 
  Award, 
  Video,
  ShieldCheck,
  Gem,
  Star,
  Shield,
  ExternalLink,
  Bell,
  Smartphone
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import SupplierBadge from '../../components/SupplierBadge';
import { sendNotification } from '../../store/useNotificationStore';
import { getSupplierRatingInfo } from '../../utils/supplierUtils';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'suppliers' | 'merchants'>('all');

  // Direct user notification modal state
  const [notifModalUser, setNotifModalUser] = useState<any | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

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
        .select('id, name, email, phone, company_name, role, status, created_at, verification_badge, wallet_balance, loyalty_points, current_app_version')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const enrichedUsers = (data || []).map((u: any) => {
        const info = getSupplierRatingInfo(u.verification_badge);
        return { 
          ...u, 
          supplier_tier: info.tier,
          average_rating: info.rating,
          total_reviews: info.totalReviews
        };
      });
      setUsers(enrichedUsers);
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
      await ensureAdminSession();

      // Call secure RPC first
      const { error: rpcError } = await supabase.rpc('admin_set_user_status', {
        target_user_id: userId,
        new_status: newStatus
      });

      if (rpcError) {
        console.warn('RPC admin_set_user_status returned error, trying direct update:', rpcError);
        const { error: directError } = await supabase.from('users').update({ status: newStatus }).eq('id', userId);
        if (directError) throw directError;
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      toast.success(newStatus === 'banned' ? 'تم حظر المستخدم بنجاح' : 'تم تفعيل حساب المستخدم بنجاح');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('حدث خطأ أثناء تغيير حالة الحساب: ' + (error?.message || ''));
      fetchUsers();
    }
  };


  const handleToggleBadge = async (userId: string, currentBadge: string) => {
    const nextBadge = currentBadge === 'blue' ? 'gold' : currentBadge === 'gold' ? 'platinum' : currentBadge === 'platinum' ? 'none' : 'blue';
    try {
      const tierMap: Record<string, string> = { platinum: 'PLATINUM', gold: 'GOLD', blue: 'SILVER', none: 'NEW' };
      setUsers(users.map(u => u.id === userId ? { ...u, verification_badge: nextBadge, supplier_tier: tierMap[nextBadge] || 'NEW' } : u));
      const { error } = await supabase.from('users').update({ 
        verification_badge: nextBadge
      }).eq('id', userId);
      if (error) throw error;
      toast.success(`تم تغيير شارة التوثيق إلى: ${nextBadge}`);
    } catch (error) {
      console.error('Error updating badge:', error);
      toast.error('حدث خطأ أثناء تغيير التوثيق');
      fetchUsers();
    }
  };

  const handleChangeSupplierTier = async (userId: string, newTier: string) => {
    try {
      const badgeValue = newTier === 'PLATINUM' ? 'platinum' : newTier === 'GOLD' ? 'gold' : newTier === 'SILVER' ? 'blue' : 'none';
      setUsers(users.map(u => u.id === userId ? { ...u, supplier_tier: newTier, verification_badge: badgeValue } : u));
      const { error } = await supabase.from('users').update({ 
        verification_badge: badgeValue 
      }).eq('id', userId);
      if (error) throw error;
      toast.success(`تم تحديث تصنيف المورد إلى: ${newTier} وتحديث الشارة بنجاح`);
    } catch (error: any) {
      console.error('Error updating supplier tier:', error);
      toast.error('حدث خطأ أثناء تغيير التصنيف: ' + (error.message || ''));
      fetchUsers();
    }
  };

  const handleSetVerificationBadge = async (userId: string, newBadge: string) => {
    try {
      setUsers(users.map(u => u.id === userId ? { ...u, verification_badge: newBadge } : u));
      const { error } = await supabase.from('users').update({ verification_badge: newBadge }).eq('id', userId);
      if (error) throw error;
      toast.success('تم تحديث شارة التوثيق بنجاح');
    } catch (error: any) {
      console.error('Error updating verification badge:', error);
      toast.error('حدث خطأ أثناء تحديث التوثيق: ' + (error.message || ''));
      fetchUsers();
    }
  };



  const ensureAdminSession = async (): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session || (session.expires_at && session.expires_at * 1000 - Date.now() < 300000)) {
        const { data: refreshData, error } = await supabase.auth.refreshSession();
        if (error || !refreshData.session) return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟ قد يسبب هذا مشاكل إذا كان المستخدم لديه طلبات سابقة. (يُنصح بالحظر بدلاً من الحذف).')) return;

    try {
      // 1. Ensure valid/refreshed admin session before calling RPC
      await ensureAdminSession();

      let { error } = await supabase.rpc('delete_user_by_admin', {
        user_id_to_delete: userId
      });

      // 2. If it failed due to stale auth/admin token, attempt immediate refresh and retry once
      if (error && (
        error.message?.toLowerCase().includes('admin') || 
        error.message?.includes('أدمن') || 
        error.message?.toLowerCase().includes('unauthorized') ||
        error.code === '401' || 
        error.code === '403' ||
        error.code === 'PGRST301'
      )) {
        console.warn('First delete attempt failed with auth error, attempting session refresh and retry...', error);
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed.session) {
          const retryRes = await supabase.rpc('delete_user_by_admin', {
            user_id_to_delete: userId
          });
          error = retryRes.error;
        }
      }

      if (error) {
        if (error.message?.toLowerCase().includes('unauthorized') || error.message?.includes('admin') || error.message?.includes('أدمن')) {
          throw new Error('انتهت صلاحية جلسة الأدمن. يُرجى تسجيل الدخول مجدداً لتأكيد الصلاحية.');
        }
        throw error;
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('تم حذف المستخدم بنجاح.');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'حدث خطأ أثناء الحذف. تأكد من أن المستخدم غير مرتبط بطلبات نشطة.');
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
      toast.success(`تمت ترقية ${userName} إلى مسؤول بنجاح.`);
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('حدث خطأ أثناء ترقية المستخدم.');
      fetchUsers();
    }
  };

  const handleClearWallet = async (userId: string, userName: string) => {
    if (!window.confirm(`هل أنت متأكد من تصفير رصيد المحفظة للتاجر (${userName})؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      setUsers(users.map(u => u.id === userId ? { ...u, wallet_balance: 0 } : u));
      const { error } = await supabase.from('users').update({ wallet_balance: 0 }).eq('id', userId);
      if (error) throw error;
      toast.success(`تم تصفير محفظة ${userName} بنجاح.`);
    } catch (error) {
      console.error('Error clearing wallet:', error);
      toast.error('حدث خطأ أثناء تصفير المحفظة.');
      fetchUsers();
    }
  };

  const handleClearPoints = async (userId: string, userName: string) => {
    if (!window.confirm(`هل أنت متأكد من تصفير نقاط الولاء للتاجر (${userName})؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      setUsers(users.map(u => u.id === userId ? { ...u, loyalty_points: 0 } : u));
      const { error } = await supabase.from('users').update({ loyalty_points: 0 }).eq('id', userId);
      if (error) throw error;
      toast.success(`تم تصفير نقاط ولاء ${userName} بنجاح.`);
    } catch (error) {
      console.error('Error clearing points:', error);
      toast.error('حدث خطأ أثناء تصفير النقاط.');
      fetchUsers();
    }
  };

  const handleSendUserNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifModalUser) return;
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error('يرجى ملء عنوان ونص الإشعار');
      return;
    }
    setSendingNotif(true);
    try {
      const res = await sendNotification(notifModalUser.id, notifTitle.trim(), notifMessage.trim(), 'info');
      if (res && res.pushSent) {
        toast.success(`تم إرسال الإشعار بنجاح إلى ${notifModalUser.name} (وصل للجرس وهاتف المستخدم بالخلفية)!`);
      } else if (res && res.pushError) {
        toast(`تم حفظ الإشعار في جرس ${notifModalUser.name} بنجاح، لكن تنبيه الهاتف بالخلفية: ${res.pushError}`, {
          icon: '⚠️',
          duration: 7000
        });
      } else {
        toast.success(`تم حفظ الإشعار في جرس المستخدم ${notifModalUser.name} بنجاح!`);
      }
      setNotifModalUser(null);
      setNotifTitle('');
      setNotifMessage('');
    } catch (err: any) {
      console.error('Error sending user notification:', err);
      toast.error('حدث خطأ أثناء إرسال الإشعار');
    } finally {
      setSendingNotif(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.company_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'suppliers') return matchesSearch && u.role === 'supplier';
    if (activeTab === 'merchants') return matchesSearch && u.role === 'merchant';
    return matchesSearch;
  });

  const suppliersList = users.filter(u => u.role === 'supplier');
  const platinumCount = suppliersList.filter(u => (u.supplier_tier === 'PLATINUM' || u.verification_badge === 'platinum')).length;
  const goldCount = suppliersList.filter(u => (u.supplier_tier === 'GOLD' || u.verification_badge === 'gold')).length;
  const silverCount = suppliersList.filter(u => (u.supplier_tier === 'SILVER' || u.verification_badge === 'blue' || u.verification_badge === 'silver')).length;

  return (
    <DashboardLayout
      title="إدارة المستخدمين والتصنيفات"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'توثيقات الموردين', href: '/admin/verifications', icon: <ShieldCheck size={20} /> },
        { label: 'الطلبات والمناقصات', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'التنبيهات والإشعارات', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
        { label: 'فيديو الرئيسية', href: '/admin/main-video', icon: <Video size={20} /> },
      ]}
    >
      <div className="space-y-6">

        {/* ── Navigation Tabs ── */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 w-full md:w-auto overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition shrink-0 ${
                activeTab === 'all' 
                  ? 'bg-white dark:bg-gray-800 text-[#4f46e5] shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users size={16} />
              <span>كافة الحسابات</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold">
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition shrink-0 ${
                activeTab === 'suppliers' 
                  ? 'bg-white dark:bg-gray-800 text-[#4f46e5] shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck size={16} className="text-amber-500" />
              <span>تصنيف وتوثيق الموردين</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black">
                {suppliersList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('merchants')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition shrink-0 ${
                activeTab === 'merchants' 
                  ? 'bg-white dark:bg-gray-800 text-[#4f46e5] shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag size={16} />
              <span>التجار</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                {users.filter(u => u.role === 'merchant').length}
              </span>
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder={activeTab === 'suppliers' ? 'ابحث في الموردين بالاسم أو الشركة...' : 'ابحث بالاسم، الإيميل، أو الشركة...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-sm bg-gray-50 dark:bg-gray-900"
            />
            <Search className="absolute left-3 top-3 text-gray-400" size={17} />
          </div>
        </div>

        {/* ── Specialized Supplier Tiers Header Cards (When Suppliers tab is active) ── */}
        {activeTab === 'suppliers' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border border-amber-300/40 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={24} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-base">لوحة تصنيف وتوثيق الموردين يدوياً</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                    يمكنك ترقية أي مورد يدوياً إلى (بلاتيني 💎، ذهبي 🥇، فضي 🥈، أو جديد 🥉) وتحديد شارة التوثيق. تظهر الرتبة للتجار في عروض الأسعار ولبقية الموردين في المناقصات.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-900 text-cyan-300">
                  <Gem size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">مورد بلاتيني</p>
                  <p className="text-xl font-black text-cyan-500">{platinumCount}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">مورد ذهبي</p>
                  <p className="text-xl font-black text-amber-600">{goldCount}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">مورد فضي</p>
                  <p className="text-xl font-black text-slate-700 dark:text-slate-300">{silverCount}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">إجمالي الموردين</p>
                  <p className="text-xl font-black text-emerald-600">{suppliersList.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Users Table ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-700">
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-200">المستخدم / الشركة</th>
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الدور</th>
                  {activeTab === 'suppliers' ? (
                    <>
                      <th className="p-4 font-bold text-gray-700 dark:text-gray-200">التصنيف الحالي (الرتبة)</th>
                      <th className="p-4 font-bold text-gray-700 dark:text-gray-200">شارة التوثيق الرسمية</th>
                      <th className="p-4 font-bold text-gray-700 dark:text-gray-200">التقييمات</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4 font-bold text-gray-700 dark:text-gray-200">الرصيد / النقاط</th>
                      <th className="p-4 font-bold text-gray-700 dark:text-gray-200">التصنيف / التوثيق</th>
                    </>
                  )}
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-200">حالة الحساب</th>
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-200 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">لم يتم العثور على نتائج تطابق البحث.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSupplier = u.role === 'supplier';
                    const currentTier = u.supplier_tier || 'NEW';

                    return (
                      <tr key={u.id} className="hover:bg-gray-50 dark:bg-gray-900/50 transition-colors">
                        
                        {/* Name, Company & Contacts */}
                        <td className="p-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{u.name}</p>
                              {u.verification_badge === 'platinum' && (
                                <span title="موثق بشارة بلاتينية"><BadgeCheck size={17} className="text-cyan-500" fill="currentColor" color="white" /></span>
                              )}
                              {u.verification_badge === 'gold' && (
                                <span title="موثق بشارة ذهبية"><BadgeCheck size={17} className="text-amber-500" fill="currentColor" color="white" /></span>
                              )}
                              {(u.verification_badge === 'blue' || u.verification_badge === 'silver') && (
                                <span title="موثق بشارة زرقاء"><BadgeCheck size={17} className="text-blue-500" fill="currentColor" color="white" /></span>
                              )}
                              {u.current_app_version && u.current_app_version > 1 ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" title={`تطبيق الهاتف v${u.current_app_version}`}>
                                  📱 v{u.current_app_version}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" title="متصفح الويب">
                                  🌐 ويب
                                </span>
                              )}
                            </div>
                            {u.company_name && (
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mt-0.5">شركة: {u.company_name}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">{u.email} {u.phone && `• ${u.phone}`}</p>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            u.role === 'merchant' ? 'bg-blue-50 text-blue-700' : 
                            u.role === 'supplier' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                          }`}>
                            {u.role === 'merchant' ? 'تاجر' : u.role === 'supplier' ? 'مورد' : 'أدمن'}
                          </span>
                        </td>

                        {/* Supplier Specific Columns */}
                        {activeTab === 'suppliers' ? (
                          <>
                            {/* Current Tier & Changer */}
                            <td className="p-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="mb-1">
                                  <SupplierBadge
                                    supplierId={u.id}
                                    name={u.name}
                                    companyName={u.company_name}
                                    tier={currentTier}
                                    rating={u.average_rating || 0}
                                    totalReviews={u.total_reviews || 0}
                                    size="xs"
                                    clickable={false}
                                  />
                                </div>
                                <select
                                  value={currentTier}
                                  onChange={(e) => handleChangeSupplierTier(u.id, e.target.value)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                                >
                                  <option value="NEW">🥉 جديد (NEW)</option>
                                  <option value="SILVER">🥈 فضي (SILVER)</option>
                                  <option value="GOLD">🥇 ذهبي (GOLD)</option>
                                  <option value="PLATINUM">💎 بلاتيني (PLATINUM)</option>
                                </select>
                              </div>
                            </td>

                            {/* Verification Badge Switcher */}
                            <td className="p-4">
                              <div className="flex flex-col gap-1.5">
                                <select
                                  value={u.verification_badge || 'none'}
                                  onChange={(e) => handleSetVerificationBadge(u.id, e.target.value)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                                >
                                  <option value="none">❌ غير موثق (بدون شارة)</option>
                                  <option value="blue">🛡️ شارة زرقاء (معتمد)</option>
                                  <option value="gold">🥇 شارة ذهبية (مميز)</option>
                                  <option value="platinum">💎 شارة بلاتينية (أعلى موثوقية)</option>
                                </select>
                                <span className="text-[10px] text-gray-400">
                                  {u.verification_badge && u.verification_badge !== 'none' ? 'موثق رسمياً من المنصة' : 'غير موثق'}
                                </span>
                              </div>
                            </td>

                            {/* Ratings & Reviews */}
                            <td className="p-4">
                              <div className="text-xs">
                                <span className="font-black text-amber-500 flex items-center gap-1">
                                  <Star size={13} className="fill-amber-400 text-amber-400" />
                                  {Number(u.average_rating || 0).toFixed(1)} / 5
                                </span>
                                <span className="text-gray-400 text-[11px] block mt-0.5">
                                  {u.total_reviews || 0} تقييم مسجل
                                </span>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Wallet / Loyalty for merchants */}
                            <td className="p-4">
                              {u.role === 'merchant' ? (
                                <div className="flex flex-col gap-1 text-xs">
                                  <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md text-center">{u.wallet_balance || 0} دج</span>
                                  <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md text-center">{u.loyalty_points || 0} نقطة</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>

                            {/* Classification / Badge preview in all users table */}
                            <td className="p-4">
                              {isSupplier ? (
                                <select
                                  value={currentTier}
                                  onChange={(e) => handleChangeSupplierTier(u.id, e.target.value)}
                                  className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold"
                                >
                                  <option value="NEW">🥉 جديد</option>
                                  <option value="SILVER">🥈 فضي</option>
                                  <option value="GOLD">🥇 ذهبي</option>
                                  <option value="PLATINUM">💎 بلاتيني</option>
                                </select>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </>
                        )}

                        {/* Account Status */}
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            u.status === 'banned' ? 'bg-red-50 text-red-700' : 
                            u.status === 'pending' ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {u.status === 'banned' ? 'محظور' : u.status === 'pending' ? 'قيد المراجعة' : 'نشط'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
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
                                  {(u.status === 'banned' || u.status === 'pending') ? <CheckCircle size={16} /> : <Ban size={16} />}
                                </button>

                                <button
                                  onClick={() => {
                                    setNotifModalUser(u);
                                    setNotifTitle('');
                                    setNotifMessage('');
                                  }}
                                  className="p-2 bg-indigo-50 text-[#4f46e5] rounded-xl hover:bg-indigo-100 transition-colors"
                                  title="إرسال إشعار مخصص (جرس + هاتف بالخلفية)"
                                >
                                  <Bell size={16} />
                                </button>

                                {isSupplier && (
                                  <>
                                    <button 
                                      onClick={() => handleToggleBadge(u.id, u.verification_badge || 'none')}
                                      className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                                      title="تبديل شارة التوثيق تلقائياً"
                                    >
                                      <BadgeCheck size={16} />
                                    </button>
                                    <a
                                      href={`/supplier/profile/${u.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-2 bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-slate-200 transition-colors"
                                      title="عرض الملف العام للمورد"
                                    >
                                      <ExternalLink size={16} />
                                    </a>
                                  </>
                                )}

                                {u.role === 'merchant' && (
                                  <>
                                    <button 
                                      onClick={() => handleClearWallet(u.id, u.name)}
                                      className="p-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors"
                                      title="تصفير المحفظة"
                                    >
                                      <Wallet size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleClearPoints(u.id, u.name)}
                                      className="p-2 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors"
                                      title="تصفير نقاط الولاء"
                                    >
                                      <Award size={16} />
                                    </button>
                                  </>
                                )}

                                <button 
                                  onClick={() => handlePromoteToAdmin(u.id, u.name)}
                                  className="p-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors"
                                  title="ترقية إلى مسؤول (أدمن)"
                                >
                                  <ShieldAlert size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
                                  title="حذف الحساب نهائياً"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Direct User Notification Modal */}
      {notifModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4f46e5] flex items-center justify-center font-bold">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">إرسال إشعار مخصص للمستخدم</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{notifModalUser.name} ({notifModalUser.role === 'merchant' ? 'تاجر' : notifModalUser.role === 'supplier' ? 'مورد' : 'مستخدم'})</p>
                </div>
              </div>
              <button
                onClick={() => setNotifModalUser(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendUserNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">عنوان الإشعار</label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="مثال: تنبيه بخصوص طلبك أو حسابك..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">نص الإشعار</label>
                <textarea
                  required
                  rows={4}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="اكتب الرسالة التي ستصل للمستخدم..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/50 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <Smartphone size={16} className="shrink-0" />
                <span>يصل الإشعار لجرس التنبيهات ولشاشة هاتف المستخدم في الخلفية (Push Notification).</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setNotifModalUser(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={sendingNotif}
                  className="px-6 py-2.5 bg-[#4f46e5] hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {sendingNotif ? 'جاري الإرسال...' : 'إرسال الإشعار الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
