import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { pollService, UserPoll } from '../services/pollService';
import { 
  BarChart3, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Users, 
  Vote, 
  Check, 
  Loader2 
} from 'lucide-react';

interface UserPollModalProps {
  previewPoll?: UserPoll | null;
  onClosePreview?: () => void;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
}

export default function UserPollModal({ 
  previewPoll, 
  onClosePreview,
  isOpenControlled,
  onCloseControlled
}: UserPollModalProps) {
  const { user } = useAuthStore();
  const [poll, setPoll] = useState<UserPoll | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVotedOptionId, setUserVotedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (previewPoll) {
      setPoll(previewPoll);
      setIsOpen(true);
      return;
    }

    if (isOpenControlled !== undefined) {
      setIsOpen(isOpenControlled);
      if (isOpenControlled) {
        loadPollData();
      }
      return;
    }

    loadPollData();
  }, [user, previewPoll, isOpenControlled]);

  const loadPollData = async () => {
    // Only merchants and suppliers see automatic popup (admins view in management)
    if (!user || (user.role !== 'merchant' && user.role !== 'supplier')) {
      return;
    }

    const activePoll = await pollService.getPoll();
    if (!activePoll || !activePoll.isActive) {
      return;
    }

    if (activePoll.targetRole !== 'all' && activePoll.targetRole !== user.role) {
      return;
    }

    const votedOption = pollService.hasUserVoted(activePoll.id, user.id);
    setPoll(activePoll);

    if (votedOption) {
      setHasVoted(true);
      setUserVotedOptionId(votedOption);
    } else {
      // If user hasn't voted yet, popup after a subtle delay (managed in sequence)
      const dismissed = sessionStorage.getItem(`jiibha_poll_dismissed_${activePoll.id}`);
      if (!dismissed) {
        // Show after 20 seconds from dashboard mount if not dismissed
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 20000);
        return () => clearTimeout(timer);
      }
    }
  };

  const handleClose = () => {
    if (previewPoll) {
      setIsOpen(false);
      onClosePreview?.();
      return;
    }

    if (onCloseControlled) {
      onCloseControlled();
      return;
    }

    setIsClosing(true);
    setTimeout(() => {
      if (poll) {
        sessionStorage.setItem(`jiibha_poll_dismissed_${poll.id}`, 'true');
      }
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  const handleVoteSubmit = async () => {
    if (!poll || !selectedOptionId || !user || submitting) return;

    if (previewPoll) {
      setHasVoted(true);
      setUserVotedOptionId(selectedOptionId);
      return;
    }

    setSubmitting(true);
    try {
      await pollService.submitVote(poll.id, user.id, selectedOptionId);
      setHasVoted(true);
      setUserVotedOptionId(selectedOptionId);

      // Refresh poll counts locally
      const updatedOptions = poll.options.map(opt => {
        if (opt.id === selectedOptionId) {
          return { ...opt, votesCount: (opt.votesCount || 0) + 1 };
        }
        return opt;
      });
      setPoll({
        ...poll,
        options: updatedOptions,
        totalVotes: (poll.totalVotes || 0) + 1
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !poll) return null;

  const totalVotes = poll.totalVotes || poll.options.reduce((sum, o) => sum + (o.votesCount || 0), 0);

  const getOptionPercentage = (votesCount?: number) => {
    if (!totalVotes || totalVotes === 0) return 0;
    return Math.round(((votesCount || 0) / totalVotes) * 100);
  };

  const getProgressColor = (index: number) => {
    const colors = [
      'from-indigo-600 to-blue-500',
      'from-emerald-600 to-teal-500',
      'from-amber-500 to-orange-500',
      'from-purple-600 to-pink-500',
      'from-sky-500 to-cyan-500'
    ];
    return colors[index % colors.length];
  };

  return (
    <div 
      className={`fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className={`relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-indigo-500/20 dark:border-gray-700 overflow-hidden transform transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        dir="rtl"
      >
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-b from-indigo-500/15 via-blue-500/10 to-transparent relative">
          {previewPoll && (
            <div className="absolute top-3 left-12 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              معاينة تجريبية
            </div>
          )}

          <button
            onClick={handleClose}
            className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-white/70 dark:bg-gray-700/70 hover:bg-white dark:hover:bg-gray-700 rounded-full transition shadow-sm backdrop-blur-sm"
            title="إغلاق"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-2xl shadow-md shrink-0">
              <Vote className="w-7 h-7" />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-indigo-100 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                  <Sparkles size={12} />
                  <span>استطلاع رأي المنصة</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <Users size={12} />
                  <span>{poll.targetRole === 'merchant' ? 'للتجار' : poll.targetRole === 'supplier' ? 'للموردين' : 'للجميع'}</span>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug">
                {poll.question}
              </h3>
            </div>
          </div>
        </div>

        {/* Description if present */}
        {poll.description && (
          <div className="px-6 py-2">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-gray-50 dark:bg-gray-750 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700">
              {poll.description}
            </p>
          </div>
        )}

        {/* Options List */}
        <div className="px-6 py-4 space-y-3 max-h-[50vh] overflow-y-auto">
          {!hasVoted ? (
            // Voting Mode
            poll.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedOptionId(option.id)}
                  type="button"
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-right group ${
                    isSelected
                      ? 'border-[#4f46e5] bg-indigo-50/70 dark:bg-indigo-950/40 text-[#4f46e5] dark:text-indigo-300 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <span className="font-bold text-sm sm:text-base leading-snug">
                    {option.text}
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mr-3 transition-colors ${
                    isSelected 
                      ? 'border-[#4f46e5] bg-[#4f46e5] text-white' 
                      : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'
                  }`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              );
            })
          ) : (
            // Results Mode (After voting or if user already voted)
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1 mb-2">
                <span className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span>شكراً لك! تم تسجيل رأيك بنجاح</span>
                </span>
                <span className="font-bold">{totalVotes} مشارك</span>
              </div>

              {poll.options.map((option, idx) => {
                const percentage = getOptionPercentage(option.votesCount);
                const isUserChoice = userVotedOptionId === option.id;

                return (
                  <div
                    key={option.id}
                    className={`relative p-3.5 rounded-2xl border overflow-hidden transition-all ${
                      isUserChoice
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
                    }`}
                  >
                    {/* Animated Progress Bar Fill */}
                    <div
                      className={`absolute top-0 bottom-0 right-0 opacity-15 dark:opacity-25 bg-gradient-to-l ${getProgressColor(idx)} transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />

                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {option.text}
                        </span>
                        {isUserChoice && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                            <Check size={10} strokeWidth={3} />
                            <span>خيارك</span>
                          </span>
                        )}
                      </div>

                      <div className="text-left shrink-0">
                        <span className="font-black text-sm text-gray-900 dark:text-white">
                          %{percentage}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                          ({option.votesCount || 0} صوت)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 pt-3 bg-gray-50/80 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700/80 flex flex-col-reverse sm:flex-row items-center gap-3">
          <button
            onClick={handleClose}
            type="button"
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition shadow-sm"
          >
            {hasVoted ? 'إغلاق النافذة' : 'ربما لاحقاً'}
          </button>

          {!hasVoted && (
            <button
              onClick={handleVoteSubmit}
              disabled={!selectedOptionId || submitting}
              type="button"
              className="w-full sm:flex-1 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#4f46e5] to-indigo-600 hover:from-[#4338ca] hover:to-indigo-700 transition shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري تسجيل صوتك...</span>
                </>
              ) : (
                <>
                  <Vote size={16} />
                  <span>تأكيد التصويت</span>
                </>
              )}
            </button>
          )}

          {hasVoted && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mr-auto">
              <BarChart3 size={14} className="text-[#4f46e5]" />
              <span>النتائج تتحدث مباشرة مع كل تصويت جديد</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
