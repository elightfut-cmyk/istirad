import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plane,
  UploadCloud,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Clock,
  Coins
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, User } from '../store/useAuthStore';
import { sendNotification } from '../store/useNotificationStore';
import { trackQualifiedMerchantTender } from '../utils/metaPixel';
import toast from 'react-hot-toast';

// 69 Algerian Wilayas (التقسيم الإداري الرسمي للجزائر 69 ولاية)
const ALGERIAN_WILAYAS = [
  '01 - أدرار', '02 - الشلف', '03 - الأغواط', '04 - أم البواقي', '05 - باتنة',
  '06 - بجاية', '07 - بسكرة', '08 - بشار', '09 - البليدة', '10 - البويرة',
  '11 - تمنراست', '12 - تبسة', '13 - تلمسان', '14 - تيارت', '15 - تيزي وزو',
  '16 - الجزائر', '17 - الجلفة', '18 - جيجل', '19 - سطيف', '20 - سعيدة',
  '21 - سكيكدة', '22 - سيدي بلعباس', '23 - عنابة', '24 - قالمة', '25 - قسنطينة',
  '26 - المدية', '27 - مستغانم', '28 - المسيلة', '29 - معسكر', '30 - ورقلة',
  '31 - وهران', '32 - البيض', '33 - إليزي', '34 - برج بوعريريج', '35 - بومرداس',
  '36 - الطارف', '37 - تندوف', '38 - تسمسيلت', '39 - الوادي', '40 - خنشلة',
  '41 - سوق أهراس', '42 - تيبازة', '43 - ميلة', '44 - عين الدفلى', '45 - النعامة',
  '46 - عين تموشنت', '47 - غرداية', '48 - غليزان', '49 - تيميمون', '50 - برج باجي مختار',
  '51 - أولاد جلال', '52 - بني عباس', '53 - عين صالح', '54 - عين قزام', '55 - تقرت',
  '56 - جانت', '57 - المغير', '58 - المنيعة',
  '59 - آفلو', '60 - بريكة', '61 - القنطرة', '62 - بئر العاتر', '63 - العريشة',
  '64 - قصر الشلالة', '65 - عين وسارة', '66 - مسعد', '67 - قصر البخاري', '68 - بوسعادة',
  '69 - الأبيض سيدي الشيخ'
];

export const BUDGET_OPTIONS = [
  { id: 'under_15m', label: 'أقل من 15 مليون سنتيم (تجريبي)', badge: 'تجريبي' },
  { id: '15m_50m', label: 'من 15 إلى 50 مليون سنتيم', badge: 'الأكثر طلباً' },
  { id: '50m_150m', label: 'من 50 إلى 150 مليون سنتيم', badge: 'أولوية قصوى' },
  { id: 'over_150m', label: 'أكثر من 150 مليون سنتيم', badge: 'VIP كبار التجار' },
] as const;

const DRAFT_STORAGE_KEY = 'jiibha_draft_tender';

