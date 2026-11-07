export type SupplierTier = 'NEW' | 'SILVER' | 'GOLD' | 'PLATINUM';

export const getSupplierTierFromBadge = (badge?: string | null): SupplierTier => {
  if (!badge) return 'NEW';
  const b = String(badge).toLowerCase().trim();
  if (b === 'platinum') return 'PLATINUM';
  if (b === 'gold') return 'GOLD';
  // Note: The standard blue verification badge ('blue') signifies a verified supplier,
  // who starts at the 'NEW' tier until completing 5 orders to advance to 'SILVER'.
  return 'NEW';
};

export const getSupplierBadgeFromTier = (tier?: string | null): string => {
  if (!tier) return 'none';
  const t = String(tier).toUpperCase().trim();
  if (t === 'PLATINUM') return 'platinum';
  if (t === 'GOLD') return 'gold';
  if (t === 'SILVER') return 'silver';
  return 'none';
};

/**
 * Calculates supplier tier and returns strictly REAL rating and review count.
 * Completely eliminates fake, hardcoded, or random reviews.
 * Respects explicit tier from database (NEW, SILVER, GOLD, PLATINUM).
 */
export const getSupplierRatingInfo = (
  badge?: string | null,
  realRating?: number | null,
  realTotalReviews?: number | null,
  explicitTier?: string | null
) => {
  let tier: SupplierTier = 'NEW';
  if (explicitTier && ['NEW', 'SILVER', 'GOLD', 'PLATINUM'].includes(explicitTier.toUpperCase())) {
    tier = explicitTier.toUpperCase() as SupplierTier;
  } else {
    tier = getSupplierTierFromBadge(badge);
  }

  const rating = realRating !== undefined && realRating !== null ? Number(realRating) : 0;
  const totalReviews = realTotalReviews !== undefined && realTotalReviews !== null ? Number(realTotalReviews) : 0;

  const badgeTitle = tier === 'PLATINUM' ? 'بلاتيني 💎' : tier === 'GOLD' ? 'ذهبي 🥇' : tier === 'SILVER' ? 'فضي 🥈' : 'جديد 🥉';
  const badgeClass = tier === 'PLATINUM' ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
    : tier === 'GOLD' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
    : tier === 'SILVER' ? 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';

  const hasRealRating = totalReviews > 0 && rating > 0;
  const ratingText = hasRealRating ? rating.toFixed(1) : 'جديد';

  return { 
    tier, 
    rating, 
    totalReviews, 
    badgeTitle, 
    badgeClass, 
    hasRealRating, 
    ratingText 
  };
};
