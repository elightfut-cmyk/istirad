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
  Lightbulb,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Ban,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldAlert
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { supplierCharterService, CharterItem, DEFAULT_CHARTER_ITEMS } from '../services/supplierCharterService';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';
import { formatWhatsAppUrl } from '../utils/whatsapp';

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
  const [activeTab, setActiveTab] = useState<'requests' | 'charter'>('requests');
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

  // Revocation Modal State (إلغاء التوثيق)
  const [revokingItem, setRevokingItem] = useState<VerificationRecord | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [isProcessingRevocation, setIsProcessingRevocation] = useState(false);

  // Dynamic Charter Management State
  const [charterItems, setCharterItems] = useState<CharterItem[]>(DEFAULT_CHARTER_ITEMS);
  const [loadingCharter, setLoadingCharter] = useState(false);
  const [editingCharterItem, setEditingCharterItem] = useState<CharterItem | null>(null);
  const [isAddingCharterItem, setIsAddingCharterItem] = useState(false);
  const [charterTitleInput, setCharterTitleInput] = useState('');
  const [charterDescInput, setCharterDescInput] = useState('');
  const [isCharterSaving, setIsCharterSaving] = useState(false);

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
        fetchCharterItems();
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

  const fetchCharterItems = async () => {
    try {
      setLoadingCharter(true);
      const items = await supplierCharterService.getCharterItems(true);
      setCharterItems(items);
    } catch (err: any) {
      console.error('Error fetching charter items:', err);
    } finally {
      setLoadingCharter(false);
    }
  };

  // Filter & Search Logic for verifications
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
            title: '🎉 تم توثيق حسابك التجاري!',
            message: 'تهانينا! تمت مراجعة بياناتك بنجاح وتم اعتمادك كمورد موثق في منصة جيبها.',
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

  // Handle Revoke Verification (إلغاء التوثيق)
  const handleConfirmRevocation = async () => {
    if (!revokingItem) return;
    setIsProcessingRevocation(true);
    const toastId = toast.loading('جاري إلغاء توثيق الحساب وإشعار المورد...');

    try {
      const supplierId = revokingItem.user_id;
      const note = revocationReason.trim() || 'تم إلغاء التوثيق من قبل إدارة المنصة لمخالفة معايير الجودة.';

      // 1. Update supplier_verifications status to rejected with revocation note
      const { error: vError } = await supabase
        .from('supplier_verifications')
        .update({
          status: 'rejected',
          admin_notes: `[تم إلغاء التوثيق]: ${note}`,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser?.id || null
        })
        .eq('id', revokingItem.id);

      if (vError) throw vError;

      // 2. Reset user badge & verification status
      const { error: uError } = await supabase
        .from('users')
        .update({
          verification_badge: 'none',
          is_verified: false
        })
        .eq('id', supplierId);

      if (uError) {
        console.warn('Could not reset verification badge on users table:', uError);
      }

      // 3. Dispatch Push Notification to supplier
      try {
        await supabase.functions.invoke('send-push', {
          body: {
            userIds: [supplierId],
            title: '⚠️ تم إلغاء توثيق حسابك التجاري',
            message: `تم إلغاء توثيق حسابك في منصة جيبها للسبب التالي: ${note}. لم تعد قادراً على دخول المناقصات حتى إعادة التوثيق.`,
            data: { type: 'supplier_verification_revoked' }
          }
        });
      } catch (pushErr) {
        console.warn('Failed to send push notification to supplier:', pushErr);
      }

      // 4. Update local state
      setVerifications(prev => prev.map(item => {
        if (item.id === revokingItem.id) {
          return {
            ...item,
            status: 'rejected',
            admin_notes: `[تم إلغاء التوثيق]: ${note}`,
            user: item.user ? { ...item.user, verification_badge: 'none', is_verified: false } : undefined
          };
        }
        return item;
      }));

      toast.success(`تم إلغاء توثيق ${revokingItem.business_name} بنجاح`, { id: toastId });
      setRevokingItem(null);
      setRevocationReason('');
    } catch (err: any) {
      console.error('Revocation failed:', err);
      toast.error('حدث خطأ أثناء إلغاء التوثيق: ' + (err.message || ''), { id: toastId });
    } finally {
      setIsProcessingRevocation(false);
    }
  };

  // Charter CRUD Handlers
  const handleOpenAddCharter = () => {
    setIsAddingCharterItem(true);
    setEditingCharterItem(null);
    setCharterTitleInput('');
    setCharterDescInput('');
  };

  const handleOpenEditCharter = (item: CharterItem) => {
    setEditingCharterItem(item);
    setIsAddingCharterItem(false);
    setCharterTitleInput(item.title);
    setCharterDescInput(item.description);
  };

  const handleSaveCharterItem = async () => {
    if (!charterTitleInput.trim() || !charterDescInput.trim()) {
      toast.error('يرجى كتابة عنوان البند والشرح التوضيحي');
      return;
    }

    setIsCharterSaving(true);
    try {
      let updated: CharterItem[];
      if (editingCharterItem) {
        updated = charterItems.map(item => 
          item.id === editingCharterItem.id 
            ? { ...item, title: charterTitleInput.trim(), description: charterDescInput.trim() }
            : item
        );
      } else {
        const newItem: CharterItem = {
          id: 'charter_' + Date.now(),
          title: charterTitleInput.trim(),
          description: charterDescInput.trim(),
          isActive: true,
          order: charterItems.length + 1
        };
        updated = [...charterItems, newItem];
      }

      const res = await supplierCharterService.saveCharterItems(updated);
      if (!res.success) throw res.error;

      setCharterItems(updated);
      toast.success(editingCharterItem ? 'تم تعديل البند بنجاح' : 'تمت إضافة البند الجديد بنجاح');
      setIsAddingCharterItem(false);
      setEditingCharterItem(null);
      setCharterTitleInput('');
      setCharterDescInput('');
    } catch (err: any) {
      console.error('Error saving charter item:', err);
      toast.error('حدث خطأ أثناء حفظ البند: ' + (err.message || ''));
    } finally {
      setIsCharterSaving(false);
    }
  };

  const handleDeleteCharterItem = async (itemId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البند نهائياً من ميثاق الجودة؟')) return;
    try {
      const updated = charterItems.filter(item => item.id !== itemId);
      const res = await supplierCharterService.saveCharterItems(updated);
      if (!res.success) throw res.error;
      setCharterItems(updated);
      toast.success('تم حذف البند بنجاح');
    } catch (err: any) {
      console.error('Error deleting charter item:', err);
      toast.error('فشل في حذف البند');
    }
  };

  const handleToggleCharterActive = async (itemId: string) => {
    try {
      const updated = charterItems.map(item => 
        item.id === itemId ? { ...item, isActive: !item.isActive } : item
      );
      const res = await supplierCharterService.saveCharterItems(updated);
      if (!res.success) throw res.error;
      setCharterItems(updated);
      toast.success('تم تحديث حالة تفعيل البند');
    } catch (err: any) {
      console.error('Error toggling charter item active status:', err);
      toast.error('فشل في تعديل حالة البند');
    }
  };

  const handleResetCharterDefaults = async () => {
    if (!window.confirm('هل أنت متأكد من استعادة البنود الافتراضية الخمسة لميثاق الجودة؟ سيتم استبدال القائمة الحالية.')) return;
    try {
      const res = await supplierCharterService.saveCharterItems(DEFAULT_CHARTER_ITEMS);
      if (!res.success) throw res.error;
      setCharterItems(DEFAULT_CHARTER_ITEMS);
      toast.success('تمت استعادة البنود الافتراضية بنجاح');
    } catch (err: any) {
      console.error('Error resetting charter items:', err);
      toast.error('فشل في استعادة البنود الافتراضية');
    }
  };

  return (
    <DashboardLayout title="مراجعة وتوثيق حسابات الموردين وميثاق الجودة" sidebarLinks={sidebarLinks}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-400">
                <ShieldCheck size={24} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                توثيق الموردين وإدارة ميثاق الجودة
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              مراجعة طلبات التوثيق، إلغاء التوثيق عند المخالفة، والتحكم ببنود ميثاق الجودة التي يلتزم بها الموردون.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {activeTab === 'requests' ? (
              <button
                onClick={fetchVerifications}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition"
              >
                تحديث الطلبات 🔄
              </button>
            ) : (
              <button
                onClick={handleOpenAddCharter}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
              >
                <Plus size={16} />
                <span>إضافة بند جديد لميثاق الجودة</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher: Requests vs Quality Charter */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2.5 px-5 rounded-xl text-sm font-black transition flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
            }`}
          >
            <ShieldCheck size={18} />
            <span>طلبات توثيق الموردين</span>
            {pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === 'requests' ? 'bg-white text-indigo-700' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
              }`}>
                {pendingCount} جديد
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('charter')}
            className={`py-2.5 px-5 rounded-xl text-sm font-black transition flex items-center gap-2 ${
              activeTab === 'charter'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
            }`}
          >
            <FileCheck size={18} />
            <span>إدارة ميثاق الجودة (البنود والشروط)</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'charter' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              {charterItems.filter(i => i.isActive).length} بند نشط
            </span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: VERIFICATION REQUESTS                                        */}
        {/* =================================================================== */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
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
                  <span>المرفوضة والملغاة ({rejectedCount})</span>
                </button>

                <button
                  onClick={() => setFilterStatus('all')}
                  className={`py-2 px-3.5 rounded-lg text-xs font-black transition whitespace-nowrap ${
                    filterStatus === 'all'
                      ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  الكل ({verifications.length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم التجاري، التخصص، الهاتف..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                />
                <Search size={16} className="absolute right-3.5 top-3 text-gray-400" />
              </div>
            </div>

            {/* List / Grid of Verification Cards */}
            {loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-500 dark:text-gray-400">جاري تحميل طلبات التوثيق...</p>
              </div>
            ) : filteredVerifications.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
                <FileCheck size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">لا توجد طلبات توثيق</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">لم يتم العثور على أي نتائج مطابقة للتصفية الحالية.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {filteredVerifications.map((item) => {
                  const isApproved = item.status === 'approved';
                  const isRejected = item.status === 'rejected';
                  const isPending = item.status === 'pending';

                  return (
                    <div 
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition space-y-5"
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-400 flex items-center justify-center shrink-0 font-black">
                            <Store size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-gray-900 dark:text-white">
                                {item.business_name}
                              </h3>
                              {item.user?.verification_badge && item.user.verification_badge !== 'none' && (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  item.user.verification_badge === 'platinum' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                                  item.user.verification_badge === 'gold' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                  'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                }`}>
                                  <BadgeCheck size={12} />
                                  شارة {item.user.verification_badge.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {item.specialty} • {item.location}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 self-start">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                            isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            isRejected ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {isApproved && <CheckCircle2 size={13} />}
                            {isRejected && <XCircle size={13} />}
                            {isPending && <Clock size={13} />}
                            <span>{isApproved ? 'موثق ومعتمد' : isRejected ? 'مرفوض / ملغى' : 'قيد المراجعة'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Body - Grid Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700/60">
                          <span className="text-gray-400 block mb-1">صاحب الحساب / الهاتف</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200 block">
                            {item.user?.name || 'غير محدد'}
                          </span>
                          {item.user?.phone ? (
                            <a
                              href={formatWhatsAppUrl(item.user.phone, `السلام عليكم ${item.business_name || item.user.name}، بخصوص طلب توثيق حسابكم كمورد في منصة جيبها`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold font-mono text-[11px] mt-1 group"
                              title={`مراسلة المورد عبر واتساب (${item.user.phone})`}
                            >
                              <WhatsAppIcon size={12} className="text-[#25D366] group-hover:scale-110 transition-transform" />
                              <span dir="ltr">{item.user.phone}</span>
                            </a>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                              {item.user?.email || '-'}
                            </span>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700/60">
                          <span className="text-gray-400 block mb-1">سرعة التجهيز والشحن</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200 block">
                            {item.prep_time}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700/60">
                          <span className="text-gray-400 block mb-1">ميثاق جودة الخدمة</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            وافق على جميع بنود الميثاق
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700/60">
                          <span className="text-gray-400 block mb-1">تاريخ إرسال الطلب</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200 block font-mono">
                            {new Date(item.created_at).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                          </span>
                        </div>
                      </div>

                      {/* Social Links if any */}
                      {item.social_links && (
                        <div className="text-xs flex items-center gap-2 text-gray-600 dark:text-gray-300 bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                          <ExternalLink size={14} className="text-indigo-500 shrink-0" />
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">روابط السوشيال:</span>
                          <span className="truncate">{item.social_links}</span>
                        </div>
                      )}

                      {/* Images of Store / Goods */}
                      {item.images && item.images.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">
                            صور المحل، المخزن الفعلي والبضاعة ({item.images.length}):
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                            {item.images.map((imgUrl, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => setPreviewImage(imgUrl)}
                                className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 cursor-pointer shadow-2xs"
                              >
                                <img 
                                  src={imgUrl} 
                                  alt={`Document ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                  <Eye size={18} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin Notes if present */}
                      {item.admin_notes && (
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-750 text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                          <strong className="font-bold text-gray-800 dark:text-white">ملاحظات الإدارة: </strong>
                          <span>{item.admin_notes}</span>
                        </div>
                      )}

                      {/* Actions Footer */}
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-[11px] text-gray-400">
                          معرّف المورد: <span className="font-mono">{item.user_id.slice(0, 8)}...</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
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
                          ) : isApproved ? (
                            <>
                              {/* زر إلغاء التوثيق المطلوب من المستخدم */}
                              <button
                                onClick={() => {
                                  setRevokingItem(item);
                                  setRevocationReason('');
                                }}
                                className="py-2 px-4 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 transition flex items-center gap-1.5"
                                title="إلغاء التوثيق وسحب الشارة وإشعار المورد"
                              >
                                <Ban size={15} />
                                <span>إلغاء التوثيق</span>
                              </button>

                              <button
                                onClick={() => setApprovingItem(item)}
                                className="py-2 px-4 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5"
                              >
                                <BadgeCheck size={15} />
                                <span>تعديل الشارة</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setApprovingItem(item)}
                              className="py-2 px-4 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1.5"
                            >
                              <RotateCcw size={15} />
                              <span>إعادة اعتماد التوثيق</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: QUALITY CHARTER MANAGEMENT (صفحة بنود ميثاق الجودة للأدمن)   */}
        {/* =================================================================== */}
        {activeTab === 'charter' && (
          <div className="space-y-6">
            {/* Charter Introduction Banner */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-black text-indigo-950 dark:text-indigo-200">
                    ميثاق جودة الخدمة والالتزامات للموردين
                  </h3>
                </div>
                <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 max-w-2xl leading-relaxed">
                  هذه البنود تظهر تلقائياً لكل مورد في صفحة التوثيق، ويُشترط عليه الموافقة عليها بالكامل قبل إرسال طلبه. يمكنك إضافة أي بنود جديدة أو تعديل وحذف البنود القائمة بكل حرية.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleResetCharterDefaults}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 border border-gray-200 dark:border-gray-700 transition flex items-center gap-1.5"
                  title="استعادة البنود الأصلية الخمسة"
                >
                  <RotateCcw size={14} />
                  <span>استعادة الافتراضي</span>
                </button>

                <button
                  onClick={handleOpenAddCharter}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>إضافة بند جديد</span>
                </button>
              </div>
            </div>

            {/* List of Charter Items */}
            {loadingCharter ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-500">جاري تحميل بنود الميثاق...</p>
              </div>
            ) : charterItems.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
                <FileCheck size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">لا توجد بنود حالياً</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">انقر على الزر أدناه لإضافة أول بند أو استعادة البنود الافتراضية.</p>
                <button
                  onClick={handleResetCharterDefaults}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                >
                  استعادة البنود الافتراضية 🔄
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {charterItems.map((item, index) => {
                  const isActive = item.isActive !== false;

                  return (
                    <div 
                      key={item.id}
                      className={`p-5 rounded-2xl border transition bg-white dark:bg-gray-800 ${
                        isActive 
                          ? 'border-gray-200 dark:border-gray-700 shadow-xs' 
                          : 'border-dashed border-gray-300 dark:border-gray-700 opacity-60 bg-gray-50 dark:bg-gray-850'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                            isActive 
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-gray-900 dark:text-white">
                                {item.title}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {isActive ? 'مفعل ويظهر للمورد' : 'معطل مؤقتاً'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleCharterActive(item.id)}
                            className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              isActive 
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                            title={isActive ? 'تعطيل هذا البند مؤقتاً' : 'تفعيل هذا البند'}
                          >
                            {isActive ? <ToggleRight size={18} className="text-emerald-600" /> : <ToggleLeft size={18} />}
                            <span className="text-[11px]">{isActive ? 'مفعل' : 'معطل'}</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditCharter(item)}
                            className="p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
                            title="تعديل نص البند"
                          >
                            <Edit2 size={16} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteCharterItem(item.id)}
                            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition"
                            title="حذف البند نهائياً"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                  <span>اعتماد وتوثيق المورد</span>
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
                  سيتم تفعيل شارة الموثوقية لحسابه وإتاحة دخول المناقصات وتقديم العروض.
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
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      selectedBadge === 'blue' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <BadgeCheck size={20} className="text-blue-500" />
                    <span className="text-[11px] font-black">شارة زرقاء (أساسي)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBadge('gold')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      selectedBadge === 'gold' 
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-xs' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <BadgeCheck size={20} className="text-amber-500" />
                    <span className="text-[11px] font-black">شارة ذهبية (مميز)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBadge('platinum')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      selectedBadge === 'platinum' 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-xs' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <BadgeCheck size={20} className="text-purple-500" />
                    <span className="text-[11px] font-black">بلاتيني (VIP)</span>
                  </button>
                </div>
              </div>

              {/* Note input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  ملاحظات الاعتماد (تظهر للمورد في حسابه):
                </label>
                <textarea
                  rows={2}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="مثال: تم تدقيق السجل التجاري والمخزن واعتماد الحساب..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
        {/* Modal: Revoke Supplier Verification (إلغاء التوثيق)                  */}
        {/* =================================================================== */}
        {revokingItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-base">
                  <ShieldAlert size={20} />
                  <span>إلغاء توثيق المورد</span>
                </div>
                <button
                  onClick={() => setRevokingItem(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-800 dark:text-red-300 leading-relaxed">
                <strong>تحذير:</strong> أنت على وشك إلغاء شارة التوثيق للمورد: <strong className="underline">{revokingItem.business_name}</strong>. سيؤدي هذا إلى منعه من المشاركة في المناقصات حتى يصحح وضعه.
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  سبب إلغاء التوثيق <span className="text-red-500">*</span> (سيتم إرساله كإشعار فوري للمورد):
                </label>
                <textarea
                  rows={3}
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  placeholder="مثال: مخالفة بند مطابقة الوصف، أو تلقي شكاوى متكررة من التجار بخصوص تأخر الشحن..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setRevokingItem(null)}
                  disabled={isProcessingRevocation}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRevocation}
                  disabled={isProcessingRevocation || !revocationReason.trim()}
                  className={`py-2 px-5 rounded-xl text-xs font-black text-white shadow-xs flex items-center gap-1.5 ${
                    revocationReason.trim() ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                  }`}
                >
                  {isProcessingRevocation ? 'جاري الإلغاء...' : 'تأكيد إلغاء التوثيق'}
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

        {/* =================================================================== */}
        {/* Modal: Add or Edit Charter Item (إضافة / تعديل بند ميثاق الجودة)    */}
        {/* =================================================================== */}
        {(isAddingCharterItem || editingCharterItem) && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 border border-gray-100 dark:border-gray-700 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-base">
                  <FileCheck size={20} />
                  <span>{editingCharterItem ? 'تعديل بند في ميثاق الجودة' : 'إضافة بند جديد لميثاق الجودة'}</span>
                </div>
                <button
                  onClick={() => {
                    setIsAddingCharterItem(false);
                    setEditingCharterItem(null);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  عنوان البند <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  value={charterTitleInput}
                  onChange={(e) => setCharterTitleInput(e.target.value)}
                  placeholder="مثال: الالتزام بالفحص والتغليف المحكم"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  الشرح التوضيحي للالتزام <span className="text-red-500">*</span>:
                </label>
                <textarea
                  rows={4}
                  value={charterDescInput}
                  onChange={(e) => setCharterDescInput(e.target.value)}
                  placeholder="اشرح بدقة ما يلتزم به المورد أمام التاجر والمنصة بخصوص هذا البند..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCharterItem(false);
                    setEditingCharterItem(null);
                  }}
                  disabled={isCharterSaving}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveCharterItem}
                  disabled={isCharterSaving || !charterTitleInput.trim() || !charterDescInput.trim()}
                  className={`py-2 px-5 rounded-xl text-xs font-black text-white shadow-xs flex items-center gap-1.5 ${
                    charterTitleInput.trim() && charterDescInput.trim() 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                  }`}
                >
                  {isCharterSaving ? 'جاري الحفظ...' : editingCharterItem ? 'تحديث البند' : 'إضافة البند الآن'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
