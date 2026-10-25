import { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Eye, 
  X, 
  Store, 
  FileCheck, 
  AlertTriangle, 
  BadgeCheck,
  LayoutDashboard,
  Users,
  ShoppingBag,
  Ticket,
  MessageSquare,
  Video,
  FileText,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

interface VerificationRecord {
  id: string;
  user_id: string;
  business_name: string;
  specialty: string;
  location: string;
  prep_time: string;
  social_links?: string | null;
  images: string[];
  charter_agreed: boolean;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company_name?: string;
    verification_badge?: string;
    status?: string;
    created_at?: string;
  };
}

export default function AdminSupplierVerifications() {
  const { user: adminUser } = useAuthStore();
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const fetchedAdminIdRef = useRef<string | null>(null);

  // Lightbox Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Approval Modal State
  const [approvingItem, setApprovingItem] = useState<VerificationRecord | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<'blue' | 'gold' | 'platinum'>('blue');
  const [approvalNote, setApprovalNote] = useState('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Rejection Modal State
  const [rejectingItem, setRejectingItem] = useState<VerificationRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingRejection, setIsProcessingRejection] = useState(false);

  const sidebarLinks = [
    { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
    { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
    { label: 'توثيقات الموردين', href: '/admin/verifications', icon: <ShieldCheck size={20} /> },
    { label: 'الطلبات والمناقصات', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
    { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
    { label: 'التنبيهات والإشعارات', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
    { label: 'الصفحات', href: '/admin/pages', icon: <FileText size={20} /> },
    { label: 'الأسئلة الشائعة', href: '/admin/faqs', icon: <HelpCircle size={20} /> },
    { label: 'الشكاوى', href: '/admin/complaints', icon: <AlertTriangle size={20} /> },
    { label: 'الاقتراحات', href: '/admin/suggestions', icon: <Lightbulb size={20} /> },
    { label: 'فيديو الرئيسية', href: '/admin/main-video', icon: <Video size={20} /> },
  ];

  useEffect(() => {
    if (adminUser?.id) {
      if (fetchedAdminIdRef.current !== adminUser.id) {
        fetchedAdminIdRef.current = adminUser.id;
        fetchVerifications();
      }
    }
  }, [adminUser?.id]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_verifications')
        .select(`
          *,
          user:users!user_id(
            id,
            name,
            email,
            phone,
            company_name,
            verification_badge,
            status,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerifications((data as any) || []);
    } catch (err: any) {
      console.error('Error fetching verifications:', err);
      toast.error('فشل في جلب طلبات التوثيق: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // Filter & Search Logic
  const filteredVerifications = verifications.filter((v) => {
    const matchesStatus = filterStatus === 'all' ? true : v.status === filterStatus;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesStatus;

    const matchesQuery = 
      (v.business_name && v.business_name.toLowerCase().includes(query)) ||
      (v.specialty && v.specialty.toLowerCase().includes(query)) ||
      (v.location && v.location.toLowerCase().includes(query)) ||
      (v.user?.name && v.user.name.toLowerCase().includes(query)) ||
      (v.user?.email && v.user.email.toLowerCase().includes(query)) ||
      (v.user?.phone && v.user.phone.toLowerCase().includes(query));

    return matchesStatus && matchesQuery;
  });

  const pendingCount = verifications.filter(v => v.status === 'pending').length;
  const approvedCount = verifications.filter(v => v.status === 'approved').length;
  const rejectedCount = verifications.filter(v => v.status === 'rejected').length;

  // Handle Approve Action
  const handleConfirmApproval = async () => {
    if (!approvingItem) return;
    setIsProcessingApproval(true);
    const toastId = toast.loading('جاري اعتماد وتوثيق الحساب...');

    try {
      const supplierId = approvingItem.user_id;

      // 1. Update supplier_verifications table
      const { error: vError } = await supabase
        .from('supplier_verifications')
        .update({
          status: 'approved',
          admin_notes: approvalNote.trim() || 'تم التحقق وتوثيق الحساب بنجاح',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser?.id || null
        })
        .eq('id', approvingItem.id);

      if (vError) throw vError;

      // 2. Update users table with verified badge and active status
      const { error: uError } = await supabase
        .from('users')
        .update({
          verification_badge: selectedBadge,
          is_verified: true,
          status: 'active'
        })
        .eq('id', supplierId);

      if (uError) {
        console.warn('Could not update users table badge:', uError);
      }

      // 3. Dispatch Push Notification via Cloud Function
      try {
        await supabase.functions.invoke('send-push', {
          body: {
            userIds: [supplierId],
            title: '🎉 تم توثيق حسابك!',
            message: 'تمت مراجعة طلبك وقبوله. حسابك الآن مفعل كمورد معتمد في منصة جيبها.',
            data: { type: 'supplier_verification_approved' }
          }
        });
      } catch (pushErr) {
        console.warn('Failed to send push notification to supplier:', pushErr);
      }

      // 4. Update local state
      setVerifications(prev => prev.map(item => {
        if (item.id === approvingItem.id) {
          return {
            ...item,
            status: 'approved',
            admin_notes: approvalNote.trim() || 'تم التحقق وتوثيق الحساب بنجاح',
            user: item.user ? { ...item.user, verification_badge: selectedBadge, status: 'active' } : undefined
          };
        }
        return item;
      }));

      toast.success(`تم توثيق المورد ${approvingItem.business_name} بنجاح!`, { id: toastId });
      setApprovingItem(null);
      setApprovalNote('');
    } catch (err: any) {
      console.error('Approval failed:', err);
      toast.error('حدث خطأ أثناء الاعتماد: ' + (err.message || ''), { id: toastId });
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // Handle Reject Action
  const handleConfirmRejection = async () => {
    if (!rejectingItem) return;
    setIsProcessingRejection(true);
    const toastId = toast.loading('جاري رفض الطلب وإشعار المورد...');

    try {
      const supplierId = rejectingItem.user_id;
      const note = rejectionReason.trim() || 'نعتذر، لم تستوفِ البيانات المعايير المطلوبة للتوثيق.';

      // 1. Update supplier_verifications status
      const { error: vError } = await supabase
        .from('supplier_verifications')
        .update({
          status: 'rejected',
          admin_notes: note,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser?.id || null
        })
        .eq('id', rejectingItem.id);

      if (vError) throw vError;

      // 2. Dispatch push notification to supplier
      try {
        await supabase.functions.invoke('send-push', {
          body: {
            userIds: [supplierId],
            title: '⚠️ بخصوص طلب توثيق حسابك',
            message: `نعتذر، لم يتم قبول طلب التوثيق للسبب التالي: ${note}. يمكنك تعديل بياناتك وإعادة التقديم.`,
            data: { type: 'supplier_verification_rejected' }
          }
        });
      } catch (pushErr) {
        console.warn('Failed to send rejection push:', pushErr);
      }

      // 3. Update local state
      setVerifications(prev => prev.map(item => {
        if (item.id === rejectingItem.id) {
          return {
            ...item,
            status: 'rejected',
            admin_notes: note
          };
        }
        return item;
      }));

      toast.success('تم رفض الطلب وإشعار المورد بالملاحظات', { id: toastId });
      setRejectingItem(null);
      setRejectionReason('');
    } catch (err: any) {
      console.error('Rejection failed:', err);
      toast.error('حدث خطأ أثناء الرفض: ' + (err.message || ''), { id: toastId });
    } finally {
      setIsProcessingRejection(false);
    }
  };

  return (
    <DashboardLayout title="مراجعة وتوثيق حسابات الموردين" sidebarLinks={sidebarLinks}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-400">
                <ShieldCheck size={24} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                طلبات توثيق الموردين وميثاق الجودة
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              مراجعة بيانات الأنشطة التجارية للموردين، التحقق من المخازن، وتفعيل شارة الاعتماد الرسمية.
            </p>
          </div>

          <button
            onClick={fetchVerifications}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition"
          >
            تحديث القائمة 🔄
          </button>
        </div>

        {/* Stats & Filter Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`py-2 px-3.5 rounded-lg text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
                filterStatus === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Clock size={14} />
              <span>قيد الانتظار</span>
              {pendingCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  filterStatus === 'pending' ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterStatus('approved')}
              className={`py-2 px-3.5 rounded-lg text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
                filterStatus === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>المعتمدة ({approvedCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus('rejected')}
              className={`py-2 px-3.5 rounded-lg text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
                filterStatus === 'rejected'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <XCircle size={14} />
              <span>المرفوضة ({rejectedCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus('all')}
              className={`py-2 px-3.5 rounded-lg text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
                filterStatus === 'all'
                  ? 'bg-gray-800 dark:bg-gray-700 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>الكل ({verifications.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم التجاري، المورد، التخصص..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
            />
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse">
            <Clock size={40} className="mx-auto text-indigo-500 mb-3 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 font-bold">جاري تحميل طلبات التوثيق...</p>
          </div>
        ) : filteredVerifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
            <ShieldCheck size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-1">لا توجد طلبات توثيق تطابق الفلتر الحالي</h3>
            <p className="text-xs text-gray-400">أي طلبات جديدة يقدمها الموردون ستظهر هنا فورياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredVerifications.map((item) => {
              const isPending = item.status === 'pending';
              const isApproved = item.status === 'approved';
              const isRejected = item.status === 'rejected';

              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border transition-all shadow-xs ${
                    isPending 
                      ? 'border-amber-300 dark:border-amber-900/60' 
                      : isApproved 
                        ? 'border-emerald-200 dark:border-emerald-900/40' 
                        : 'border-red-200 dark:border-red-900/40'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-black shrink-0">
                        <Store size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                            {item.business_name}
                          </h3>
                          {item.user?.verification_badge && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                              <BadgeCheck size={14} />
                              <span>شارة {item.user.verification_badge}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>المورد: <strong className="text-gray-800 dark:text-gray-200">{item.user?.name || 'غير معروف'}</strong></span>
                          <span>•</span>
                          <span>{item.user?.email}</span>
                          {item.user?.phone && (
                            <>
                              <span>•</span>
                              <span dir="ltr">{item.user.phone}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="self-start sm:self-auto">
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock size={13} />
                          <span>قيد المراجعة</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={13} />
                          <span>موثّق ومعتمد</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                          <XCircle size={13} />
                          <span>مرفوض</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4 text-xs">
                    <div className="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-750">
                      <span className="text-gray-400 block mb-0.5">مجال التخصص</span>
                      <strong className="text-gray-900 dark:text-white font-bold text-xs">{item.specialty}</strong>
                    </div>

                    <div className="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-750">
                      <span className="text-gray-400 block mb-0.5">الموقع الفعلي للمخزن</span>
                      <strong className="text-gray-900 dark:text-white font-bold text-xs">{item.location}</strong>
                    </div>

                    <div className="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-750">
                      <span className="text-gray-400 block mb-0.5">الوقت المعتاد للتجهيز</span>
                      <strong className="text-gray-900 dark:text-white font-bold text-xs">{item.prep_time}</strong>
                    </div>

                    <div className="bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-750">
                      <span className="text-gray-400 block mb-0.5">تاريخ التقديم</span>
                      <strong className="text-gray-900 dark:text-white font-bold text-xs">
                        {new Date(item.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </strong>
                    </div>
                  </div>

                  {/* Social Links & Quality Charter Agreement */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-gray-50 dark:bg-gray-900/30 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <FileCheck size={16} className="text-emerald-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-300">ميثاق جودة الخدمة:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        ✅ وافق على كامل البنود الـ 5
                      </span>
                    </div>

                    {item.social_links && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">السوشيال ميديا:</span>
                        <a
                          href={item.social_links.startsWith('http') ? item.social_links : `https://${item.social_links}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4f46e5] dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <span>{item.social_links}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Photos Showcase */}
                  {item.images && item.images.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          صور المخزن والبضاعة المتوفرة ({item.images.length} صور):
                        </span>
                        <span className="text-[11px] text-gray-400">اضغط على أي صورة لتكبيرها</span>
                      </div>
                      <div className="flex items-center gap-3 overflow-x-auto pb-2">
                        {item.images.map((imgUrl, imgIdx) => (
                          <button
                            key={imgIdx}
                            type="button"
                            onClick={() => setPreviewImage(imgUrl)}
                            className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0 bg-gray-100"
                          >
                            <img src={imgUrl} alt={`Photo ${imgIdx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition duration-200" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={18} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Notes if rejected/approved */}
                  {item.admin_notes && (
                    <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                      <strong className="font-bold text-gray-800 dark:text-white">ملاحظات الإدارة: </strong>
                      <span>{item.admin_notes}</span>
                    </div>
                  )}

                  {/* Action Buttons for Pending or Re-evaluating */}
                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-end gap-3">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => setRejectingItem(item)}
                          className="py-2 px-4 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 transition flex items-center gap-1.5"
                        >
                          <XCircle size={15} />
                          <span>رفض الطلب</span>
                        </button>

                        <button
                          onClick={() => setApprovingItem(item)}
                          className="py-2 px-5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white shadow-xs transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={15} />
                          <span>قبول وتوثيق المورد ✅</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setApprovingItem(item)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                        >
                          تعديل التوثيق أو الشارة
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =================================================================== */}
        {/* Modal: Fullscreen Image Preview Lightbox                             */}
        {/* =================================================================== */}
        {previewImage && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-[90vh]">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 left-0 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition"
                title="إغلاق"
              >
                <X size={20} />
              </button>
              <img
                src={previewImage}
                alt="Enlarged document"
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/10"
              />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* Modal: Approve Supplier Verification                                */}
        {/* =================================================================== */}
        {approvingItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 shadow-2xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-base">
                  <CheckCircle2 size={20} />
                  <span>قبول وتوثيق المورد</span>
                </div>
                <button
                  onClick={() => setApprovingItem(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  أنت على وشك اعتماد وتوثيق المورد: <strong className="text-gray-900 dark:text-white">{approvingItem.business_name}</strong>.
                  سيتم تفعيل شارة الموثوقية لحسابه وإرسال إشعار فوري له عبر التطبيق.
                </p>
              </div>

              {/* Badge Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  اختر شارة التوثيق المناسبة:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBadge('blue')}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      selectedBadge === 'blue' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <BadgeCheck size={20} className="mx-auto text-blue-500 mb-1" />
                    <span className="text-[11px] block">شارة زرقاء (أساسي)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBadge('gold')}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      selectedBadge === 'gold' 
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-black' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <BadgeCheck size={20} className="mx-auto text-amber-500 mb-1" />
                    <span className="text-[11px] block">شارة ذهبية (VIP)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBadge('platinum')}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      selectedBadge === 'platinum' 
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-black' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <BadgeCheck size={20} className="mx-auto text-cyan-500 mb-1" />
                    <span className="text-[11px] block">بلاتينية (شريك)</span>
                  </button>
                </div>
              </div>

              {/* Note / Comment */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  ملاحظة للمورد (اختياري):
                </label>
                <input
                  type="text"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="مثال: مرحباً بك كمورد معتمد في المنصة"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setApprovingItem(null)}
                  disabled={isProcessingApproval}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  disabled={isProcessingApproval}
                  className="py-2 px-5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5"
                >
                  {isProcessingApproval ? 'جاري التوثيق...' : 'تأكيد التوثيق الآن'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* Modal: Reject Verification                                          */}
        {/* =================================================================== */}
        {rejectingItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-base">
                  <XCircle size={20} />
                  <span>رفض طلب التوثيق</span>
                </div>
                <button
                  onClick={() => setRejectingItem(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                يرجى كتابة سبب الرفض لتوجيه المورد: <strong className="text-gray-900 dark:text-white">{rejectingItem.business_name}</strong> لتصحيح النقص وإعادة إرسال الطلب.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  سبب الرفض والملاحظات <span className="text-red-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="مثال: يرجى رفع صور واضحة لمخزن البضاعة الفعلي، أو التأكد من إدخال العنوان الدقيق..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  disabled={isProcessingRejection}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  disabled={isProcessingRejection || !rejectionReason.trim()}
                  className={`py-2 px-5 rounded-xl text-xs font-black text-white shadow-xs flex items-center gap-1.5 ${
                    rejectionReason.trim() ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                  }`}
                >
                  {isProcessingRejection ? 'جاري الرفض...' : 'تأكيد الرفض وإشعار المورد'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
