export type SupplierTier = 'NEW' | 'SILVER' | 'GOLD' | 'PLATINUM';

export const getSupplierTierFromBadge = (badge?: string | null): SupplierTier => {
  if (!badge) return 'NEW';
  const b = String(badge).toLowerCase().trim();
  if (b === 'platinum') return 'PLATINUM';
  if (b === 'gold') return 'GOLD';
  if (b === 'blue' || b === 'silver') return 'SILVER';
  return 'NEW';
};

export const getSupplierBadgeFromTier = (tier?: string | null): string => {
  if (!tier) return 'none';
  const t = String(tier).toUpperCase().trim();
  if (t === 'PLATINUM') return 'platinum';
  if (t === 'GOLD') return 'gold';
  if (t === 'SILVER') return 'blue';
  return 'none';
};

export const getSupplierRatingInfo = (badge?: string | null) => {
  const tier = getSupplierTierFromBadge(badge);
  switch (tier) {
    case 'PLATINUM':
      return { tier, rating: 5.0, totalReviews: 18 };
    case 'GOLD':
      return { tier, rating: 4.8, totalReviews: 12 };
    case 'SILVER':
      return { tier, rating: 4.5, totalReviews: 6 };
    case 'NEW':
    default:
      return { tier, rating: 0, totalReviews: 0 };
  }
};
