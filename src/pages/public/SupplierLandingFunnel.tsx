import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  Boxes,
  Warehouse,
  ShoppingCart,
  Building2,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  Layers,
  BadgeCheck,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { sendNotification } from '../../store/useNotificationStore';
import WhatsAppIcon from '../../components/icons/WhatsAppIcon';
import { formatWhatsAppUrl, cleanPhoneNumber, formatPhoneDisplay } from '../../utils/whatsapp';
import { trackFacebookEvent, trackCustomFacebookEvent } from '../../components/FacebookPixel';

// Pre-defined options for supplier inventory status
const INVENTORY_OPTIONS = [
  {
    id: 'in_stock_local',
    label: 'لدي بضاعة متوفرة حالياً في المخزن بالجزائر جاهزة للبيع بالجملة',
    badge: 'مخزون محلي حاضر',
    icon: Warehouse,
  },
  {
    id: 'import_regular',
    label: 'أستورد بانتظام من الصين وأشحن طلبيات للتجار (DDP / شحن بحري أو جوي)',
    badge: 'استيراد وشحن دوري',
    icon: Boxes,
  },
  {
    id: 'hybrid_both',
    label: 'الاثنان معاً (مخزون محلي + استيراد بالطلب)',
    badge: 'الأكثر مرونة',
    icon: Layers,
  },
];

// Pre-defined options for main goods categories
const CATEGORY_OPTIONS = [
  'إلكترونيات وإكسسوارات الهواتف والإعلام الآلي',
  'ملابس، أحذية، أقمشة ومستلزمات الموضة',
  'كوسميتيك ومستلزمات التجميل والعناية',
  'قطع غيار وإكسسوارات السيارات',
  'أدوات منزلية، خردوات (Quincaillerie) ومعدات',
  'مجال آخر (جملة)',
];

