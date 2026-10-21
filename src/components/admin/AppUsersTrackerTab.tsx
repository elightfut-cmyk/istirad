import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  RefreshCw, 
  Search, 
  Send,
  Phone,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'merchant' | 'supplier' | 'admin' | string;
  status?: string;
  created_at: string;
  current_app_version?: number | null;
  company_name?: string;
}

interface AppSettings {
  latest_version_code: number;
  latest_version_name: string;
  apk_download_url: string;
}

export default function AppUsersTrackerTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    latest_version_code: 15,
    latest_version_name: '1.3.2',
    apk_download_url: '/jiibha-app.apk'
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<'all' | 'app_only' | 'outdated' | 'up_to_date' | 'web_only'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'merchant' | 'supplier'>('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch App Settings for latest version
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('latest_version_code, latest_version_name, apk_download_url')
        .eq('id', 1)
        .maybeSingle();

      if (settingsData) {
        setAppSettings({
          latest_version_code: Number(settingsData.latest_version_code) || 15,
          latest_version_name: settingsData.latest_version_name || '1.3.2',
          apk_download_url: settingsData.apk_download_url || '/jiibha-app.apk'
        });
      }

      // 2. Fetch Users with current_app_version
      const { data: usersData, error } = await supabase
        .from('users')
        .select('id, name, email, phone, role, status, created_at, current_app_version, company_name')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(usersData || []);
    } catch (err) {
      console.error('Error fetching app users tracker data:', err);
      toast.error('حدث خطأ أثناء جلب بيانات مستخدمي التطبيق');
    } finally {
      setLoading(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalUsers = users.length;
    // Users who have installed and opened the app (build code > 1)
    const appUsers = users.filter(u => (u.current_app_version || 0) > 1);
    const upToDateUsers = users.filter(u => (u.current_app_version || 0) >= appSettings.latest_version_code);
    const outdatedUsers = users.filter(u => {
      const v = u.current_app_version || 0;
      return v > 1 && v < appSettings.latest_version_code;
    });
    const webOnlyUsers = users.filter(u => !u.current_app_version || u.current_app_version <= 1);

    const appAdoptionRate = totalUsers > 0 ? Math.round((appUsers.length / totalUsers) * 100) : 0;
    const updateRate = appUsers.length > 0 ? Math.round((upToDateUsers.length / appUsers.length) * 100) : 0;

    return {
      totalUsers,
      appUsersCount: appUsers.length,
      upToDateCount: upToDateUsers.length,
      outdatedCount: outdatedUsers.length,
      webOnlyCount: webOnlyUsers.length,
      appAdoptionRate,
      updateRate
    };
  }, [users, appSettings]);

  // Filtered List
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        user.name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.phone?.includes(q) ||
        user.company_name?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Role Filter
      if (filterRole !== 'all' && user.role !== filterRole) {
        return false;
      }

      // Platform / Version Filter
      const ver = user.current_app_version || 0;
      const isAppUser = ver > 1;

      if (filterPlatform === 'app_only') {
        return isAppUser;
      }
      if (filterPlatform === 'outdated') {
        return isAppUser && ver < appSettings.latest_version_code;
      }
      if (filterPlatform === 'up_to_date') {
        return ver >= appSettings.latest_version_code;
      }
      if (filterPlatform === 'web_only') {
        return !isAppUser;
      }

      return true;
    });
  }, [users, searchQuery, filterRole, filterPlatform, appSettings]);

  const handleNotifyOutdatedUsers = async () => {
    if (stats.outdatedCount === 0) {
      toast('لا يوجد مستخدمون بإصدارات قديمة حالياً.', { icon: 'ℹ️' });
      return;
    }

    if (!window.confirm(`هل تريد إرسال تنبيه تذكيري بالتحديث لجميع المستخدمين الذين يعملون بنسخ قديمة (${stats.outdatedCount} مستخدم)؟`)) {
      return;
    }

    setSendingBroadcast(true);
    try {
      const outdated = users.filter(u => {
        const v = u.current_app_version || 0;
        return v > 1 && v < appSettings.latest_version_code;
      });

      // Insert notifications for outdated users
      const notifications = outdated.map(u => ({
        user_id: u.id,
        title: 'تحديث جديد متوفر للتطبيق 📱',
        message: `يتوفر إصدار جديد لتطبيق جيبها (${appSettings.latest_version_name}). يرجى تحميله للاستفادة من أحدث الميزات واستقرار التنبيهات.`,
        type: 'info',
        link: appSettings.apk_download_url
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;

      toast.success(`تم إرسال إشعار التحديث بنجاح إلى ${outdated.length} مستخدم!`);
    } catch (err: any) {
      console.error('Error notifying outdated users:', err);
      toast.error('حدث خطأ أثناء إرسال الإشعارات: ' + (err.message || ''));
    } finally {
      setSendingBroadcast(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'merchant':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            تاجر
          </span>
        );
      case 'supplier':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            مورد
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            أدمن
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">{role}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#4f46e5]/10 via-purple-500/10 to-emerald-500/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4f46e5] to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Smartphone size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">متتبع مستخدمي التطبيق وإصدارات الهواتف</h2>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-700">
                مباشر
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-0.5">
              لوحة رقابية للأدمن لمعرفة من يعمل بالتطبيق الأصلي، أرقام الإصدارات، ومن يحتاج للتحديث.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#4f46e5]' : ''} />
            <span>تحديث</span>
          </button>

          {stats.outdatedCount > 0 && (
            <button
              onClick={handleNotifyOutdatedUsers}
              disabled={sendingBroadcast}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Send size={13} className={sendingBroadcast ? 'animate-spin' : ''} />
              <span>تنبيه أصحاب النسخ القديمة ({stats.outdatedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total App Users */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">مستخدمو التطبيق</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] flex items-center justify-center">
              <Smartphone size={17} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {stats.appUsersCount}
            </span>
            <span className="text-xs text-gray-400 font-semibold">
              من أصل {stats.totalUsers} ({stats.appAdoptionRate}%)
            </span>
          </div>
          <div className="mt-2.5 w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#4f46e5] h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.appAdoptionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Up to Date */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">محدثون لآخر إصدار</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.upToDateCount}
            </span>
            <span className="text-xs text-emerald-600/80 font-bold">
              (v{appSettings.latest_version_name})
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
            كود الإصدار: {appSettings.latest_version_code} (الأحدث)
          </p>
        </div>

        {/* Card 3: Outdated */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">بحاجة للتحديث</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={17} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.outdatedCount}
            </span>
            <span className="text-xs text-amber-600/80 font-bold">
              نسخ قديمة
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
            تصلهم نافذة التحديث التلقائي
          </p>
        </div>

        {/* Card 4: Web Only */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">متصفح ويب فقط</span>
            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center">
              <Globe size={17} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-gray-200">
              {stats.webOnlyCount}
            </span>
            <span className="text-xs text-gray-400 font-semibold">
              لم يثبتوا التطبيق
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
            تظهر لهم نافذة حث التحميل
          </p>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، البريد، أو رقم الهاتف..."
            className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:border-[#4f46e5]"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Platform Filter */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterPlatform('all')}
              className={`px-3 py-1.5 rounded-lg transition ${filterPlatform === 'all' ? 'bg-white dark:bg-gray-800 text-[#4f46e5] shadow-xs' : 'text-gray-600 dark:text-gray-400'}`}
            >
              الكل ({users.length})
            </button>
            <button
              onClick={() => setFilterPlatform('app_only')}
              className={`px-3 py-1.5 rounded-lg transition ${filterPlatform === 'app_only' ? 'bg-white dark:bg-gray-800 text-[#4f46e5] shadow-xs' : 'text-gray-600 dark:text-gray-400'}`}
            >
              التطبيق 📱 ({stats.appUsersCount})
            </button>
            <button
              onClick={() => setFilterPlatform('up_to_date')}
              className={`px-3 py-1.5 rounded-lg transition ${filterPlatform === 'up_to_date' ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-xs' : 'text-gray-600 dark:text-gray-400'}`}
            >
              محدث ({stats.upToDateCount})
            </button>
            <button
              onClick={() => setFilterPlatform('outdated')}
              className={`px-3 py-1.5 rounded-lg transition ${filterPlatform === 'outdated' ? 'bg-white dark:bg-gray-800 text-amber-600 shadow-xs' : 'text-gray-600 dark:text-gray-400'}`}
            >
              قديم ({stats.outdatedCount})
            </button>
            <button
              onClick={() => setFilterPlatform('web_only')}
              className={`px-3 py-1.5 rounded-lg transition ${filterPlatform === 'web_only' ? 'bg-white dark:bg-gray-800 text-gray-700 shadow-xs' : 'text-gray-600 dark:text-gray-400'}`}
            >
              ويب 🌐 ({stats.webOnlyCount})
            </button>
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none"
          >
            <option value="all">جميع الأدوار</option>
            <option value="merchant">التجار فقط</option>
            <option value="supplier">الموردون فقط</option>
          </select>

        </div>

      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 text-xs font-bold border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="p-4">المستخدم</th>
                <th className="p-4">الدور</th>
                <th className="p-4">الهاتف / البريد</th>
                <th className="p-4">المنصة</th>
                <th className="p-4">رقم الإصدار (Build)</th>
                <th className="p-4">حالة التحديث</th>
                <th className="p-4">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin text-[#4f46e5] mx-auto mb-2" />
                    <span>جاري تحميل بيانات المستخدمين...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400">
                    <Smartphone size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="font-bold text-gray-600 dark:text-gray-300">لا توجد نتائج مطابقة للبحث أو الفلتر</p>
                    <p className="text-xs text-gray-400 mt-1">جرّب تغيير خيارات البحث أو الفلترة بالأعلى</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const ver = user.current_app_version || 0;
                  const isApp = ver > 1;
                  const isUpToDate = ver >= appSettings.latest_version_code;
                  const isOutdated = isApp && !isUpToDate;

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-750/50 transition">
                      
                      {/* Name & Company */}
                      <td className="p-4">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {user.name || 'بدون اسم'}
                        </div>
                        {user.company_name && (
                          <div className="text-xs text-gray-400">
                            {user.company_name}
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Contact */}
                      <td className="p-4 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <Phone size={12} className="text-gray-400 shrink-0" />
                          <span dir="ltr">{user.phone || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400 mt-0.5 truncate max-w-[180px]">
                          <Mail size={12} className="shrink-0" />
                          <span>{user.email || '—'}</span>
                        </div>
                      </td>

                      {/* Platform */}
                      <td className="p-4">
                        {isApp ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-[#4f46e5] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Smartphone size={13} />
                            <span>تطبيق أندرويد</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            <Globe size={13} />
                            <span>متصفح ويب</span>
                          </span>
                        )}
                      </td>

                      {/* Version Number */}
                      <td className="p-4">
                        {isApp ? (
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-gray-800 dark:text-gray-100 text-xs">
                              Build #{ver}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {ver === appSettings.latest_version_code ? `v${appSettings.latest_version_name}` : 'إصدار سابق'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Update Status */}
                      <td className="p-4">
                        {isUpToDate ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 size={13} />
                            <span>محدّث للأخير</span>
                          </span>
                        ) : isOutdated ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle size={13} />
                            <span>يحتاج تحديث ({ver} &lt; {appSettings.latest_version_code})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            لم يثبت التطبيق بعد
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString('ar-DZ')}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2">
          <span>يتم تحديث رقم الإصدار تلقائياً بمجرد فتح المستخدم للتطبيق على هاتفه.</span>
          <span className="font-bold text-gray-700 dark:text-gray-300">
            المعروض: {filteredUsers.length} من أصل {users.length} مستخدم
          </span>
        </div>
      </div>

    </div>
  );
}