export default function TenderOnboardingPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Step state: 1 = Tender Details, 2 = Account Details, 3 = Celebratory Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1 Form Data (Strict Quality & Wholesale Validation)
  const [productName, setProductName] = useState('');
  const [productLink, setProductLink] = useState('');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [exactQuantity, setExactQuantity] = useState('100');
  const [estimatedBudgetDZD, setEstimatedBudgetDZD] = useState<string>('15m_50m');
  const shippingPreference = 'air';
  const [productNotes, setProductNotes] = useState('');

  // Step 2 Form Data
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [wilaya, setWilaya] = useState(user?.address || '16 - الجزائر');
  const [password, setPassword] = useState('');

  // Sync user profile into form if already authenticated
  useEffect(() => {
    if (user) {
      if (user.name && !fullName) setFullName(user.name);
      if (user.email && !email) setEmail(user.email);
      if (user.phone && !phone) setPhone(user.phone);
      if (user.address && wilaya === '16 - الجزائر') setWilaya(user.address);
    }
  }, [user]);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.productName) setProductName(parsed.productName);
        else if (parsed.productTitleOrLink) setProductName(parsed.productTitleOrLink);
        if (parsed.productLink) setProductLink(parsed.productLink);
        if (parsed.exactQuantity) setExactQuantity(String(parsed.exactQuantity));
        if (parsed.estimatedBudgetDZD) setEstimatedBudgetDZD(parsed.estimatedBudgetDZD);
        if (parsed.productNotes) setProductNotes(parsed.productNotes);
        if (parsed.productImageUrl) {
          setProductImageUrl(parsed.productImageUrl);
          setImagePreview(parsed.productImageUrl);
        }
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.wilaya) setWilaya(parsed.wilaya);
      }
    } catch (e) {
      console.warn('Could not restore draft tender:', e);
    }
  }, []);

  // Sync draft changes to localStorage
  const saveDraftLocally = () => {
    try {
      const draft = {
        productName,
        productLink,
        productImageUrl,
        exactQuantity,
        estimatedBudgetDZD,
        shippingPreference,
        productNotes,
        fullName,
        email,
        phone,
        wilaya,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Could not save draft tender:', e);
    }
  };

  // Handle Image Upload to Cloudinary
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميغابايت.');
      return;
    }

    setIsUploadingImage(true);
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('upload_preset', 'jiibha');

      const res = await fetch('https://api.cloudinary.com/v1_1/xvhtji4c/image/upload', {
        method: 'POST',
        body: uploadData,
      });

      if (!res.ok) throw new Error('فشل رفع الصورة');
      const data = await res.json();
      setProductImageUrl(data.secure_url);
      setImagePreview(data.secure_url);
      if (errorMsg) setErrorMsg('');
      toast.success('تم رفع صورة المنتج بنجاح');
    } catch (uploadErr) {
      console.error('Image upload failed:', uploadErr);
      toast.error('تعذر رفع الصورة، يمكنك لصق رابط المنتج في الخانة المخصصة.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Validate and Proceed to Step 2 (Strict Quality & Minimum 100 Units Check)
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Strict Product Name Check (>= 10 characters describing product & model)
    const cleanProductName = productName.trim();
    if (!cleanProductName || cleanProductName.length < 10) {
      const msg = 'يرجى كتابة اسم وموديل المنتج بدقة (10 أحرف على الأقل).';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    // 2. Strict Product Reference Check (Must provide valid Link OR real Image)
    const hasLink = Boolean(productLink.trim());
    const hasImage = Boolean(productImageUrl.trim());
    if (!hasLink && !hasImage) {
      const msg = 'يرجى تقديم رابط للمنتج (AliExpress, Alibaba...) أو رفع صورة واضحة له لمطابقة المواصفات بدقة.';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (hasLink && !productLink.trim().startsWith('http://') && !productLink.trim().startsWith('https://')) {
      const msg = 'يرجى إدخال رابط منتج صالح يبدأ بـ https:// أو http://';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    // 3. Exact Numeric Quantity Check (Integer >= 100)
    const qtyNum = Number(exactQuantity);
    if (!exactQuantity || !Number.isInteger(qtyNum) || qtyNum < 100) {
      const msg = 'الحد الأدنى لطلبات الاستيراد بالجملة هو 100 قطعة فما فوق.';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    // 4. Wholesale Budget Check
    if (!estimatedBudgetDZD) {
      const msg = 'يرجى اختيار الميزانية التقريبية المخصصة للطلبية.';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    // Persist draft to localStorage
    saveDraftLocally();

    // CRITICAL: We DO NOT fire any Meta Pixel conversion event on Step 1 click!
    // Firing conversion events on Step 1 optimizes ads for curious clickers who drop off before registering.
    // Pixel will ONLY fire in Step 2 upon verified registration + qualified tender.

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Validate Algerian Phone format: 05, 06, or 07 with 8 following digits (10 digits total)
  const validateAlgerianPhone = (num: string): boolean => {
    const clean = num.replace(/[^0-9]/g, '');
    return /^(05|06|07)[0-9]{8}$/.test(clean);
  };

  // Validate Email format
  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  // Submit Step 2 (Register Merchant + Publish Tender)
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('يرجى إدخال اسمك الكامل أو اسم متجرك الإلكتروني.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح (مثال: name@example.com) لتسجيل الدخول إلى حسابك.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!validateAlgerianPhone(cleanPhone)) {
      setErrorMsg('يرجى إدخال رقم هاتف جزائري صحيح يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام.');
      return;
    }

    if (!user && (!password || password.length < 6)) {
      setErrorMsg('كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل لحماية حسابك.');
      return;
    }

    setIsSubmitting(true);

    try {
      const qtyNum = Number(exactQuantity) || 100;
      const budgetObj = BUDGET_OPTIONS.find(b => b.id === estimatedBudgetDZD);
      const budgetLabel = budgetObj?.label || 'من 15 إلى 50 مليون سنتيم';
      const isMicro = estimatedBudgetDZD === 'under_15m';

      let activeUserId = user?.id;

      // 1. If not logged in, Sign Up or Sign In with Email + Password
      if (!activeUserId) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: fullName.trim(),
              email: cleanEmail,
              phone: cleanPhone,
              company_name: fullName.trim(),
              address: wilaya,
              role: 'merchant',
              status: 'active',
            }
          }
        });

        if (signUpError) {
          // If already registered with this email, attempt sign-in
          if (signUpError.message?.toLowerCase().includes('already registered')) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: password,
            });

            if (signInError) {
              throw new Error('هذا البريد الإلكتروني مسجل بالفعل لدينا مسبقاً. إذا كان هذا حسابك، يرجى كتابة كلمة المرور الصحيحة أو التوجه لتسجيل الدخول.');
            }

            activeUserId = signInData.user?.id;
          } else {
            throw signUpError;
          }
        } else {
          activeUserId = signUpData.user?.id;
        }

        // Ensure active session if signUp didn't immediately create one
        if (activeUserId && !signUpData?.session) {
          try {
            const { data: signInAfterSignUp } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: password,
            });
            if (signInAfterSignUp?.user?.id) {
              activeUserId = signInAfterSignUp.user.id;
            }
          } catch (e) {
            console.warn('Session sign in notice:', e);
          }
        }

        // Sync to public.users table to guarantee all profile fields are saved
        if (activeUserId) {
          try {
            await supabase.from('users').update({
              name: fullName.trim(),
              email: cleanEmail,
              phone: cleanPhone,
              company_name: fullName.trim(),
              address: wilaya,
              role: 'merchant',
              status: 'active',
            }).eq('id', activeUserId);
          } catch (uErr) {
            console.warn('Profile sync note:', uErr);
          }

          // Fetch and hydrate user in auth store
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', activeUserId)
            .single();

          if (profile) {
            setUser(profile as User);
          }
        }
      } else if (user) {
        // If already logged in, keep profile updated with phone/wilaya
        try {
          await supabase.from('users').update({
            name: fullName.trim(),
            phone: cleanPhone,
            address: wilaya,
          }).eq('id', activeUserId);
        } catch (uErr) {
          console.warn('User profile update note:', uErr);
        }
      }

      if (!activeUserId) {
        throw new Error('تعذر إنشاء جلسة الحساب، يرجى المحاولة مرة أخرى.');
      }

      // 2. Prepare & Insert Custom Request (Tender) payload into Supabase
      const shippingLabel = 'شحن جوي سريع (DDP)';
      const tenderPayload: any = {
        merchant_id: activeUserId,
        title: productName.trim(),
        description: `طريقة الشحن: ${shippingLabel}. الكمية المطلوبة: ${qtyNum} قطعة. الميزانية التقديرية: ${budgetLabel}. ${isMicro ? '[تصنيف الطلب: تجريبي / ميكرو]' : ''} ${productNotes ? ' تفاصيل إضافية: ' + productNotes.trim() : ''}`,
        quantity: qtyNum,
        product_link: productLink.trim() || null,
        image_url: productImageUrl || null,
        notes: `العدد: ${qtyNum} قطعة | الميزانية: ${budgetLabel} ${isMicro ? '[طلب ميكرو / تجريبي]' : ''} | الشحن: جوي سريع DDP ${productNotes ? '| ' + productNotes.trim() : ''}`,
        approx_weight_grams: 0,
        avg_price_china: 0,
        status: 'open',
      };

      // Try inserting with tier field first
      let { error: tenderError } = await supabase
        .from('custom_requests')
        .insert({
          ...tenderPayload,
          tier: isMicro ? 'micro' : 'standard',
        });

      // Fallback if column 'tier' does not exist in schema
      if (tenderError && (tenderError.message?.toLowerCase().includes('tier') || tenderError.code === 'PGRST204')) {
        const retry = await supabase
          .from('custom_requests')
          .insert(tenderPayload);
        tenderError = retry.error;
      }

      if (tenderError) {
        console.error('Error inserting tender request:', tenderError);
        throw new Error('تم تفعيل حسابك ولكن تعذر إدراج المناقصة تلقائياً. يمكنك نشرها مباشرة من فضاء التاجر.');
      }

      // 3. Fire Meta Pixel Conversion Events ONLY for serious qualified tenders (qty >= 100 AND budget !== 'under_15m')
      if (!isMicro && qtyNum >= 100 && !isAdmin) {
        trackQualifiedMerchantTender({
          productName: productName.trim(),
          exactQuantity: qtyNum,
          estimatedBudgetDZD: estimatedBudgetDZD,
          wilaya: wilaya,
        });
      } else {
        console.log('🛡️ [MetaPixel] Micro/unqualified tender or admin: Meta conversion pixel suppressed.');
      }

      // 4. Notify suppliers & platform admins
      sendNotification(
        'all_suppliers',
        'مناقصة جملة جديدة من تاجر',
        `طرح التاجر ${fullName.trim()} مناقصة: ${productName.trim()} (${qtyNum} قطعة - ${budgetLabel})`,
        'info'
      ).catch(() => { });

      sendNotification(
        'all_admins',
        'تسجيل تاجر ومناقصة جملة جديدة',
        `سجل التاجر ${fullName.trim()} من ${wilaya} وطرح مناقصة: ${productName.trim()} (${qtyNum} قطعة - ${budgetLabel})`,
        'info'
      ).catch(() => { });

      // 5. Clear draft & show Celebratory Confirmation State
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {
        console.warn('Failed clearing draft:', e);
      }

      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMsg(err.message || 'حدث خطأ غير متوقع أثناء معالجة طلبك، يرجى إعادة المحاولة.');
      toast.error(err.message || 'حدث خطأ أثناء معالجة طلبك.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#12062E] text-white font-['Tajawal'] relative overflow-x-hidden selection:bg-[#7C3AED] selection:text-white pb-16"
      style={{
        backgroundImage: 'radial-gradient(ellipse 90% 60% at 50% -10%, #2C0C60 0%, #12062E 70%, #0B031C 100%)',
      }}
    >
      {/* ── Admin Step Switcher Toolbar (Only visible to logged-in Admins) ── */}
      {isAdmin && (
        <div className="sticky top-0 z-50 bg-[#1e0a47]/95 border-b border-[#7C3AED]/40 backdrop-blur-md px-4 py-2.5 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              وضع معاينة الأدمن (Admins Only)
            </span>
            <span className="text-gray-300 hidden sm:inline">
              | تصفح وتنقل بين خطوات القمع بحرية دون إطلاق بكسل فيسبوك
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${step === 1 ? 'bg-[#7C3AED] text-white shadow' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
            >
              الخطوة 1: تفاصيل المناقصة
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${step === 2 ? 'bg-[#7C3AED] text-white shadow' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
            >
              الخطوة 2: التسجيل السريع
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${step === 3 ? 'bg-emerald-600 text-white shadow' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
            >
              الخطوة 3: شاشة النجاح
            </button>
            <Link
              to="/admin"
              className="text-gray-400 hover:text-white px-2 py-1 rounded transition text-[11px]"
            >
              العودة للوحة الإدارة ↗
            </Link>
          </div>
        </div>
      )}

      {/* ── Minimal Top Header (Zero Leakage) ── */}
      <header className="max-w-5xl mx-auto px-4 pt-6 pb-4 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 group transition" title="منصة جيبها">
          <img
            src="/header-logo.png"
            alt="JIIBHA - جيبها"
            className="h-9 sm:h-11 object-contain brightness-110 drop-shadow-[0_2px_12px_rgba(124,58,237,0.4)]"
          />
        </Link>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-[#7C3AED]/30 backdrop-blur-md shadow-xs text-xs sm:text-sm font-semibold text-purple-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>بوابة التجار الإلكترونيين - الجزائر</span>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="max-w-5xl mx-auto px-4 pt-3 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Secondary Column on Large Screens: Trust Highlights (No external links) */}
          <aside className="hidden lg:block lg:col-span-5 order-2 lg:order-1 pt-6 space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7C3AED]/20 text-[#C4B5FD] text-xs font-bold border border-[#7C3AED]/30">
                <Sparkles size={14} className="text-amber-400" />
                استيراد بالجملة بأمان وسهولة
              </span>
              <h2 className="text-2xl xl:text-3xl font-black leading-tight text-white">
                اطرح مناقصتك وتلقَّ عروض الأسعار من الموردين مباشرة!
              </h2>
              <p className="text-sm text-purple-200/80 leading-relaxed">
                لا تضيّع وقتك في البحث العشوائي. حدد منتجك الرابح والكمية، وسيتنافس موردونا الموثوقون لتوفير أفضل سعر جملة مع التوصيل حتى باب مخزنك أو محلك في الجزائر.
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">حماية مالية 100% بنظام الضمان (Escrow)</h4>
                  <p className="text-xs text-purple-200/70 mt-0.5">
                    أموالك تبقى في أمان مع المنصة، ولا يستلم المورد ديناراً واحداً حتى تصل البضاعة وتفحصها بنفسك.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Coins size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">الدفع محلياً بالدينار الجزائري (DZD)</h4>
                  <p className="text-xs text-purple-200/70 mt-0.5">
                    ادفع عبر بريديباك (BaridiMob) أو التحويل البنكي بالدينار الجزائري دون الحاجة لبطاقات دولية.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-[#7C3AED]/30 text-purple-300 shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">عروض سريعة وتنافسية</h4>
                  <p className="text-xs text-purple-200/70 mt-0.5">
                    تصلك عروض الأسعار المفصلة (تكلفة السلعة، الشحن، الجمارك، والمدة) خلال ساعات من النشر.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick mini testimonials / trust counters */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-purple-200/70">
              <div className="text-center">
                <p className="text-base font-black text-amber-400">+1,400</p>
                <p>تاجر ومسوق نشط</p>
              </div>
              <div className="h-6 w-px bg-white/10"></div>
              <div className="text-center">
                <p className="text-base font-black text-emerald-400">+480</p>
                <p>مورد موثق ومخزن</p>
              </div>
              <div className="h-6 w-px bg-white/10"></div>
              <div className="text-center">
                <p className="text-base font-black text-purple-300">69 ولاية</p>
                <p>تغطية توصيل شاملة</p>
              </div>
            </div>
          </aside>

          {/* Primary Column: The Elevated Form Card (Hero Element) */}
          <div className="w-full lg:col-span-7 order-1 lg:order-2">

            {/* Spotlight Container Card */}
            <div className="bg-white text-gray-900 rounded-3xl p-6 sm:p-8 md:p-9 shadow-[0_25px_70px_-15px_rgba(124,58,237,0.45)] border-2 border-[#7C3AED]/40 relative overflow-hidden transition-all duration-300">

              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5818B8] via-[#7C3AED] to-[#10B981]"></div>

              {/* Error Message Box */}
              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-shake">
                  <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
                  <p className="font-semibold leading-relaxed">{errorMsg}</p>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/* STEP 1: تفاصيل طلب الاستيراد (إنشاء المناقصة أولاً)       */}
              {/* ────────────────────────────────────────────────────────── */}
              {step === 1 && (
                <form onSubmit={handleProceedToStep2} className="space-y-6">

                  {/* Step Progress & Indicator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#5818B8]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#5818B8] text-white flex items-center justify-center text-[11px]">1</span>
                        الخطوة 1 من 2: تفاصيل سلعتك المطلوبة
                      </span>
                      <span className="text-gray-400 font-normal">50% مكتمل</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#5818B8] to-[#7C3AED] h-full rounded-full transition-all duration-500" style={{ width: '50%' }}></div>
                    </div>
                  </div>

                  {/* Headlines Inside Card */}
                  <div className="space-y-1 pt-1">
                    <h1 className="text-xl sm:text-2xl font-black text-[#12062E] leading-snug">
                      اطلب تسعير منتجك بالجملة من الموردين الموثوقين
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                      أدخل اسم وموديل السلعة بدقة، الرابط أو الصورة، والعدد الدقيق لتصلك عروض الأسعار DDP إلى مخزنك
                    </p>
                  </div>

                  {/* Field 1: productName (Min 10 characters) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-[#12062E]">
                      اسم وموديل المنتج بدقة <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={productName}
                      onChange={(e) => {
                        setProductName(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="مثال: خلاط محمول لاسلكي 6 شفرات USB أو سماعات بلوتوث M10 Pro"
                      className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/15 outline-none transition text-sm text-gray-800 placeholder-gray-400"
                    />
                    <p className="text-[11px] text-gray-400">
                      يرجى كتابة اسم وموديل المنتج بدقة (10 أحرف على الأقل، تجنب الكلمات العامة مثل "ملابس" أو "هاتف")
                    </p>
                  </div>

                  {/* Field 2: productReference (Required Link OR Image) */}
                  <div className="p-4 rounded-2xl border-2 border-[#7C3AED]/20 bg-purple-50/30 space-y-3 text-right">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-[#12062E]">
                        مرجع المنتج (رابط أو صورة واضحة) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-[#5818B8] border border-purple-300">
                        مطلوب رابط أو صورة لمطابقة المواصفات
                      </span>
                    </div>

                    {/* Sub-field A: productLink */}
                    <div className="space-y-1">
                      <input
                        type="url"
                        value={productLink}
                        onChange={(e) => {
                          setProductLink(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="https://... رابط المنتج من AliExpress أو Alibaba أو 1688 أو متجر منافس"
                        className="w-full h-11 px-4 rounded-xl border-2 border-gray-200 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/15 outline-none transition text-xs sm:text-sm text-gray-800 placeholder-gray-400 dir-ltr text-left font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-[11px] font-bold text-gray-400">أو ارفع صورة للمنتج</span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    {/* Sub-field B: Image Upload Zone */}
                    <label className="flex flex-col items-center justify-center p-3 sm:p-4 border-2 border-dashed border-gray-300 hover:border-[#7C3AED] rounded-xl bg-white hover:bg-purple-50/50 cursor-pointer transition group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                      {imagePreview ? (
                        <div className="flex items-center gap-3 w-full">
                          <img
                            src={imagePreview}
                            alt="معاينة المنتج"
                            className="w-12 h-12 object-cover rounded-lg border border-purple-200 shrink-0"
                          />
                          <div className="text-right flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#5818B8] truncate">تم حفظ صورة المنتج بنجاح ✓</p>
                            <p className="text-[11px] text-gray-500">انقر لتغيير الصورة إذا رغبت</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-center text-gray-500 group-hover:text-[#5818B8]">
                          <UploadCloud size={20} className={isUploadingImage ? 'animate-bounce text-[#7C3AED]' : ''} />
                          <span className="text-xs font-medium">
                            {isUploadingImage ? 'جاري رفع ومعالجة الصورة...' : 'اضغط لاختيار صورة من جهازك (JPG/PNG أقل من 5MB)'}
                          </span>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Field 3: exactQuantity (Numeric Input >= 100) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs sm:text-sm font-bold text-[#12062E]">
                        العدد المطلوب بالتحديد (100 قطعة فما فوق) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        استيراد جملة DDP
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={100}
                        step={1}
                        required
                        value={exactQuantity}
                        onChange={(e) => {
                          setExactQuantity(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="أدخل العدد الدقيق للقطع (مثلاً: 100 أو 250)"
                        className="w-full h-12 px-4 pr-4 pl-16 rounded-xl border-2 border-gray-200 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/15 outline-none transition text-sm text-gray-800 font-mono font-bold"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg pointer-events-none">
                        قطعة
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      الحد الأدنى لطلبات الاستيراد بالجملة والتخليص الجمركي هو 100 قطعة فما فوق
                    </p>
                  </div>

                  {/* Field 4: estimatedBudgetDZD (Wholesale Budget Qualification Selector) */}
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-bold text-[#12062E]">
                      الميزانية التقريبية المخصصة لهذه الطلبية (بالدينار الجزائري) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {BUDGET_OPTIONS.map((opt) => {
                        const isSelected = estimatedBudgetDZD === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setEstimatedBudgetDZD(opt.id);
                              if (errorMsg) setErrorMsg('');
                            }}
                            className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-right flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-[#5818B8]/10 border-[#5818B8] text-[#5818B8] shadow-sm'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            <span className="text-xs sm:text-sm font-bold">{opt.label}</span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                isSelected
                                  ? 'bg-[#5818B8] text-white border-[#5818B8]'
                                  : 'bg-gray-200 text-gray-600 border-gray-300'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      المناقصات المخصصة للميزانيات من 15 مليون سنتيم فما فوق تحظى بأولوية قصوى وعروض أسعار فورية من كبار الموردين
                    </p>
                  </div>

                  {/* Field 5: Shipping Method (Fast Air Freight Dedicated) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-[#12062E]">
                      طريقة الشحن المعتمدة
                    </label>
                    <div className="p-3.5 rounded-xl border-2 border-[#5818B8] bg-[#5818B8]/5 flex items-start sm:items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#5818B8] text-white shrink-0 shadow-sm">
                        <Plane size={20} />
                      </div>
                      <div className="space-y-0.5 text-right flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs sm:text-sm font-black text-[#5818B8]">
                            شحن جوي سريع ✈️ (DDP من الباب إلى الباب)
                          </p>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                            معتمد للمناقصات
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600">
                          شحن جوي مباشر من الصين إلى الجزائر حتى باب محلك أو مخزنك شاملاً الجمارك والتوصيل السريع.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Field 6: Optional Specs & Notes */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600">
                      مواصفات إضافية أو ملاحظات خاصة (اختياري)
                    </label>
                    <textarea
                      rows={2}
                      value={productNotes}
                      onChange={(e) => setProductNotes(e.target.value)}
                      placeholder="مثال: تفضيل اللون الأسود، نوع التغليف، أو طلب عينات قبل الشحن..."
                      className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/15 outline-none transition text-xs sm:text-sm text-gray-800 placeholder-gray-400 resize-none"
                    />
                  </div>

                  {/* Step 1 Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-[#5818B8] hover:bg-[#7C3AED] active:scale-[0.99] text-white font-extrabold text-base sm:text-lg py-4 rounded-xl shadow-lg shadow-[#5818B8]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>متابعة وتأكيد بيانات الاستلام (خطوة واحدة أخيرة)</span>
                      <ArrowLeft size={20} />
                    </button>
                    <p className="text-center text-[11px] text-gray-400 mt-2 font-medium">
                      خطوة سريعة واحدة متبقية لنشر طلبك مجاناً وبدء استلام عروض الموردين
                    </p>
                  </div>
                </form>
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/* STEP 2: تفعيل الحساب ونشر المناقصة (التسجيل السريع)       */}
              {/* ────────────────────────────────────────────────────────── */}
              {step === 2 && (
                <form onSubmit={handleFinalSubmit} className="space-y-6">

                  {/* Dynamic Tender Summary Banner at Top */}
                  <div className="bg-[#D1FAE5]/70 border border-[#10B981] rounded-2xl p-3.5 flex items-center justify-between gap-3 text-right">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-full bg-emerald-500 text-white shrink-0 mt-0.5">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-emerald-950 truncate">
                          طلب مناقصتك جاهز للنشر: <span className="font-extrabold text-emerald-700">{productName}</span>
                        </p>
                        <p className="text-[11px] sm:text-xs text-emerald-800 mt-0.5">
                          العدد الدقيق: <span className="font-black font-mono">{exactQuantity} قطعة</span> • الشحن: جوي سريع ✈️ • الميزانية: <span className="font-bold">{BUDGET_OPTIONS.find(b => b.id === estimatedBudgetDZD)?.label || ''}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg shrink-0 transition cursor-pointer"
                    >
                      تعديل
                    </button>
                  </div>

                  {/* Step Progress & Indicator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px]">2</span>
                        الخطوة 2 من 2: أين نرسل لك عروض الموردين؟
                      </span>
                      <span className="text-gray-400 font-normal">90% مكتمل</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-[#10B981] h-full rounded-full transition-all duration-500" style={{ width: '90%' }}></div>
                    </div>
                  </div>

                  {/* Headlines Inside Card */}
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-[#12062E]">
                      افتح حسابك المجاني لنشر المناقصة فوراً
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500">
                      سيتم ربط طلبك بحسابك لتصلك تنبيهات عروض الأسعار والتواصل المباشر مع الموردين
                    </p>
                  </div>

                  {/* Step 2 Input Fields */}
                  <div className="space-y-4">

                    {/* Field 1: fullName */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-[#12062E]">
                        الاسم الكامل أو اسم متجرك الإلكتروني <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثال: يوسف بلقاسم أو متجر النورس ستور"
                        className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition text-sm text-gray-800 placeholder-gray-400"
                      />
                    </div>

                    {/* Field 2: email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-[#12062E]">
                        البريد الإلكتروني (لتسجيل الدخول إلى حسابك) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="name@example.com"
                        className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition text-sm text-gray-800 placeholder-gray-400 text-left font-mono"
                        dir="ltr"
                      />
                      <p className="text-[11px] text-gray-400">
                        ستستخدم هذا البريد الإلكتروني مع كلمة المرور لتسجيل الدخول ومتابعة مناقصاتك
                      </p>
                    </div>

                    {/* Field 3: phone (WhatsApp) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-[#12062E]">
                        رقم الهاتف / واتساب لاستلام إشعارات العروض <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="مثال: 0555123456 أو 0666123456 أو 0777123456"
                        className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition text-sm text-gray-800 placeholder-gray-400 text-left font-mono"
                        dir="ltr"
                      />
                      <p className="text-[11px] text-gray-400">
                        يقبل الأرقام الجزائرية المكونة من 10 أرقام (05 أو 06 أو 07)
                      </p>
                    </div>

                    {/* Field 4: wilaya */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-[#12062E]">
                        الولاية التي يتواجد بها مخزنك أو متجرك <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={wilaya}
                        onChange={(e) => setWilaya(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition text-sm text-gray-800 bg-white"
                      >
                        {ALGERIAN_WILAYAS.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Field 5: password */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-[#12062E]">
                        كلمة المرور لحسابك <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-12 px-4 pr-4 pl-12 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none transition text-sm text-gray-800"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        احفظ كلمة المرور للدخول لمتابعة المناقصة والعروض
                      </p>
                    </div>
                  </div>

                  {/* Step 2 Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#10B981] hover:bg-[#059669] active:scale-[0.99] text-white font-extrabold text-base sm:text-lg py-4 rounded-xl shadow-lg shadow-[#10B981]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>جاري نشر المناقصة وتفعيل حسابك...</span>
                        </>
                      ) : (
                        <>
                          <span>نشر المناقصة وفتح حسابي الآن</span>
                          <CheckCircle2 size={20} />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Micro-Trust Footer */}
                  <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-[11px] text-gray-500 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <span>🛡️</span>
                      <span>حماية بنظام الضمان (Escrow)</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span>🇩🇿</span>
                      <span>دفع بالدينار الجزائري (DZD)</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span>✓</span>
                      <span>موردون موثوقون رسمياً</span>
                    </div>
                  </div>
                </form>
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/* STEP 3: شاشة الاحتفال والنجاح                             */}
              {/* ────────────────────────────────────────────────────────── */}
              {step === 3 && (
                <div className="text-center py-6 sm:py-8 space-y-6">

                  {/* Celebration Glow Icon */}
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping"></div>
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                      <CheckCircle2 size={54} strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Headline & Details */}
                  <div className="space-y-2 max-w-md mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-black text-[#12062E]">
                      تم نشر مناقصتك بنجاح! 🎉
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      تهانينا يا <span className="font-bold text-[#5818B8]">{fullName || 'تاجرنا العزيز'}</span>! تم إرسال طلب استيرادك إلى شبكة موردينا المعتمدين في الصين والجزائر.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200 text-right space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-gray-500">المنتج المطلوب:</span>
                      <span className="font-bold text-gray-900 truncate max-w-[220px]">{productName}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-gray-500">العدد المطلوب:</span>
                      <span className="font-bold font-mono text-gray-900">{exactQuantity} قطعة</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-gray-500">الميزانية التقريبية:</span>
                      <span className="font-bold text-gray-900">{BUDGET_OPTIONS.find(b => b.id === estimatedBudgetDZD)?.label || ''}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-gray-500">طريقة الشحن:</span>
                      <span className="font-bold text-gray-900">شحن جوي سريع ✈️ (DDP)</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-gray-500">البريد الإلكتروني للحساب:</span>
                      <span className="font-bold font-mono text-[#5818B8] dir-ltr">{email.trim().toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500">إشعارات الواتساب على:</span>
                      <span className="font-bold font-mono text-[#5818B8]">{phone}</span>
                    </div>
                  </div>

                  {/* Account Login Credentials Alert */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 text-right flex items-center gap-2.5">
                    <span className="text-base shrink-0">🔐</span>
                    <p className="leading-relaxed">
                      تم تفعيل حسابك كتاجر وتسجيل دخولك تلقائياً! استخدم بريدك الإلكتروني <strong className="font-mono text-emerald-800">{email.trim().toLowerCase()}</strong> وكلمة المرور لتسجيل الدخول إلى حسابك في أي وقت.
                    </p>
                  </div>

                  {/* Direct Action Button */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/merchant')}
                      className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-[#10B981]/30 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>الدخول إلى فضاء التاجر ومتابعة العروض</span>
                      <ArrowLeft size={20} />
                    </button>

                    <Link
                      to="/"
                      className="inline-block text-xs text-gray-400 hover:text-gray-600 transition"
                    >
                      العودة إلى الصفحة الرئيسية لمنصة جيبها
                    </Link>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-5xl mx-auto px-4 mt-12 text-center text-xs text-purple-300/50 space-y-1">
        <p>© {new Date().getFullYear()} جيبها (JIIBHA) - منصة B2B الرائدة لربط التجار بالموردين في الجزائر.</p>
        <p>جميع الحقوق محفوظة • معاملات محمية بنظام الضمان المالي والدفع بالدينار الجزائري.</p>
      </footer>
    </div>
  );
}
