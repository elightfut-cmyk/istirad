import { Shield, ShieldCheck, Star, Gem } from 'lucide-react';

export type SupplierTier = 'NEW' | 'SILVER' | 'GOLD' | 'PLATINUM' | string;

export interface SupplierBadgeProps {
  name?: string;
  companyName?: string;
  tier?: SupplierTier;
  rating?: number;
  totalReviews?: number;
  supplierId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  clickable?: boolean;
  className?: string;
}

export default function SupplierBadge({
  name,
  companyName,
  tier = 'NEW',
  rating = 0,
  totalReviews = 0,
  supplierId: _supplierId,
  size = 'sm',
  showName = true,
  clickable: _clickable = true,
  className = '',
}: SupplierBadgeProps) {
  const normalizedTier = (tier || 'NEW').toUpperCase();
  const displayName = companyName || name || 'مورد موثوق';
  const numericRating = Number(rating) || 0;
  const reviewCount = Number(totalReviews) || 0;

  // Tier configuration
  const tierConfig = {
    PLATINUM: {
      label: 'بلاتيني',
      sublabel: 'أعلى موثوقية',
      bgGradient: 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-cyan-300 border-cyan-400/40 shadow-sm shadow-cyan-500/20',
      badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-300/40',
      icon: Gem,
      iconColor: 'text-cyan-400 animate-pulse',
      starColor: 'text-amber-400 fill-amber-400',
    },
    GOLD: {
      label: 'ذهبي',
      sublabel: 'مورد مميز',
      bgGradient: 'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 text-amber-800 dark:text-amber-300 border-amber-400/50 shadow-sm shadow-amber-500/10',
      badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/50',
      icon: ShieldCheck,
      iconColor: 'text-amber-500',
      starColor: 'text-amber-400 fill-amber-400',
    },
    SILVER: {
      label: 'فضي',
      sublabel: 'مورد معتمد',
      bgGradient: 'bg-gradient-to-r from-slate-200/60 via-gray-100 to-slate-200/60 text-slate-800 dark:from-slate-800 dark:via-gray-800 dark:to-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600',
      badgeBg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/60',
      icon: Shield,
      iconColor: 'text-slate-500 dark:text-slate-300',
      starColor: 'text-amber-400 fill-amber-400',
    },
    NEW: {
      label: 'جديد',
      sublabel: 'مورد ناشئ',
      bgGradient: 'bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 text-emerald-800 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 dark:text-emerald-300 border-emerald-300/50 dark:border-emerald-700/40',
      badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/50',
      icon: Shield,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      starColor: 'text-amber-400 fill-amber-400',
    },
  };

  const currentTier = tierConfig[normalizedTier as keyof typeof tierConfig] || tierConfig.NEW;
  const TierIcon = currentTier.icon;

  const sizeClasses = {
    xs: {
      container: 'text-xs gap-1.5 py-0.5 px-2',
      icon: 12,
      star: 11,
      name: 'text-xs font-bold',
      tierBadge: 'text-[10px] px-1.5 py-0.2',
    },
    sm: {
      container: 'text-xs sm:text-sm gap-2 py-1 px-2.5',
      icon: 14,
      star: 13,
      name: 'text-xs sm:text-sm font-bold',
      tierBadge: 'text-[11px] px-2 py-0.5',
    },
    md: {
      container: 'text-sm gap-2.5 py-1.5 px-3',
      icon: 16,
      star: 15,
      name: 'text-sm md:text-base font-bold',
      tierBadge: 'text-xs px-2.5 py-0.5',
    },
    lg: {
      container: 'text-base gap-3 py-2 px-4',
      icon: 20,
      star: 18,
      name: 'text-base md:text-lg font-bold',
      tierBadge: 'text-xs md:text-sm px-3 py-1',
    },
  };

  const currentSize = sizeClasses[size];

  const content = (
    <div
      className={`inline-flex items-center flex-wrap rounded-xl border transition-all duration-200 ${currentTier.bgGradient} ${currentSize.container} ${className} cursor-default`}
      title={`تصنيف المورد: ${currentTier.label} • التقييم: ${numericRating.toFixed(1)} من 5 (${reviewCount} تقييم)`}
    >
      {/* Supplier Name */}
      {showName && (
        <span className={`text-gray-900 dark:text-white truncate max-w-[140px] sm:max-w-[200px] ${currentSize.name}`}>
          {displayName}
        </span>
      )}

      {/* Tier Badge with Shield/Diamond */}
      <span
        className={`inline-flex items-center gap-1 rounded-lg font-extrabold uppercase border ${currentTier.badgeBg} ${currentSize.tierBadge}`}
      >
        <TierIcon size={currentSize.icon} className={currentTier.iconColor} />
        <span>{currentTier.label}</span>
      </span>

      {/* Star Rating & Review Count */}
      <div className="inline-flex items-center gap-1 bg-white/70 dark:bg-black/40 px-1.5 py-0.5 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
        <Star size={currentSize.star} className={currentTier.starColor} />
        <span className="font-black text-gray-900 dark:text-white text-xs">
          {numericRating > 0 ? numericRating.toFixed(1) : 'جديد'}
        </span>
        {reviewCount > 0 && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
            ({reviewCount})
          </span>
        )}
      </div>
    </div>
  );

  // Note: Profile navigation is disabled for now as requested
  return content;
}
