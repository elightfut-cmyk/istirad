import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface TermsOfUseModalProps {
  onAccept: () => void;
  onClose: () => void;
}

export default function TermsOfUseModal({ onAccept, onClose }: TermsOfUseModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchTOS = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_policies')
          .select('content')
          .eq('policy_type', 'TOS')
          .single();
        
        if (error) throw error;
        setContent(data?.content || 'لم يتم العثور على شروط الاستخدام.');
      } catch (err) {
        console.error('Error fetching TOS:', err);
        setContent('حدث خطأ أثناء تحميل شروط الاستخدام.');
      } finally {
        setLoading(false);
      }
    };
    fetchTOS();
  }, []);

  const handleAccept = async () => {
    if (!agreed || !user) return;
    setAccepting(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ has_accepted_tos: true })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state if needed (or simply trigger onAccept)
      onAccept();
    } catch (err) {
      console.error('Error accepting TOS:', err);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rtl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col font-['Tajawal']">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            شروط الاستخدام الأساسية
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div 
              className="prose dark:prose-invert max-w-none prose-green prose-p:leading-relaxed prose-headings:font-['Tajawal']"
              dangerouslySetInnerHTML={{ __html: content }} 
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center pt-1">
              <input 
                type="checkbox" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded transition-colors peer-checked:bg-green-600 peer-checked:border-green-600 group-hover:border-green-500 flex items-center justify-center">
                <Check className={`w-3.5 h-3.5 text-white transition-transform ${agreed ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
              </div>
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium select-none text-sm md:text-base leading-tight">
              لقد قرأت شروط الاستخدام وأوافق عليها تماماً.
            </span>
          </label>
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleAccept}
              disabled={!agreed || accepting}
              className={`px-8 py-2.5 rounded-xl font-bold text-white transition-all ${
                agreed && !accepting
                  ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {accepting ? 'جاري التأكيد...' : 'متابعة الدفع'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
