import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Clock, Truck, Home, MapPin, MessageCircle, X } from 'lucide-react';
// useAuthStore import removed

interface OrderProgressBarProps {
  bidId: string;
  currentStatus: string; // e.g., 'pending_in_china', etc.
}

const STAGES = [
  { id: 'pending_in_china', label: 'في الصين', icon: Clock },
  { id: 'international_transit', label: 'شحن دولي', icon: Truck },
  { id: 'customs_clearance', label: 'تخليص جمركي', icon: MapPin },
  { id: 'in_local_warehouse', label: 'في المستودع', icon: Home },
  { id: 'out_for_delivery', label: 'جاري التوصيل', icon: CheckCircle2 }
];

export default function OrderProgressBar({ bidId, currentStatus }: OrderProgressBarProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  // removed user as it is not used in this component

  useEffect(() => {
    fetchComments();
  }, [bidId]);

  const fetchComments = async () => {
    if (!bidId) return;
    try {
      const { data, error } = await supabase
        .from('order_status_comments')
        .select('*')
        .eq('bid_id', bidId);
      if (!error && data) {
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching order comments:', err);
    }
  };

  const markCommentAsRead = async (commentId: string) => {
    try {
      await supabase
        .from('order_status_comments')
        .update({ is_read_by_merchant: true })
        .eq('id', commentId);
      
      setComments(prev => 
        prev.map(c => c.id === commentId ? { ...c, is_read_by_merchant: true } : c)
      );
    } catch (err) {
      console.error('Error marking comment as read:', err);
    }
  };

  const currentStageIndex = STAGES.findIndex(s => s.id === currentStatus);
  const actualIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

  const handleStageClick = (stageId: string) => {
    const stageComments = comments.filter(c => c.status_stage === stageId);
    if (stageComments.length > 0) {
      setSelectedStage(selectedStage === stageId ? null : stageId);
      // Mark as read if clicked and unread
      stageComments.forEach(c => {
        if (!c.is_read_by_merchant) {
          markCommentAsRead(c.id);
        }
      });
    }
  };

  return (
    <div className="w-full py-6 font-['Tajawal'] rtl">
      <div className="relative flex justify-between items-center w-full">
        {/* Connecting Lines */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded-full" />
        <div 
          className="absolute top-1/2 right-0 h-1 bg-green-500 -z-10 -translate-y-1/2 transition-all duration-500 rounded-full"
          style={{ width: `${(actualIndex / (STAGES.length - 1)) * 100}%` }}
        />

        {STAGES.map((stage, index) => {
          const isCompleted = index <= actualIndex;
          const isCurrent = index === actualIndex;
          const stageComments = comments.filter(c => c.status_stage === stage.id);
          const unreadCount = stageComments.filter(c => !c.is_read_by_merchant).length;
          const Icon = stage.icon;

          return (
            <div key={stage.id} className="relative flex flex-col items-center">
              {/* Notification Badge */}
              {unreadCount > 0 && (
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg animate-bounce z-10 cursor-pointer" onClick={() => handleStageClick(stage.id)}>
                  {unreadCount}
                </div>
              )}
              
              {/* Stage Icon */}
              <button 
                onClick={() => handleStageClick(stage.id)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md z-0 ${
                  isCompleted 
                    ? 'bg-green-500 text-white shadow-green-500/40' 
                    : 'bg-white text-gray-400 border-2 border-gray-200'
                } ${isCurrent ? 'ring-4 ring-green-100 scale-110' : ''} ${stageComments.length > 0 ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
              >
                <Icon className={`w-6 h-6 ${isCurrent ? 'animate-pulse' : ''}`} />
              </button>
              
              {/* Stage Label */}
              <span className={`mt-3 text-sm font-bold text-center max-w-[80px] leading-tight ${
                isCompleted ? 'text-green-600' : 'text-gray-400'
              }`}>
                {stage.label}
              </span>

              {/* Tooltip / Drawer for comments */}
              {selectedStage === stage.id && stageComments.length > 0 && (
                <div className="absolute top-full mt-4 right-1/2 translate-x-1/2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 z-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-green-500" />
                      ملاحظات المورد
                    </h4>
                    <button onClick={() => setSelectedStage(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {stageComments.map(c => (
                      <div key={c.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 border-r-2 border-green-500">
                        {c.comment_text}
                        <div className="text-[10px] text-gray-400 mt-1">
                          {new Date(c.created_at).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
