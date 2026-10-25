import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Store, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileCheck, 
  Trash2, 
  ExternalLink, 
  X, 
  Sparkles, 
  LayoutDashboard, 
  Package, 
  Gavel, 
  ShoppingBag, 
  DollarSign, 
  Award, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { supplierCharterService, CharterItem } from '../services/supplierCharterService';

export default function SupplierVerification() {
  const { user } = useAuthStore();
  
  // Loading & existing request states
  const [loading, setLoading] = useState(true);
  const [existingVerification, setExistingVerification] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fetchedUserIdRef = useRef<string | null>(null);

  // Form Fields - Section 1: Business Details
  const [businessName, setBusinessName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [prepTime, setPrepTime] = useState('خلال 24 ساعة');
  const [socialLinks, setSocialLinks] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Section 2: Dynamic Quality Charter Checklist
  const [charterItems, setCharterItems] = useState<CharterItem[]>([]);
  const [agreedCharterIds, setAgreedCharterIds] = useState<Record<string, boolean>>({});

  const activeCharterItems = charterItems.filter(item => item.isActive !== false);
  const allCharterAgreed = 
    activeCharterItems.length > 0 && 
    activeCharterItems.every(item => Boolean(agreedCharterIds[item.id]));

  const toggleCharterItem = (id: string) => {
    setAgreedCharterIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const sidebarLinks = [
    { label: 'الرئيسية', href: '/supplier', icon: <LayoutDashboard size={20} /> },
    { label: 'منتجاتي', href: '/supplier/products', icon: <Package size={20} /> },
    { label: 'سوق الطلبات', href: '/supplier/requests', icon: <Gavel size={20} /> },
    { label: 'الطلبات الواردة', href: '/supplier/orders', icon: <ShoppingBag size={20} /> },
    { label: 'التقارير المالية', href: '/supplier/financials', icon: <DollarSign size={20} /> },
    { label: 'بروفايلي وتقييماتي', href: '/supplier/profile', icon: <Award size={20} /> },
    { label: 'توثيق الحساب', href: '/supplier/verification', icon: <ShieldCheck size={20} /> },
  ];

  useEffect(() => {
    if (user?.id) {
      if (fetchedUserIdRef.current !== user.id) {
        fetchedUserIdRef.current = user.id;
        fetchExistingVerification();
      }
    }
  }, [user?.id]);

  const fetchExistingVerification = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_verifications')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching verification:', error);
      }

      const items = await supplierCharterService.getCharterItems();
      setCharterItems(items);

      if (data) {
        setExistingVerification(data);
        setBusinessName(data.business_name || user.company_name || '');
        setSpecialty(data.specialty || '');
        setLocation(data.location || user.address || '');
        setPrepTime(data.prep_time || 'خلال 24 ساعة');
        setSocialLinks(data.social_links || '');
        setImages(data.images || []);
        if (data.charter_agreed) {
          const agreedMap: Record<string, boolean> = {};
          items.forEach(it => { agreedMap[it.id] = true; });
          setAgreedCharterIds(agreedMap);
        }
      } else {
        // Pre-fill from profile
        if (user.company_name) setBusinessName(user.company_name);
        if (user.address) setLocation(user.address);
      }
    } catch (err) {
      console.error('Verification query exception:', err);
    } finally {
      setLoading(false);
    }
  };

  // Image Upload handler (Cloudinary preset jiibha with compression)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 6) {
      toast.error('الحد الأقصى المسموح به هو 6 صور للمخزن والبضاعة');
      return;
    }

    setUploadingImage(true);
    const toastId = toast.loading('جاري ضغط ورفع الصور...');

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const options = {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);

        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', 'jiibha');

        const res = await fetch('https://api.cloudinary.com/v1_1/xvhtji4c/image/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`فشل رفع الصورة: ${file.name}`);
        }

        const data = await res.json();
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      }

      setImages(prev => [...prev, ...uploadedUrls]);
      toast.success('تم رفع الصور بنجاح', { id: toastId });
    } catch (err: any) {
      console.error('Image upload error:', err);
      toast.error(err.message || 'حدث خطأ أثناء رفع الصور', { id: toastId });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!businessName.trim()) {
      toast.error('يرجى إدخال الاسم التجاري أو اسم المؤسسة');
      return;
    }

    if (!specialty.trim()) {
      toast.error('يرجى تحديد مجال التخصص');
      return;
    }

    if (!location.trim()) {
      toast.error('يرجى إدخال الولاية / البلدية وموقع النشاط');
      return;
    }

    if (!allCharterAgreed) {
      toast.error('يجب الموافقة على جميع بنود ميثاق جودة الخدمة للمتابعة');
      return;
    }

    setSubmitting(true);
    const saveToast = toast.loading('جاري حفظ طلب التوثيق وإشعار الإدارة...');

    try {
      const payload = {
        user_id: user.id,
        business_name: businessName.trim(),
        specialty: specialty.trim(),
        location: location.trim(),
        prep_time: prepTime.trim(),
        social_links: socialLinks.trim() || null,
        images: images,
        charter_agreed: true,
        status: 'pending',
        admin_notes: null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('supplier_verifications')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      // Notify administration via send-push Edge Function
      try {
        await supabase.functions.invoke('send-push', {
          body: {
            targetRole: 'admin',
            title: '📝 طلب توثيق مورد جديد',
            message: `المورد ${businessName.trim()} أرسل طلب توثيق وموافقة على الميثاق. يرجى المراجعة.`,
            data: { type: 'supplier_verification_pending', userId: user.id }
          }
        });
      } catch (pushErr) {
        console.warn('Could not dispatch push notification to admin:', pushErr);
      }

      setExistingVerification(data);
      setIsEditing(false);
      toast.success('تم إرسال طلب التوثيق بنجاح! طلبك قيد المراجعة الآن.', { id: saveToast });
    } catch (err: any) {
      console.error('Error submitting verification:', err);
      toast.error('حدث خطأ أثناء حفظ الطلب: ' + (err.message || ''), { id: saveToast });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="توثيق حساب المورد" sidebarLinks={sidebarLinks}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold mb-3 border border-white/20">
              <Sparkles size={14} className="text-yellow-300" />
              <span>شارة المورد المعتمد • منصة جيبها</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mb-2">توثيق الحساب وميثاق جودة الخدمة</h1>
            <p className="text-sm sm:text-base text-blue-100 max-w-2xl leading-relaxed">
              وثّق حسابك التجاري لتحصل على الشارة المعتمدة، أسبقية ظهور منتجاتك وعروضك للتجار، وزيادة الثقة والمبيعات في المنصة.
            </p>
          </div>
          <div className="absolute left-4 -bottom-10 opacity-15 pointer-events-none">
            <ShieldCheck size={220} />
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse">
            <Clock size={40} className="mx-auto text-indigo-500 mb-3 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 font-bold">جاري تحميل بيانات التوثيق...</p>
          </div>
        ) : existingVerification && !isEditing ? (
          /* ================================================================= */
          /* Status Cards: Approved, Pending, or Rejected                      */
          /* ================================================================= */
          <div className="space-y-6">
            {/* 1. Approved State */}
            {existingVerification.status === 'approved' && (
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/40 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-900/30 border-2 border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                      <ShieldCheck size={36} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-200">
                          حسابك موثّق ومعتمد رسميـاً 🎉
                        </h2>
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                        تم التحقق من بياناتك وموافقتك على ميثاق الجودة. تظهر شارة التوثيق الآن بجانب اسمك لجميع التجار.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-sm">
                    <CheckCircle2 size={14} />
                    <span>مورد معتمد</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-emerald-200/60 dark:border-emerald-800">
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-3.5 border border-emerald-150 dark:border-emerald-900/40">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-bold">الاسم التجاري</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 block">{existingVerification.business_name}</span>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-3.5 border border-emerald-150 dark:border-emerald-900/40">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-bold">مجال التخصص</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 block">{existingVerification.specialty}</span>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-3.5 border border-emerald-150 dark:border-emerald-900/40">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-bold">وقت التجهيز</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 block">{existingVerification.prep_time}</span>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1"
                  >
                    <span>تحديث البيانات المرفقة</span>
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* 2. Pending State */}
            {existingVerification.status === 'pending' && (
              <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50/40 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-900/20 border-2 border-amber-400/50 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                      <Clock size={36} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-200">
                          طلب التوثيق قيد المراجعة ⏳
                        </h2>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 mt-1 max-w-xl">
                        تم استلام طلب التوثيق الخاص بك بنجاح، ويقوم فريق الإدارة بمراجعة البيانات والمستندات المرفقة والتأكد من مطابقتها. ستتلقى إشعاراً فورياً عند الاعتماد.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-sm">
                    <Clock size={13} />
                    <span>قيد المراجعة</span>
                  </span>
                </div>

                {/* Summary Box */}
                <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-4 sm:p-5 mt-6 border border-amber-200/80 dark:border-amber-800/50 space-y-3">
                  <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">البيانات المقدمة</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs block">الاسم التجاري:</span>
                      <strong className="text-gray-900 dark:text-white font-bold">{existingVerification.business_name}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs block">التخصص:</span>
                      <strong className="text-gray-900 dark:text-white font-bold">{existingVerification.specialty}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs block">الموقع / الولاية:</span>
                      <strong className="text-gray-900 dark:text-white font-bold">{existingVerification.location}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs block">وقت التجهيز المعتاد:</span>
                      <strong className="text-gray-900 dark:text-white font-bold">{existingVerification.prep_time}</strong>
                    </div>
                  </div>

                  {existingVerification.images && existingVerification.images.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-750">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-2">صور المخزن والبضاعة المرفوعة ({existingVerification.images.length}):</span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {existingVerification.images.map((imgUrl: string, idx: number) => (
                          <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer" className="relative group block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                            <img src={imgUrl} alt={`Doc ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <ExternalLink size={14} />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="py-2 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw size={14} />
                    <span>تعديل بيانات الطلب</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Rejected State */}
            {existingVerification.status === 'rejected' && (
              <div className="bg-gradient-to-br from-red-50 via-rose-50 to-orange-50/30 dark:from-red-950/40 dark:via-rose-950/30 dark:to-orange-950/20 border-2 border-red-400/50 rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
                      <AlertTriangle size={36} />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-red-950 dark:text-red-200">
                        لم يتم قبول طلب التوثيق ⚠️
                      </h2>
                      <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 mt-1 max-w-xl">
                        يرجى مراجعة ملاحظات فريق الإدارة وتعديل البيانات الناقصة أو غير المتطابقة لإعادة فحص الطلب واعتماده.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-red-600 text-white shadow-sm">
                    <X size={13} />
                    <span>مرفوض مؤقتاً</span>
                  </span>
                </div>

                {existingVerification.admin_notes && (
                  <div className="mt-5 p-4 rounded-xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800">
                    <span className="text-xs font-bold text-red-700 dark:text-red-400 block mb-1">سبب الرفض / ملاحظات الإدارة:</span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                      {existingVerification.admin_notes}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="py-2.5 px-5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-2 shadow-sm"
                  >
                    <RotateCcw size={15} />
                    <span>تعديل الطلب وإعادة الإرسال</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================================================================= */
          /* Section 1 & Section 2: Form Entry                                 */
          /* ================================================================= */
          <form onSubmit={handleSubmit} className="space-y-6">

            {isEditing && existingVerification && (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300 font-bold">
                <span>أنت الآن في وضع تعديل بيانات التوثيق المقدمة سابقاً.</span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                >
                  إلغاء التعديل
                </button>
              </div>
            )}

            {/* Section 1: Business Profile */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-400 flex items-center justify-center font-black">
                  <Store size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">القسم الأول: بيانات النشاط التجاري</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">معلومات واضحة وموثوقة تعزز ظهورك أمام التجار في منصة جيبها</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Business Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    الاسم التجاري للمحل / المؤسسة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="مثال: مؤسسة النور للاستيراد والتوزيع"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                  />
                </div>

                {/* Specialty */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    مجال التخصص / نوع البضاعة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="مثال: هواتف وإلكترونيات، كهرومنزلية، ألبسة..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    الولاية والبلدية (الموقع الفعلي للمخزن) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="مثال: الجزائر العاصمة - باب الزوار"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                  />
                </div>

                {/* Preparation Time */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    الوقت المعتاد لتجهيز وشحن الطلبية <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                  >
                    <option value="خلال أقل من 12 ساعة">خلال أقل من 12 ساعة (شحن فوري سريع)</option>
                    <option value="خلال 24 ساعة">خلال 24 ساعة (يوم واحد)</option>
                    <option value="1 إلى 2 يوم عمل">1 إلى 2 يوم عمل</option>
                    <option value="2 إلى 4 أيام عمل">2 إلى 4 أيام عمل</option>
                    <option value="حسب حجم الكمية المتفق عليها">حسب حجم الكمية المتفق عليها</option>
                  </select>
                </div>
              </div>

              {/* Social Links */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  روابط صفحات السوشيال ميديا (فيسبوك، تليجرام، انستغرام، موقعك) <span className="text-gray-400 font-normal">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={socialLinks}
                  onChange={(e) => setSocialLinks(e.target.value)}
                  placeholder="مثال: fb.com/mybusiness أو t.me/mychannel أو رابط انستغرام"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                />
              </div>

              {/* Warehouse & Goods Photos Upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    صور حقيقية للمخزن / البضاعة المتوفرة <span className="text-gray-400 font-normal">(حتى 6 صور)</span>
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                    {images.length}/6 صور مرفوعة
                  </span>
                </div>

                {/* Upload Trigger Area */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((imgUrl, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group bg-gray-100">
                      <img src={imgUrl} alt={`Warehouse ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1.5 left-1.5 w-7 h-7 bg-red-600/90 hover:bg-red-700 text-white rounded-lg flex items-center justify-center opacity-90 sm:opacity-0 group-hover:opacity-100 transition shadow-sm"
                        title="حذف الصورة"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {images.length < 6 && (
                    <label className={`aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition flex flex-col items-center justify-center text-center p-3 cursor-pointer bg-gray-50/50 dark:bg-gray-850 hover:bg-indigo-50/30 ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                      <UploadCloud size={24} className="text-indigo-500 mb-1" />
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">أضف صورة</span>
                      <span className="text-[9px] text-gray-400 mt-0.5">JPG, PNG</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Quality Service Charter (ميثاق جودة الخدمة) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                  <FileCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">القسم الثاني: ميثاق جودة الخدمة والالتزامات</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">لضمان سلامة التعاملات وحماية حقوق التجار والموردين في جيبها</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {activeCharterItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-850 rounded-xl">
                    جاري تحميل بنود ميثاق الجودة...
                  </div>
                ) : (
                  activeCharterItems.map((item, index) => {
                    const isChecked = Boolean(agreedCharterIds[item.id]);

                    return (
                      <label 
                        key={item.id}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                          isChecked 
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                            : 'bg-gray-50/60 dark:bg-gray-850 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCharterItem(item.id)}
                          className="mt-0.5 w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white block">
                            {index + 1}. {item.title}
                          </span>
                          <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Charter Checklist Status Warning */}
              {!allCharterAgreed && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>تنبيه: يجب وضع علامة (صح ✅) على جميع بنود الميثاق ({activeCharterItems.length} بنود) لتفعيل زر إرسال الطلب.</span>
                </div>
              )}
            </div>

            {/* Submission Button */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {allCharterAgreed ? '✅ جميع البنود مكتملة وموافَق عليها' : '⚠️ تبقى بنود غير مؤكدة في الميثاق'}
              </span>

              <button
                type="submit"
                disabled={!allCharterAgreed || submitting || uploadingImage}
                className={`py-3.5 px-8 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-md ${
                  allCharterAgreed && !submitting && !uploadingImage
                    ? 'bg-gradient-to-r from-blue-600 to-[#4f46e5] hover:opacity-95 text-white cursor-pointer hover:shadow-indigo-500/25'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>إرسال طلب التوثيق والموافقة على الميثاق</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
