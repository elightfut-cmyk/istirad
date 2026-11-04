import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
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
        checkSession().catch(() => {});
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
    <div className="min-h-screen bg-[#040c1e] text-slate-100 font-['Tajawal'] selection:bg-amber-500 selection:text-black antialiased relative overflow-x-hidden">
      
      {/* Background ambient light effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-900/20 via-amber-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* ── 1. TOP WARNING PILL (Pre-Qualification Banner) ── */}
      <div className="w-full bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 border-b border-amber-400/30 py-2.5 px-4 text-center sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 animate-bounce" />
          <span>⚠️ بوابة مخصصة للمستوردين من الصين، شركات الاستيراد، وأصحاب مخازن الجملة (Les Dépôts) في الجزائر فقط.</span>
        </div>
      </div>

      {/* ── 2. NAVBAR ── */}
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition">
          <img 
            src="/header-logo.png" 
            alt="جيبها - Jiibha" 
            className="h-9 sm:h-11 w-auto object-contain brightness-125" 
          />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
            <Sparkles size={13} className="text-amber-400" />
            بوابة الموردين والمستوردين
          </span>
          <Link 
            to="/login"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition"
          >
            تسجيل الدخول
          </Link>
        </div>
      </header>

      {/* ── 3. HERO SECTION ── */}
      <section className="max-w-4xl mx-auto px-4 pt-6 pb-8 text-center">
        {/* Quality Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-bold mb-4 shadow-sm">
          <BadgeCheck size={16} className="text-amber-400" />
          <span>فرصة استثنائية لموردي الجملة ومستوردي الصين في الجزائر</span>
        </div>

        {/* Main H1 Headline */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight sm:leading-snug tracking-tight mb-4">
          عندك سلعة في المخزن أو تشحن من الصين؟ <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200">
            بيع بالجملة لآلاف التجار في الجزائر
          </span>{' '}
          وادفع واستلم بالدينار الجزائري!
        </h1>

        {/* Sub-headline */}
        <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-3xl mx-auto leading-relaxed mb-6 font-medium">
          سجّل حسابك كمورد معتمد في جيبها، وثّق حسابك مجاناً، واطّلع يومياً على طلبات الشراء الجاهزة (RFQs) من التجار لتقدم عروض أسعارك وتربح بأمان مع نظام الضمان (Escrow).
        </p>

        {/* Trust Badges Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>طلبات شراء جملة يومية جاهزة</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs">
            <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
            <span>شارة "مورد موثوق" لرفع مبيعاتك</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>حماية مالية ودفع مضمون بالدينار (DZD)</span>
          </div>
        </div>
      </section>

      {/* ── 4. FUNNEL CONTAINER ── */}
      <main className="max-w-3xl mx-auto px-4 pb-16">
        
        {/* Multi-Step Progress Indicator (Shown during steps 1, 2, 3) */}
        {step < 4 && (
          <div className="bg-[#0b1733]/90 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-3 text-xs sm:text-sm font-bold">
              <span className={`flex items-center gap-1.5 ${step >= 1 ? 'text-amber-400' : 'text-slate-500'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step >= 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>1</span>
                <span>تحديد الصفة</span>
              </span>
              <span className={`flex items-center gap-1.5 ${step >= 2 ? 'text-amber-400' : 'text-slate-500'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step >= 2 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>2</span>
                <span>تأهيل المخزون</span>
              </span>
              <span className={`flex items-center gap-1.5 ${step >= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step >= 3 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>3</span>
                <span>إنشاء الحساب</span>
              </span>
            </div>

            {/* Progress bar track */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-500 ease-out rounded-full"
                style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
              />
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-sm flex items-start gap-3 animate-shake">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{errorMessage}</div>
          </div>
        )}

        {/* ── STEP 1: THE GATEKEEPER QUESTION ── */}
        {step === 1 && (
          <div className="bg-[#0b1733]/90 border border-slate-800/90 rounded-3xl p-5 sm:p-8 backdrop-blur-md shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                ما هي صفتك التجارية الحالية؟ (اختر للمتابعة)
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                الرجاء الاختيار بدقة حتى نوجهك للمسار الصحيح ونمنحك الامتيازات المناسبة لنشاطك
              </p>
            </div>

            <div className="space-y-4">
              {/* Option 1: Qualified Supplier */}
              <button
                type="button"
                onClick={() => handleSelectRole('supplier')}
                className={`w-full text-right p-5 rounded-2xl border-2 transition-all duration-300 relative group cursor-pointer ${
                  userType === 'supplier'
                    ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_25px_rgba(251,191,36,0.2)]'
                    : 'border-slate-700/80 bg-slate-900/60 hover:border-amber-400/60 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-400 group-hover:scale-110 transition-transform">
                    <Boxes size={26} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-base sm:text-lg text-white">
                        📦 أنا مستورد من الصين / صاحب مخزن جملة (Dépôt)
                      </span>
                      <span className="text-xs bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full font-bold border border-amber-400/30">
                        مؤهل للموردين
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mt-1">
                      لدي سلع وبضاعة جاهزة لبيعها بالجملة للتجار، أو أشحن كونتينرات وطرود DDP بانتظام.
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-amber-400/90 font-semibold">
                      <span>✓ بيع بالجملة وكراتين</span>
                      <span>✓ تلبية طلبات الشراء</span>
                      <span>✓ قبض فوري بالدينار</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-amber-400">
                  <span>انقر هنا للمتابعة إلى الخطوة 2 ←</span>
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Option 2: Merchant / Buyer (Disqualified for supplier ads) */}
              <div
                className={`w-full text-right p-5 rounded-2xl border-2 transition-all duration-300 relative ${
                  userType === 'merchant'
                    ? 'border-indigo-500/70 bg-indigo-950/40'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div 
                  className="flex items-start gap-4 cursor-pointer"
                  onClick={() => handleSelectRole('merchant')}
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
                    <ShoppingCart size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-base sm:text-lg text-slate-200">
                        🛒 أنا تاجر / صاحب محل وأريد شراء سلع
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mt-1">
                      أبحث عن موردين لشراء بضاعة بالكرتونة أو استيراد طلبيتي الخاصة من الصين.
                    </p>
                  </div>
                </div>

                {/* Conditional Disqualification Message & Merchant Redirect */}
                {userType === 'merchant' && (
                  <div className="mt-4 pt-4 border-t border-indigo-900/60 animate-fadeIn">
                    <div className="p-4 rounded-xl bg-indigo-950/70 border border-indigo-700/50 text-indigo-100 text-xs sm:text-sm leading-relaxed mb-4">
                      <p className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                        <Sparkles size={16} className="text-amber-400" />
                        تنويه هام خاص بالتجار:
                      </p>
                      هذه البوابة مخصصة للموردين وأصحاب المخازن فقط. بصفتك تاجراً يبحث عن سلع، يمكنك التسجيل في فضاء التجار وتقديم طلب الشراء الخاص بك ليتنافس الموردون على توفيره لك بأفضل سعر!
                    </div>

                    <Link
                      to="/register?role=merchant"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 transition shadow-lg active:scale-98"
                    >
                      <ShoppingCart size={18} />
                      <span>الانتقال إلى فضاء التجار والشراء بالجملة 🛒</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: SUPPLIER QUALIFICATION ── */}
        {step === 2 && (
          <div className="bg-[#0b1733]/90 border border-slate-800/90 rounded-3xl p-5 sm:p-8 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-amber-400 font-bold">الخطوة 2 من 3</span>
                <h2 className="text-xl sm:text-2xl font-black text-white">تأهيل نشاط المورد ومخزون السلع</h2>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition"
              >
                <ArrowRight size={14} />
                <span>رجوع للخطوة 1</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Question 1: Inventory Status */}
              <div>
                <label className="block text-sm sm:text-base font-extrabold text-white mb-2">
                  1. ما هي حالة البضاعة لديك حالياً؟ <span className="text-amber-400">*</span>
                </label>
                <p className="text-slate-400 text-xs mb-3">اختر الخيار الأنسب لنشاطك التجاري الحالي:</p>

                <div className="space-y-2.5">
                  {INVENTORY_OPTIONS.map((opt) => {
                    const IconComponent = opt.icon;
                    const isSelected = stockStatus === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setStockStatus(opt.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400/10 shadow-sm'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                            <IconComponent size={20} />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-bold text-slate-100 block">
                              {opt.label}
                            </span>
                            <span className="text-[11px] text-amber-400/90 font-medium">
                              {opt.badge}
                            </span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-amber-400 bg-amber-400' : 'border-slate-600'}`}>
                          {isSelected && <Check size={12} className="text-slate-950 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Question 2: Product Category */}
              <div>
                <label className="block text-sm sm:text-base font-extrabold text-white mb-2">
                  2. ما هو المجال الرئيسي لسلعتك؟ <span className="text-amber-400">*</span>
                </label>
                <p className="text-slate-400 text-xs mb-3">حدد التخصص التجاري لتلقي طلبات الشراء ذات الصلة فوراً:</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`p-3.5 rounded-xl border-2 text-right transition-all flex items-center justify-between text-xs sm:text-sm font-bold cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400/10 text-amber-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span>{cat}</span>
                        {isSelected && <Check size={16} className="text-amber-400 shrink-0" />}
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
                      className="w-full bg-slate-900 border border-amber-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                )}
              </div>

              {/* Proceed Button */}
              <button
                type="button"
                onClick={handleProceedToStep3}
                className="w-full py-4 px-6 rounded-2xl font-black text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:brightness-110 transition shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>متابعة إنشاء الحساب الموثق (الخطوة الأخيرة)</span>
                <ArrowLeft size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: REGISTRATION FORM ── */}
        {step === 3 && (
          <div className="bg-[#0b1733]/90 border border-slate-800/90 rounded-3xl p-5 sm:p-8 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-amber-400 font-bold">الخطوة 3 من 3</span>
                <h2 className="text-xl sm:text-2xl font-black text-white">بيانات حساب المورد المعتمد</h2>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition"
              >
                <ArrowRight size={14} />
                <span>تعديل السلعة/المخزون</span>
              </button>
            </div>

            {/* Summary Chip of Qualification */}
            <div className="mb-6 p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <BadgeCheck size={16} className="text-amber-400" />
                <span>الصفة: مورد ومستورد مؤهل</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300 font-semibold">
                <span>السلعة: <b className="text-white">{selectedCategory === 'مجال آخر (جملة)' ? customCategory : selectedCategory}</b></span>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Name & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                    الاسم واللقب الكامل <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثال: أمين بلقاسم"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pr-10 pl-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                    اسم الشركة / المحل / المخزن <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="مثال: مؤسسة النور للاستيراد بالجملة"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pr-10 pl-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                    رقم الهاتف (الجزائر) <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="tel"
                      dir="ltr"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="05 / 06 / 07 XX XX XX XX"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pr-10 pl-3 py-3 text-sm text-white text-right placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    يُفضل ربط الرقم بالواتساب للتواصل السريع والتوثيق
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                    البريد الإلكتروني <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      dir="ltr"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="supplier@example.com"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pr-10 pl-3 py-3 text-sm text-white text-right placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Warehouse Address & Location */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                  الولاية + البلدية / المنطقة التجارية للمخزن <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <MapPin size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="مثال: العلمة - سطيف، أو الحميز - الدار البيضاء، أو وهران..."
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pr-10 pl-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                  كلمة المرور للحساب <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="كلمة مرور قوية (6 خانات على الأقل)"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pr-10 pl-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                  className="w-full py-4 px-6 rounded-2xl font-black text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:brightness-110 transition shadow-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-98"
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

              <p className="text-center text-xs text-slate-400 pt-2">
                بتسجيلك، أنت توافق على شروط وسياسات منصة جيبها للموردين لحماية المعاملات التجارية.
              </p>
            </form>
          </div>
        )}

        {/* ── STEP 4: POST-REGISTRATION SUCCESS & ONBOARDING ── */}
        {step === 4 && registeredSupplier && (
          <div className="bg-[#0b1733]/95 border-2 border-amber-400/60 rounded-3xl p-6 sm:p-10 backdrop-blur-md shadow-[0_0_50px_rgba(251,191,36,0.15)] text-center animate-fadeIn">
            
            {/* Success Celebration Badge */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-emerald-400 p-1 mx-auto mb-5 shadow-lg">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <ShieldCheck size={42} className="text-amber-400 animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
              🎉 تهانينا! تم إنشاء حسابك كمورد بنجاح
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-6 leading-relaxed">
              أهلاً بك يا <b className="text-amber-300">{registeredSupplier.name}</b> في شبكة موردي جيبها المعتمدين. حسابك قيد التفعيل الأولي الآن.
            </p>

            {/* Account Summary Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 text-right mb-6 text-xs sm:text-sm space-y-2 max-w-lg mx-auto">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">المؤسسة / المخزن:</span>
                <span className="font-bold text-white">{registeredSupplier.company_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">تخصص السلعة:</span>
                <span className="font-bold text-amber-300">{registeredSupplier.category}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">حالة البضاعة:</span>
                <span className="font-semibold text-slate-200">{registeredSupplier.stockStatus}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">الهاتف المسجل:</span>
                <span className="font-mono text-slate-200" dir="ltr">{formatPhoneDisplay(registeredSupplier.phone)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المنطقة والموقع:</span>
                <span className="font-medium text-slate-300">{registeredSupplier.address}</span>
              </div>
            </div>

            {/* Fast-Track Actions */}
            <div className="space-y-3 max-w-lg mx-auto">
              {/* PRIMARY ACTION: WhatsApp Fast-Track */}
              <a
                href={getWhatsAppFastTrackUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl font-black text-base text-white bg-[#25D366] hover:bg-[#1ebd5a] transition-all shadow-xl flex items-center justify-center gap-2 group cursor-pointer hover:scale-[1.02] active:scale-98"
              >
                <WhatsAppIcon size={24} className="text-white group-hover:scale-110 transition-transform" />
                <span>⚡ توثيق سريع عبر واتساب فريق جيبها</span>
              </a>

              <p className="text-[11px] text-slate-400">
                انقر لمراسلة فريق الدعم والتوثيق على واتساب مع رسالة جاهزة لتوثيق مخزنك في دقائق
              </p>

              {/* SECONDARY ACTION: Portal & Document Upload */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <Link
                  to="/supplier/verification"
                  className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/40 transition flex items-center justify-center gap-1.5"
                >
                  <span>رفع وثائق المخزن والشارة</span>
                  <ExternalLink size={14} />
                </Link>

                <Link
                  to="/supplier"
                  className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <span>لوحة تحكم المورد</span>
                  <ArrowLeft size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── 5. SUPPLIER ADVANTAGES / TRUST SIGNALS ── */}
      <section className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-800/80">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">لماذا منصة جيبها؟</span>
          <h3 className="text-xl sm:text-3xl font-extrabold text-white mt-1">
            مميزات حصرية لموردي الجملة ومستوردي الصين
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-4">
              <DollarSign size={24} />
            </div>
            <h4 className="text-base font-extrabold text-white mb-2">ضمان مالي ودفع بالدينار (Escrow)</h4>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              أموالك مضمونة قبل تسليم البضاعة. يدفع التاجر المبلغ إلى حساب الضمان في جيبها، ويتحول إلى حسابك فور استلام الطلبية دون أي تلاعب أو مماطلة.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-4">
              <TrendingUp size={24} />
            </div>
            <h4 className="text-base font-extrabold text-white mb-2">طلبات شراء جاهزة يومياً (RFQs)</h4>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              آلاف التجار وأصحاب المحلات في 58 ولاية ينشرون يومياً طلبات شراء كميات وكراتين. كل ما عليك هو تقديم عروض أسعارك ومطابقة كمياتك.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="text-base font-extrabold text-white mb-2">شارة "مورد موثوق" وعلاقات دائمة</h4>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              نوثق مخزنك وسجلك التجاري لنمنحك شارة التوثيق الذهبية، مما يرفع ثقة التجار فيك وتصدرك لقائمة أفضل الموردين المعتمدين في الجزائر.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. SUPPLIER FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="text-center mb-8">
          <h3 className="text-lg sm:text-2xl font-black text-white">الأسئلة الشائعة للموردين والمستوردين</h3>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">كل ما تحتاج لمعرفته قبل الانضمام</p>
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
              className="border border-slate-800 bg-slate-900/50 rounded-2xl overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 text-right flex items-center justify-between text-xs sm:text-sm font-bold text-slate-200 hover:text-white"
              >
                <span>{item.q}</span>
                {activeFaq === idx ? <ChevronUp size={16} className="text-amber-400" /> : <ChevronDown size={16} className="text-slate-500" />}
              </button>
              {activeFaq === idx && (
                <div className="px-4 pb-4 text-xs sm:text-sm text-slate-400 border-t border-slate-800/80 pt-3 leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. FOOTER ── */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © {new Date().getFullYear()} منصة جيبها (jiibha.com) - جميع الحقوق محفوظة لشبكة التجارة والاستيراد.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/" className="hover:text-amber-400 transition">الرئيسية</Link>
            <Link to="/login" className="hover:text-amber-400 transition">تسجيل الدخول</Link>
            <Link to="/register?role=merchant" className="hover:text-amber-400 transition">فضاء التجار</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