export default function SupplierLandingFunnel() {
  const { whatsappNumber, footerPhone } = useSettingsStore();
  const { checkSession } = useAuthStore();

  // Active step: 1 = Gatekeeper, 2 = Qualification, 3 = Register, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Gatekeeper choice ('supplier' | 'merchant' | null)
  const [userType, setUserType] = useState<'supplier' | 'merchant' | null>(null);

  // Step 2: Qualification selections
  const [stockStatus, setStockStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');

  // Step 3: Registration fields
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registeredSupplier, setRegisteredSupplier] = useState<any | null>(null);

  // FAQ Accordion states
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // 1. Meta Pixel on Mount: Track PageView and SupplierLandingView
  useEffect(() => {
    // Standard PageView and custom funnel view
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'PageView');
      window.fbq('trackCustom', 'SupplierLandingView', {
        page: 'suppliers-join',
        title: 'Jiibha Supplier Qualification Funnel'
      });
    } else {
      trackCustomFacebookEvent('SupplierLandingView', {
        page: 'suppliers-join'
      });
    }
  }, []);

  // Algerian phone validator
  const validatePhone = (rawPhone: string): boolean => {
    const cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '');
    // Accepts 05/06/07 (10 digits) OR +213 / 00213 / 213 followed by 5/6/7 (8 digits)
    return /^((\+213|00213|213)?[567]\d{8}|0[567]\d{8})$/.test(cleaned);
  };

  // Email validator
  const validateEmail = (emailStr: string): boolean => {
    const cleaned = emailStr.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
  };

  // Step 1: Gatekeeper handler
  const handleSelectRole = (role: 'supplier' | 'merchant') => {
    setUserType(role);
    setErrorMessage('');

    if (role === 'supplier') {
      // Advance to Step 2
      setStep(2);
      // Scroll smoothly to form
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
    // If 'merchant', STRICTLY DO NOT trigger any Meta conversion pixel.
    // The UI displays an informative redirect box with button.
  };

  // Step 2: Proceed from qualification to registration
  const handleProceedToStep3 = () => {
    setErrorMessage('');
    if (!stockStatus) {
      setErrorMessage('يرجى تحديد حالة البضاعة لديك حالياً للمتابعة.');
      return;
    }
    const finalCategory = selectedCategory === 'مجال آخر (جملة)' ? customCategory.trim() : selectedCategory;
    if (!finalCategory) {
      setErrorMessage('يرجى تحديد المجال الرئيسي لسلعتك.');
      return;
    }

    // Strict Meta Pixel rule: QualifiedSupplierStep2 event
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('trackCustom', 'QualifiedSupplierStep2', {
        inventory_status: stockStatus,
        category: finalCategory,
      });
    } else {
      trackCustomFacebookEvent('QualifiedSupplierStep2', {
        inventory_status: stockStatus,
        category: finalCategory,
      });
    }

    setStep(3);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Step 3: Registration submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Field Validations
    if (!formData.name.trim()) {
      setErrorMessage('يرجى إدخال الاسم واللقب الكامل.');
      return;
    }
    if (!formData.company_name.trim()) {
      setErrorMessage('يرجى إدخال اسم المؤسسة، الشركة، أو المخزن.');
      return;
    }
    if (!validatePhone(formData.phone)) {
      setErrorMessage('يرجى إدخال رقم هاتف جزائري صحيح يبدأ بـ 05 أو 06 أو 07 أو +213 مكون من 10 أرقام.');
      return;
    }
    if (!validateEmail(formData.email)) {
      setErrorMessage('يرجى إدخال بريد إلكتروني صالح بدون مسافات إضافية.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMessage('يرجى إدخال الولاية والبلدية أو المنطقة التجارية لمخزنك.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setErrorMessage('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام.');
      return;
    }

    const cleanEmail = formData.email.trim().toLowerCase();
    const finalCleanPhone = cleanPhoneNumber(formData.phone);
    const finalCategory = selectedCategory === 'مجال آخر (جملة)' ? (customCategory.trim() || 'مجال آخر') : selectedCategory;

    setIsSubmitting(true);

    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            company_name: formData.company_name.trim(),
            address: formData.address.trim(),
            role: 'supplier',
            status: 'pending',
            supplier_tier: 'NEW',
            verification_badge: 'none',
            category: finalCategory,
            stock_status: stockStatus,
          }
        }
      });

      if (authError) {
        // Translate common Supabase error messages
        if (authError.message?.toLowerCase().includes('already registered')) {
          throw new Error('هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة.');
        }
        throw authError;
      }

      const createdUser = authData.user;

      // 2. Direct Sync to public.users table to guarantee all fields are saved
      if (createdUser?.id) {
        const updatePayload: Record<string, any> = {
          role: 'supplier',
          status: 'pending',
          supplier_tier: 'NEW',
          verification_badge: 'none',
          phone: formData.phone.trim(),
          company_name: formData.company_name.trim(),
          address: formData.address.trim(),
        };

        const { error: updateError } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('id', createdUser.id);

        if (updateError) {
          console.warn('Sync users update notice:', updateError.message);
        }

        // Try creating an initial pending supplier_verifications entry
        try {
          await supabase.from('supplier_verifications').upsert({
            user_id: createdUser.id,
            business_name: formData.company_name.trim(),
            specialty: finalCategory,
            location: formData.address.trim(),
            prep_time: 'خلال 24 ساعة',
            status: 'pending',
            charter_agreed: false
          }, { onConflict: 'user_id' });
        } catch (svErr) {
          console.warn('Initial supplier_verifications upsert note:', svErr);
        }
      }

      // 3. Strict Meta Pixel rule: Fire CompleteRegistration and Lead with required properties
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'CompleteRegistration', {
          content_name: 'Verified_Supplier_Funnel',
          content_category: finalCategory,
          status: 'qualified_supplier',
          value: 200.00,
          currency: 'DZD'
        });
        window.fbq('track', 'Lead', {
          content_name: 'Supplier_Signup',
          value: 200.00,
          currency: 'DZD'
        });
      } else {
        trackFacebookEvent('CompleteRegistration', {
          content_name: 'Verified_Supplier_Funnel',
          content_category: finalCategory,
          status: 'qualified_supplier',
          value: 200.00,
          currency: 'DZD'
        });
        trackFacebookEvent('Lead', {
          content_name: 'Supplier_Signup',
          value: 200.00,
          currency: 'DZD'
        });
      }

      // 4. Send background notification to admins
      sendNotification(
        'all_admins',
        'مورد جديد مسجّل (حملة الموردين)',
        `تم تسجيل مورد مؤهل جديد: ${formData.name.trim()} (${formData.company_name.trim()}) - السلعة: ${finalCategory} - الهاتف: ${formData.phone.trim()}`,
        'info'
      ).catch(nErr => console.warn('Admin notification error:', nErr));

      // Refresh session in auth store silently if session exists
      if (authData.session) {
        checkSession().catch(() => { });
      }

      // Store supplier data for post-registration step
      setRegisteredSupplier({
        name: formData.name.trim(),
        company_name: formData.company_name.trim(),
        phone: formData.phone.trim(),
        cleanPhone: finalCleanPhone,
        email: cleanEmail,
        address: formData.address.trim(),
        category: finalCategory,
        stockStatus: INVENTORY_OPTIONS.find(o => o.id === stockStatus)?.label || stockStatus,
        hasSession: Boolean(authData.session),
      });

      // Move to Step 4 (Post-registration success view)
      setStep(4);
      window.scrollTo({ top: 150, behavior: 'smooth' });

    } catch (err: any) {
      console.error('Supplier registration error:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Fast-Track URL generation
  const getWhatsAppFastTrackUrl = () => {
    const targetPhone = whatsappNumber || footerPhone || '213555555555';
    if (!registeredSupplier) return formatWhatsAppUrl(targetPhone);

    const message = `السلام عليكم فريق جيبها،
أنا مورد مسجل جديد في منصة جيبها عبر بوابة الموردين:
👤 الاسم: ${registeredSupplier.name}
🏢 المؤسسة / المخزن: ${registeredSupplier.company_name}
📦 تخصص السلعة: ${registeredSupplier.category}
📊 حالة البضاعة: ${registeredSupplier.stockStatus}
📍 العنوان: ${registeredSupplier.address}
📱 رقم الهاتف: ${registeredSupplier.phone}

أرغب في إتمام التوثيق السريع لحسابي، والحصول على شارة "مورد موثوق" للبدء في تلبية طلبات الشراء وتقديم عروض الأسعار للتجار.`;

    return formatWhatsAppUrl(targetPhone, message);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-['Tajawal'] selection:bg-amber-400 selection:text-black antialiased relative overflow-x-hidden">

      {/* Background ambient light effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-amber-100/50 via-indigo-50/40 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* ── 1. TOP WARNING PILL (Pre-Qualification Banner) ── */}
      <div className="w-full bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 border-b border-amber-300/80 py-2.5 px-4 text-center sticky top-0 z-40 backdrop-blur-md shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span>⚠️ بوابة مخصصة للمستوردين من الصين، شركات الاستيراد، وأصحاب مخازن الجملة (Les Dépôts) في الجزائر فقط.</span>
        </div>
      </div>

      {/* ── 2. NAVBAR ── */}
      <header className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition">
          <img
            src="/header-logo.png"
            alt="جيبها - Jiibha"
            className="h-8 sm:h-11 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Sparkles size={13} className="text-amber-600" />
            بوابة الموردين والمستوردين
          </span>
          <Link
            to="/login"
            className="text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-900 px-3.5 py-1.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-white transition shadow-xs"
          >
            تسجيل الدخول
          </Link>
        </div>
      </header>

      {/* ── 3. HERO SECTION (Decluttered & Action-Oriented) ── */}
      <section className="max-w-3xl mx-auto px-4 pt-3 pb-5 text-center">
        {/* Micro Quality Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 text-xs sm:text-sm font-bold mb-3 shadow-xs">
          <BadgeCheck size={16} className="text-amber-600 shrink-0" />
          <span>فرصة حصرية للمستوردين ومخازن الجملة في الجزائر</span>
        </div>

        {/* Main H1 Headline */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-950 leading-tight tracking-tight mb-3">
          عندك بضاعة بالجملة أو تشحن من الصين؟ <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600">
            بيع لآلاف التجار في الجزائر
          </span>{' '}
          وادفع واستلم بالدينار (DZD) بأمان!
        </h1>

        {/* Direct Arrow Pointer to Registration Form */}
        <div className="inline-flex items-center gap-2 bg-white border border-amber-300 text-amber-950 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold shadow-xs">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>التسجيل مجاني وفوري عبر الاستمارة المحددة أدناه — ابدأ باختيار صفتك 👇</span>
        </div>
      </section>

      {/* ── 4. REGISTRATION ACTION ZONE (منطقة التسجيل البارزة للموردين) ── */}
      <main className="max-w-3xl mx-auto px-4 pb-8">
        {step < 4 ? (
          <div className="bg-white border-2 sm:border-3 border-amber-500 rounded-3xl shadow-xl overflow-hidden ring-4 ring-amber-400/15">

          {/* Action Zone Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-amber-500/50">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-black text-sm sm:text-base text-amber-400">
                استمارة تسجيل الموردين والمستوردين (ابدأ من هنا 👇)
              </span>
            </div>
            {step < 4 && (
              <span className="text-xs bg-amber-400/20 text-amber-300 font-extrabold px-3 py-1 rounded-full border border-amber-400/30">
                الخطوة {step} من 3
              </span>
            )}
          </div>

          <div className="p-4 sm:p-7">
            {/* Multi-Step Progress Indicator (Shown during steps 1, 2, 3) */}
            {step < 4 && (
              <div className="bg-slate-50 border border-gray-200 rounded-2xl p-3 sm:p-4 mb-6 shadow-xs">
                <div className="flex items-center justify-between mb-2.5 text-xs sm:text-sm font-bold">
                  <span className={`flex items-center gap-1.5 ${step >= 1 ? 'text-amber-800 font-black' : 'text-gray-400'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step >= 1 ? 'bg-amber-500 text-slate-950' : 'bg-gray-200 text-gray-500'}`}>1</span>
                    <span>تحديد صفتك</span>
                  </span>
                  <span className={`flex items-center gap-1.5 ${step >= 2 ? 'text-amber-800 font-black' : 'text-gray-400'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step >= 2 ? 'bg-amber-500 text-slate-950' : 'bg-gray-200 text-gray-500'}`}>2</span>
                    <span>تأهيل المخزون</span>
                  </span>
                  <span className={`flex items-center gap-1.5 ${step >= 3 ? 'text-amber-800 font-black' : 'text-gray-400'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step >= 3 ? 'bg-amber-500 text-slate-950' : 'bg-gray-200 text-gray-500'}`}>3</span>
                    <span>بيانات الحساب</span>
                  </span>
                </div>

                {/* Progress bar track */}
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-500 ease-out rounded-full"
                    style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Global Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-3 animate-shake shadow-xs">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 font-bold">{errorMessage}</div>
              </div>
            )}

            {/* ── STEP 1: THE GATEKEEPER QUESTION (CLEAR & UNAMBIGUOUS) ── */}
            {step === 1 && (
              <div>
                <div className="text-center mb-5">
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-1">
                    ما هي صفتك التجارية الحالية؟ (اختر للمتابعة)
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    اضغط على الزر الذهبي أدناه إذا كنت مورداً أو صاحب مخزن لبدء التسجيل فوراً:
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Option 1: Qualified Supplier (PRIMARY PROMINENT ACTION CARD) */}
                  <div
                    onClick={() => handleSelectRole('supplier')}
                    className="w-full text-right p-5 sm:p-6 rounded-2xl border-2 sm:border-3 border-amber-500 bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-orange-50/50 hover:bg-amber-100/70 transition-all duration-200 shadow-md cursor-pointer hover:shadow-lg relative group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <Boxes size={26} className="stroke-[2.5]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <span className="font-black text-base sm:text-lg text-slate-950">
                            📦 أنا مستورد من الصين / صاحب مخزن جملة (Dépôt)
                          </span>
                          <span className="text-xs bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-black shadow-xs">
                            ✓ الخيار الصحيح للموردين
                          </span>
                        </div>
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed mb-4 font-medium">
                          لدي بضاعة وسلع متوفرة لبيعها بالجملة للتجار، أو أشحن كونتينرات وطرود DDP من الصين.
                        </p>

                        {/* Obvious Primary Button inside the card */}
                        <button
                          type="button"
                          className="w-full py-3 px-4 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:brightness-105 transition shadow-sm flex items-center justify-center gap-2 group-hover:scale-[1.01]"
                        >
                          <span>👉 اضغط هنا للبدء في تسجيل حساب المورد (متابعة)</span>
                          <ArrowLeft size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Merchant / Buyer (SECONDARY MUTED CARD) */}
                  <div className="w-full text-right p-4 sm:p-5 rounded-2xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100/80 transition-all duration-200 shadow-xs">
                    <div
                      className="flex items-start gap-3.5 cursor-pointer"
                      onClick={() => handleSelectRole('merchant')}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center shrink-0">
                        <ShoppingCart size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm sm:text-base text-gray-700">
                            🛒 لست مورداً (أنا تاجر / صاحب محل وأريد شراء سلعة)
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed">
                          أبحث عن موردين لشراء بضاعة بالكرتونة أو استيراد طلبيتي الخاصة من الصين.
                        </p>
                      </div>
                    </div>

                    {/* Conditional Disqualification Message & Merchant Redirect */}
                    {userType === 'merchant' && (
                      <div className="mt-3 pt-3 border-t border-gray-200 animate-fadeIn">
                        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs leading-relaxed mb-3">
                          <p className="font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                            <Sparkles size={15} className="text-amber-600" />
                            تنويه خاص بالتجار وأصحاب المحلات:
                          </p>
                          هذه البوابة مخصصة للموردين وأصحاب المخازن فقط. بصفتك تاجراً يبحث عن سلع، يمكنك التسجيل في فضاء التجار وتقديم طلب الشراء الخاص بك ليتنافس الموردون على توفيره لك بأفضل سعر!
                        </div>

                        <Link
                          to="/register?role=merchant"
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm active:scale-98"
                        >
                          <ShoppingCart size={16} />
                          <span>الانتقال إلى فضاء التجار والشراء بالجملة ↗</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

        {/* ── STEP 2: SUPPLIER QUALIFICATION ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs text-amber-600 font-extrabold">الخطوة 2 من 3</span>
                <h2 className="text-lg sm:text-2xl font-black text-gray-900">تأهيل نشاط المورد ومخزون السلع</h2>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-gray-700 hover:text-gray-950 flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition shadow-xs cursor-pointer"
              >
                <ArrowRight size={14} />
                <span>رجوع للخطوة 1</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Question 1: Inventory Status */}
              <div>
                <label className="block text-sm sm:text-base font-extrabold text-gray-900 mb-2">
                  1. ما هي حالة البضاعة لديك حالياً؟ <span className="text-amber-500">*</span>
                </label>
                <p className="text-gray-500 text-xs mb-3">اختر الخيار الأنسب لنشاطك التجاري الحالي:</p>

                <div className="space-y-2.5">
                  {INVENTORY_OPTIONS.map((opt) => {
                    const IconComponent = opt.icon;
                    const isSelected = stockStatus === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setStockStatus(opt.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                            ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-400/20'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-gray-100 text-gray-500'}`}>
                            <IconComponent size={20} />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-bold text-gray-900 block">
                              {opt.label}
                            </span>
                            <span className="text-[11px] text-amber-700 font-semibold">
                              {opt.badge}
                            </span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`}>
                          {isSelected && <Check size={12} className="text-white stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Question 2: Product Category */}
              <div>
                <label className="block text-sm sm:text-base font-extrabold text-gray-900 mb-2">
                  2. ما هو المجال الرئيسي لسلعتك؟ <span className="text-amber-500">*</span>
                </label>
                <p className="text-gray-500 text-xs mb-3">حدد التخصص التجاري لتلقي طلبات الشراء ذات الصلة فوراً:</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`p-3.5 rounded-xl border-2 text-right transition-all flex items-center justify-between text-xs sm:text-sm font-bold cursor-pointer ${isSelected
                            ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm font-black'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <span>{cat}</span>
                        {isSelected && <Check size={16} className="text-slate-950 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {selectedCategory === 'مجال آخر (جملة)' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="يرجى كتابة نوع البضاعة بالجملة (مثال: ألعاب أطفال، مواد تغليف...)"
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 shadow-xs"
                    />
                  </div>
                )}
              </div>

              {/* Proceed Button */}
              <button
                type="button"
                onClick={handleProceedToStep3}
                className="w-full py-4 px-6 rounded-2xl font-black text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:brightness-105 transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>متابعة إنشاء الحساب الموثق (الخطوة الأخيرة) ←</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: REGISTRATION FORM ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs text-amber-600 font-extrabold">الخطوة 3 من 3 (النهائية)</span>
                <h2 className="text-lg sm:text-2xl font-black text-gray-900">بيانات حساب المورد المعتمد</h2>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-bold text-gray-700 hover:text-gray-950 flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition shadow-xs cursor-pointer"
              >
                <ArrowRight size={14} />
                <span>تعديل السلعة/المخزون</span>
              </button>
            </div>

            {/* Summary Chip of Qualification */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <BadgeCheck size={16} className="text-amber-600" />
                <span>الصفة: مورد ومستورد مؤهل</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 font-semibold">
                <span>السلعة: <b className="text-gray-900">{selectedCategory === 'مجال آخر (جملة)' ? customCategory : selectedCategory}</b></span>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Name & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                    الاسم واللقب الكامل <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثال: أمين بلقاسم"
                      className="w-full bg-white border border-gray-300 rounded-xl pr-10 pl-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                    اسم الشركة / المحل / المخزن <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="مثال: مؤسسة النور للاستيراد بالجملة"
                      className="w-full bg-white border border-gray-300 rounded-xl pr-10 pl-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                    رقم الهاتف (الجزائر) <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      dir="ltr"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="05 / 06 / 07 XX XX XX XX"
                      className="w-full bg-white border border-gray-300 rounded-xl pr-10 pl-3 py-3 text-sm text-gray-900 text-right placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-mono shadow-xs"
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    يُفضل ربط الرقم بالواتساب للتواصل السريع والتوثيق
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                    البريد الإلكتروني <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      dir="ltr"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="supplier@example.com"
                      className="w-full bg-white border border-gray-300 rounded-xl pr-10 pl-3 py-3 text-sm text-gray-900 text-right placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Warehouse Address & Location */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                  الولاية + البلدية / المنطقة التجارية للمخزن <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <MapPin size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="مثال: العلمة - سطيف، أو الحميز - الدار البيضاء، أو وهران..."
                    className="w-full bg-white border border-gray-300 rounded-xl pr-10 pl-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                  كلمة المرور للحساب <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="كلمة مرور قوية (6 خانات على الأقل)"
                    className="w-full bg-white border border-gray-300 rounded-xl pr-10 pl-11 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-2xl font-black text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:brightness-105 transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-98"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>جاري تسجيل وتوثيق الحساب...</span>
                    </div>
                  ) : (
                    <>
                      <span>تأكيد وتسجيل حساب مورد معتمد 🚀</span>
                      <ArrowLeft size={18} />
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 pt-2">
                بتسجيلك، أنت توافق على شروط وسياسات منصة جيبها للموردين لحماية المعاملات التجارية.
              </p>
            </form>
          </div>
        )}

            </div>
          </div>
        ) : (
          /* ── STEP 4: POST-REGISTRATION SUCCESS & ONBOARDING ── */
          registeredSupplier && (
            <div className="bg-white border-2 border-emerald-400 rounded-3xl p-6 sm:p-10 shadow-lg text-center animate-fadeIn">

              {/* Success Celebration Badge */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-emerald-400 p-1 mx-auto mb-5 shadow-md">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <ShieldCheck size={42} className="text-emerald-600 animate-pulse" />
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
                🎉 تهانينا! تم إنشاء حسابك كمورد بنجاح
              </h2>
              <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto mb-6 leading-relaxed">
                أهلاً بك يا <b className="text-amber-700">{registeredSupplier.name}</b> في شبكة موردي جيبها المعتمدين. حسابك قيد التفعيل الأولي الآن.
              </p>

              {/* Account Summary Card */}
              <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 sm:p-5 text-right mb-6 text-xs sm:text-sm space-y-2 max-w-lg mx-auto">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">المؤسسة / المخزن:</span>
                  <span className="font-bold text-gray-900">{registeredSupplier.company_name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">تخصص السلعة:</span>
                  <span className="font-bold text-amber-700">{registeredSupplier.category}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">حالة البضاعة:</span>
                  <span className="font-semibold text-gray-800">{registeredSupplier.stockStatus}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">الهاتف المسجل:</span>
                  <span className="font-mono text-gray-800" dir="ltr">{formatPhoneDisplay(registeredSupplier.phone)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">المنطقة والموقع:</span>
                  <span className="font-medium text-gray-700">{registeredSupplier.address}</span>
                </div>
              </div>

              {/* Fast-Track Actions */}
              <div className="space-y-3 max-w-lg mx-auto">
                {/* PRIMARY ACTION: WhatsApp Fast-Track */}
                <a
                  href={getWhatsAppFastTrackUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-6 rounded-2xl font-black text-base text-white bg-[#25D366] hover:bg-[#1ebd5a] transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer hover:scale-[1.02] active:scale-98"
                >
                  <WhatsAppIcon size={24} className="text-white group-hover:scale-110 transition-transform" />
                  <span>⚡ توثيق سريع عبر واتساب فريق جيبها</span>
                </a>

                <p className="text-[11px] text-gray-500">
                  انقر لمراسلة فريق الدعم والتوثيق على واتساب مع رسالة جاهزة لتوثيق مخزنك في دقائق
                </p>

                {/* SECONDARY ACTION: Portal & Document Upload */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <Link
                    to="/supplier/verification"
                    className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>رفع وثائق المخزن والشارة</span>
                    <ExternalLink size={14} />
                  </Link>

                  <Link
                    to="/supplier"
                    className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>لوحة تحكم المورد</span>
                    <ArrowLeft size={14} />
                  </Link>
                </div>
              </div>
            </div>
          )
        )}

      </main>

      {/* ── 5. EXPLICIT VISUAL SEPARATOR (Distinguishing Registration Form vs Reading Materials) ── */}
      <div className="max-w-4xl mx-auto px-4 my-8 text-center">
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t-2 border-dashed border-gray-300" />
          <div className="absolute bg-slate-50 px-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-200/90 border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold shadow-xs">
              <Sparkles size={14} className="text-amber-600" />
              <span>معلومات ومميزات المنصة (للاطلاع والقراءة فقط 📖)</span>
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-xs mt-3 font-semibold">
          التسجيل الفوري للموردين يتم حصراً عبر الاستمارة بالأعلى ☝️
        </p>
      </div>

      {/* ── 6. SUPPLIER ADVANTAGES / TRUST SIGNALS ── */}
      <section className="max-w-5xl mx-auto px-4 py-6">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">لماذا منصة جيبها؟</span>
          <h3 className="text-xl sm:text-3xl font-extrabold text-gray-900 mt-1">
            مميزات حصرية لموردي الجملة ومستوردي الصين
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
              <DollarSign size={24} />
            </div>
            <h4 className="text-base font-extrabold text-gray-900 mb-2">ضمان مالي ودفع بالدينار (Escrow)</h4>
            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
              أموالك مضمونة قبل تسليم البضاعة. يدفع التاجر المبلغ إلى حساب الضمان في جيبها، ويتحول إلى حسابك فور استلام الطلبية دون أي تلاعب أو مماطلة.
            </p>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
              <TrendingUp size={24} />
            </div>
            <h4 className="text-base font-extrabold text-gray-900 mb-2">طلبات شراء جاهزة يومياً (RFQs)</h4>
            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
              آلاف التجار وأصحاب المحلات في 58 ولاية ينشرون يومياً طلبات شراء كميات وكراتين. كل ما عليك هو تقديم عروض أسعارك ومطابقة كمياتك.
            </p>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="text-base font-extrabold text-gray-900 mb-2">شارة "مورد موثوق" وعلاقات دائمة</h4>
            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
              نوثق مخزنك وسجلك التجاري لنمنحك شارة التوثيق الذهبية، مما يرفع ثقة التجار فيك وتصدرك لقائمة أفضل الموردين المعتمدين في الجزائر.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. SUPPLIER FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="text-center mb-8">
          <h3 className="text-lg sm:text-2xl font-black text-gray-900">الأسئلة الشائعة للموردين والمستوردين</h3>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">كل ما تحتاج لمعرفته قبل الانضمام</p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'هل التسجيل والتوثيق مجاني في جيبها؟',
              a: 'نعم، التسجيل مجاني تماماً، ولا توجد أي اشتراكات شهرية خفية. يتم توثيق الحساب مجاناً من قبل فريق جيبها بعد التأكد من صفة المورد والمخزن.'
            },
            {
              q: 'كيف أضمن استلام أموالي بالدينار الجزائري؟',
              a: 'نستخدم نظام الضمان المالي (Escrow)؛ حيث يدفع التاجر قيمة البضاعة مقدماً للمنصة، وبمجرد تأكيد تسليم الشحنة يتم تحويل مستحقاتك بالدينار الجزائري فوراً إلى حسابك البنكي أو البريدي (CCP).'
            },
            {
              q: 'هل يمكنني الاستيراد لصالح تجار آخرين عبر المنصة؟',
              a: 'نعم بالتأكيد! إذا كنت توفر خدمات الشحن من الصين أو الاستيراد DDP، يمكنك تقديم عروضك لطلبات الاستيراد الخاصة بالتجار وشحن طلبياتهم بأمان.'
            },
            {
              q: 'ما هي شروط الحصول على شارة "مورد موثوق"؟',
              a: 'يشترط تقديم صور حقيقية للمخزن أو مقر النشاط، رقم هاتف شغال على واتساب، والالتزام بميثاق جودة الشحن والمصداقية مع التجار.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="border border-gray-200 bg-white rounded-2xl overflow-hidden transition shadow-xs"
            >
              <button
                type="button"
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 text-right flex items-center justify-between text-xs sm:text-sm font-bold text-gray-800 hover:text-gray-950 cursor-pointer"
              >
                <span>{item.q}</span>
                {activeFaq === idx ? <ChevronUp size={16} className="text-amber-600" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {activeFaq === idx && (
                <div className="px-4 pb-4 text-xs sm:text-sm text-gray-600 border-t border-gray-100 pt-3 leading-relaxed bg-slate-50/50">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. FOOTER ── */}
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © {new Date().getFullYear()} منصة جيبها (jiibha.com) - جميع الحقوق محفوظة لشبكة التجارة والاستيراد.
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <Link to="/" className="hover:text-amber-600 transition">الرئيسية</Link>
            <Link to="/login" className="hover:text-amber-600 transition">تسجيل الدخول</Link>
            <Link to="/register?role=merchant" className="hover:text-amber-600 transition">فضاء التجار</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
