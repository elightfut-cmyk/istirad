import { useState, useEffect } from 'react';
import { Users, Link as LinkIcon, Copy, CheckCircle2, LayoutDashboard, Store, Package, CreditCard, Heart } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function MerchantReferrals() {
  const { user } = useAuthStore();
  const { formatCurrency } = useSettingsStore();
  const [copied, setCopied] = useState(false);
  
  const [stats, setStats] = useState({
    totalReferred: 0,
    totalCommissions: 0,
  });
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}/register?ref=${user?.id}`;

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    try {
      // Fetch referred users
      const { data: referredUsers, error: usersError } = await supabase
        .from('users')
        .select('id, name, company_name, created_at, role, has_made_first_order')
        .eq('referred_by', user?.id)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch total commissions from wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallet_transactions')
        .select('amount, description')
        .eq('merchant_id', user?.id)
        .eq('type', 'deposit')
        .ilike('description', '%عمولة إحالة%');

      if (walletError) throw walletError;

      const totalCommissions = walletData ? walletData.reduce((acc, curr) => acc + curr.amount, 0) : 0;

      setStats({
        totalReferred: referredUsers ? referredUsers.length : 0,
        totalCommissions,
      });
      setReferralsList(referredUsers || []);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout
      title="نظام الإحالة"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/merchant', icon: <LayoutDashboard size={20} /> },
        { label: 'تصفح المنتجات', href: '/merchant/marketplace', icon: <Store size={20} /> },
        { label: 'طلباتي', href: '/merchant/orders', icon: <Package size={20} /> },
        { label: 'المحفظة', href: '/merchant/wallet', icon: <CreditCard size={20} /> },
        { label: 'نظام الإحالة', href: '/merchant/referrals', icon: <Users size={20} /> },
        { label: 'المفضلة', href: '/merchant/wishlist', icon: <Heart size={20} /> },
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#4f46e5] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <h3 className="text-green-100 text-sm font-medium">إجمالي الأرباح من الإحالات</h3>
          <p className="text-4xl font-black mt-2">{formatCurrency(stats.totalCommissions)}</p>
          <div className="mt-4 text-green-100 text-sm">تُضاف الأرباح مباشرة إلى محفظتك المالية</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-gray-500 text-sm font-medium">إجمالي المدعوين</h3>
              <p className="text-4xl font-bold mt-2 text-gray-800">{stats.totalReferred}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl text-blue-600">
              <Users size={32} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">رابط الدعوة الخاص بك</h2>
        <p className="text-gray-500 text-sm mb-6">
          شارك هذا الرابط مع أشخاص آخرين لدعوتهم للتسجيل. ستحصل على مكافأة قدرها <strong>2000 دج</strong> لمرة واحدة عندما يقوم الشخص الذي دعوته بإتمام أول طلب له بنجاح. يمكنك دعوة عدد غير محدود من الأشخاص وكسب 2000 دج عن كل شخص!
        </p>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-600 text-sm overflow-x-auto">
            <LinkIcon size={16} className="mr-2 flex-shrink-0 text-gray-400" />
            {referralLink}
          </div>
          <button 
            onClick={handleCopy}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${
              copied ? 'bg-green-100 text-green-700' : 'bg-[#4f46e5] text-white hover:bg-[#4338ca]'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle2 size={20} />
                تم النسخ
              </>
            ) : (
              <>
                <Copy size={20} />
                نسخ الرابط
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">سجل المدعوين</h2>
        {loading ? (
          <div className="text-center py-12 text-gray-500">جاري تحميل السجل...</div>
        ) : referralsList.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p>لم تقم بدعوة أي شخص بعد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-sm">
                  <th className="pb-4 font-medium">اسم المستخدم / المتجر</th>
                  <th className="pb-4 font-medium">النوع</th>
                  <th className="pb-4 font-medium">تاريخ التسجيل</th>
                  <th className="pb-4 font-medium">حالة العمولة</th>
                </tr>
              </thead>
              <tbody>
                {referralsList.map((refUser) => (
                  <tr key={refUser.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-gray-900">{refUser.name}</div>
                      <div className="text-xs text-gray-500">{refUser.company_name}</div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        refUser.role === 'merchant' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {refUser.role === 'merchant' ? 'تاجر' : 'مورد'}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-600">
                      {new Date(refUser.created_at).toLocaleDateString('ar-MA')}
                    </td>
                    <td className="py-4">
                      {refUser.has_made_first_order ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-md">
                          <CheckCircle2 size={14} /> تم احتساب العمولة
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs font-medium">
                          في انتظار الطلب الأول
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
