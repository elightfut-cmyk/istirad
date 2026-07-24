import { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';

interface CountdownCircleProps {
  depositPaidAt: string;
  onCancel: () => void;
  cancelling?: boolean;
}

export default function CountdownCircle({ depositPaidAt, onCancel, cancelling = false }: CountdownCircleProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const calculateTime = () => {
      const paidDate = new Date(depositPaidAt).getTime();
      const now = new Date().getTime();
      const deadline = paidDate + 24 * 60 * 60 * 1000; // 24 hours
      
      const difference = deadline - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        setProgress(0);
      } else {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft({ hours, minutes, seconds });
        setProgress((difference / (24 * 60 * 60 * 1000)) * 100);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [depositPaidAt]);

  if (isExpired) return null;

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-xl border border-orange-200 w-full mb-4">
      <div className="flex items-center gap-4 w-full">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-gray-200"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`${progress > 20 ? 'text-green-500' : 'text-orange-500'} transition-all duration-1000 ease-linear`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {timeLeft && (
              <span className="text-[10px] font-bold text-gray-700 mt-1 whitespace-nowrap" style={{ direction: 'ltr' }}>
                {timeLeft.hours.toString().padStart(2, '0')}:{timeLeft.minutes.toString().padStart(2, '0')}:{timeLeft.seconds.toString().padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-bold text-orange-700 mb-1">إمكانية إلغاء الصفقة متاحة</h4>
          <p className="text-xs text-orange-600 mb-2">
            يمكنك إلغاء الصفقة واسترجاع العربون طالما لم ينفذ الوقت المتبقي (24 ساعة من تاريخ دفع العربون).
          </p>
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="flex items-center justify-center w-full gap-2 px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {cancelling ? (
              'جاري الإلغاء...'
            ) : (
              <>
                <XCircle size={14} />
                إلغاء الصفقة
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
