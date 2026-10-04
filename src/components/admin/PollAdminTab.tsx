import { useState, useEffect } from 'react';
import { pollService, UserPoll } from '../../services/pollService';
import UserPollModal from '../UserPollModal';
import { 
  Vote, 
  Plus, 
  Trash2, 
  Eye, 
  Save, 
  RefreshCw, 
  BarChart3, 
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PollAdminTab() {
  const [poll, setPoll] = useState<UserPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewPoll, setPreviewPoll] = useState<UserPoll | null>(null);

  // Form states
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'merchant' | 'supplier'>('all');
  const [isActive, setIsActive] = useState(true);
  const [options, setOptions] = useState<{ id: string; text: string; votesCount?: number }[]>([
    { id: 'opt_1', text: 'أوافق بشدة' },
    { id: 'opt_2', text: 'محايد' },
    { id: 'opt_3', text: 'لا أوافق' },
  ]);

  useEffect(() => {
    loadPoll();
  }, []);

  const loadPoll = async () => {
    setLoading(true);
    try {
      const data = await pollService.getPoll();
      if (data) {
        setPoll(data);
        setQuestion(data.question || '');
        setDescription(data.description || '');
        setTargetRole(data.targetRole || 'all');
        setIsActive(data.isActive !== undefined ? data.isActive : true);
        if (data.options && data.options.length > 0) {
          setOptions(data.options);
        }
      }
    } catch (err) {
      console.error('Error loading poll in admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    if (options.length >= 6) {
      toast.error('الحد الأقصى للخيارات هو 6 خيارات');
      return;
    }
    const newId = `opt_${Date.now()}`;
    setOptions([...options, { id: newId, text: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast.error('يجب أن يحتوي الاستطلاع على خيارين على الأقل');
      return;
    }
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
  };

  const handleOptionChange = (index: number, text: string) => {
    const updated = [...options];
    updated[index].text = text;
    setOptions(updated);
  };

  const handleSave = async () => {
    if (!question.trim()) {
      toast.error('يرجى كتابة قضية الاستطلاع (السؤال)');
      return;
    }

    const validOptions = options.filter(o => o.text.trim() !== '');
    if (validOptions.length < 2) {
      toast.error('يرجى إدخال نص لخيارين على الأقل');
      return;
    }

    setSaving(true);
    try {
      const res = await pollService.savePoll({
        question: question.trim(),
        description: description.trim(),
        targetRole,
        isActive,
        options: validOptions
      });

      if (res.success && res.data) {
        setPoll(res.data);
        toast.success('تم حفظ وتحديث الاستطلاع بنجاح');
      } else {
        toast.error('حدث خطأ أثناء حفظ الاستطلاع');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const newStatus = !isActive;
    setIsActive(newStatus);
    const res = await pollService.toggleActive(newStatus);
    if (res.success) {
      toast.success(newStatus ? 'تم تفعيل الاستطلاع للمستخدمين' : 'تم تعطيل الاستطلاع');
      if (poll) setPoll({ ...poll, isActive: newStatus });
    }
  };

  const handleResetPoll = async () => {
    if (!window.confirm('هل أنت متأكد من تصفير نتائج الاستطلاع؟ سيتم مسح الأصوات السابقة لتمكين المستخدمين من التصويت مجدداً.')) {
      return;
    }

    try {
      const res = await pollService.resetPoll();
      if (res.success && res.data) {
        setPoll(res.data);
        setOptions(res.data.options);
        toast.success('تم تصفير الأصوات وبدء الاستطلاع من جديد');
      }
    } catch {
      toast.error('حدث خطأ أثناء تصفير الاستطلاع');
    }
  };

  const handlePreview = () => {
    const validOptions = options.filter(o => o.text.trim() !== '');
    if (!question.trim() || validOptions.length < 2) {
      toast.error('يرجى كتابة السؤال وخيارين على الأقل للمعاينة');
      return;
    }

    setPreviewPoll({
      id: 'preview_poll',
      question: question.trim(),
      description: description.trim(),
      targetRole,
      isActive: true,
      options: validOptions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalVotes: poll?.totalVotes || 0
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalVotes = poll?.totalVotes || poll?.options?.reduce((sum, o) => sum + (o.votesCount || 0), 0) || 0;

  return (
    <div className="space-y-8">
      {/* Top Banner / Status Overview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-tr from-[#4f46e5] to-indigo-600 text-white rounded-2xl shadow-md">
            <Vote size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">سبر الآراء والتصويت (User Polls)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              اطرح قضايا واستطلاعات رأي تفاعلية تظهر لتجارك ومورديك لمعرفة آرائهم ببيانات حية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              isActive 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
            }`}
          >
            {isActive ? <ToggleRight size={22} className="text-emerald-600" /> : <ToggleLeft size={22} />}
            <span>{isActive ? 'الاستطلاع مفعّل' : 'الاستطلاع معطّل'}</span>
          </button>

          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-50 text-[#4f46e5] hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition"
          >
            <Eye size={18} />
            <span>معاينة النافذة</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Form (2 Columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <span>إعدادات قضية الاستطلاع</span>
          </h3>

          {/* Question / Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
              قضية الاستطلاع (السؤال الرئيسي) *
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="مثال: ما رأيكم في إضافة خدمة الشحن الجوي السريع في غضون 7 أيام؟"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#4f46e5] outline-none transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
              تفاصيل توضيحية أو سياق إضافي (اختياري)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب هنا أي تفاصيل تود توضيحها للمستخدم لمساعدته على التصويت بدقة..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#4f46e5] outline-none transition resize-none text-sm"
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
              الفئة المستهدفة بالتصويت
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'all', label: 'الجميع (تجار وموردين)' },
                { id: 'merchant', label: 'التجار فقط' },
                { id: 'supplier', label: 'الموردين فقط' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTargetRole(item.id as any)}
                  className={`p-3 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all text-center ${
                    targetRole === item.id
                      ? 'border-[#4f46e5] bg-indigo-50/60 dark:bg-indigo-950/40 text-[#4f46e5] dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                خيارات التصويت (2 إلى 6 خيارات)
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4f46e5] dark:text-indigo-400 hover:underline"
              >
                <Plus size={16} />
                <span>إضافة خيار جديد</span>
              </button>
            </div>

            <div className="space-y-3">
              {options.map((opt, index) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center text-xs font-black shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`نص الخيار رقم ${index + 1}`}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#4f46e5] outline-none transition text-sm"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition shrink-0"
                      title="حذف هذا الخيار"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ ونشر الاستطلاع'}</span>
            </button>

            <button
              onClick={handleResetPoll}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 transition flex items-center gap-1.5"
              title="تصفير أصوات المشاركين لبدء جولة تصويت جديدة"
            >
              <RefreshCw size={15} />
              <span>تصفير نتائج التصويت</span>
            </button>
          </div>
        </div>

        {/* Live Results Card (1 Column) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-[#4f46e5]" />
              <span>النتائج الحية للاستطلاع</span>
            </h3>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-[#4f46e5] dark:text-indigo-300">
              {totalVotes} صوت
            </span>
          </div>

          {poll ? (
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-xs text-gray-400 mb-1">السؤال الحالي:</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug">
                  {poll.question || 'لا يوجد سؤال محدد'}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {poll.options.map((opt) => {
                  const percentage = totalVotes > 0 ? Math.round(((opt.votesCount || 0) / totalVotes) * 100) : 0;
                  return (
                    <div key={opt.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-center text-xs font-bold mb-1.5 text-gray-700 dark:text-gray-300">
                        <span>{opt.text}</span>
                        <span>%{percentage} ({opt.votesCount || 0})</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#4f46e5] to-indigo-500 transition-all duration-700"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-6 text-[11px] text-gray-400 space-y-1">
                <p>• تاريخ آخر تحديث: {new Date(poll.updatedAt).toLocaleDateString('ar-DZ')}</p>
                <p>• الحالة: {poll.isActive ? 'نشط ويظهر للمستخدمين' : 'متوقف حالياً'}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">
              لم يتم إنشاء استطلاع بعد
            </div>
          )}
        </div>
      </div>

      {/* Live Preview Modal */}
      {previewPoll && (
        <UserPollModal 
          previewPoll={previewPoll} 
          onClosePreview={() => setPreviewPoll(null)} 
        />
      )}
    </div>
  );
}
