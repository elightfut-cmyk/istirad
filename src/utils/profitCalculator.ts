export interface ProfitSettings {
  markupTier1Percentage: number;
  markupTier2Percentage: number;
  markupTier3Percentage: number;
  markupTier4Percentage: number;
  orderFixedFee: number;
}

export function calculateFinalPrice(
  supplierItemPrice: number,
  quantity: number,
  settings: ProfitSettings
) {
  // 1. Total supplier price
  const totalSupplierPrice = supplierItemPrice * quantity;

  // 2. Dynamic markup percentage
  let markupPercentage = 0;
  if (totalSupplierPrice <= 100000) {
    markupPercentage = settings.markupTier1Percentage / 100;
  } else if (totalSupplierPrice <= 500000) {
    markupPercentage = settings.markupTier2Percentage / 100;
  } else if (totalSupplierPrice <= 2000000) {
    markupPercentage = settings.markupTier3Percentage / 100;
  } else {
    markupPercentage = settings.markupTier4Percentage / 100;
  }

  // 3. Calculate margin and fixed fee
  const markupAmount = totalSupplierPrice * markupPercentage;
  const fixedOrderFee = settings.orderFixedFee;

  // 4. Final outputs
  const finalTotalForMerchant = totalSupplierPrice + markupAmount + fixedOrderFee;
  const finalItemPriceForMerchant = finalTotalForMerchant / quantity;
  const platformProfit = markupAmount + fixedOrderFee;

  return {
    finalItemPrice: finalItemPriceForMerchant,
    finalTotal: finalTotalForMerchant,
    platformProfit: platformProfit,
    supplierTotal: totalSupplierPrice,
    markupPercentage,
  };
}

// Used when a merchant proposes a new FINAL ITEM PRICE
// We need to figure out what the supplier will actually get per item
export function calculateSupplierPriceFromFinal(
  finalItemPrice: number,
  quantity: number,
  settings: ProfitSettings
) {
  const finalTotal = finalItemPrice * quantity;
  const targetSubtotal = finalTotal - settings.orderFixedFee;
  
  if (targetSubtotal <= 0) return 0; // Invalid, price too low even for fixed fee
  
  // F = S + S * M + Fixed
  // F - Fixed = S * (1 + M)
  // S = (F - Fixed) / (1 + M)
  
  // However, M depends on S!
  // We need to test which tier S falls into.
  // We calculate S for each tier, and check if that S actually belongs to that tier.
  
  const thresholds = [
    { limit: 100000, markup: settings.markupTier1Percentage / 100 },
    { limit: 500000, markup: settings.markupTier2Percentage / 100 },
    { limit: 2000000, markup: settings.markupTier3Percentage / 100 },
    { limit: Infinity, markup: settings.markupTier4Percentage / 100 },
  ];
  
  let actualSupplierTotal = 0;
  
  for (const tier of thresholds) {
    const candidateS = targetSubtotal / (1 + tier.markup);
    
    // Check if candidateS falls in this tier
    // The tiers are: 
    // Tier 1: <= 100000
    // Tier 2: 100001 to 500000
    // Tier 3: 500001 to 2000000
    // Tier 4: > 2000000
    
    let isValidForTier = false;
    
    if (tier.limit === 100000 && candidateS <= 100000) {
      isValidForTier = true;
    } else if (tier.limit === 500000 && candidateS > 100000 && candidateS <= 500000) {
      isValidForTier = true;
    } else if (tier.limit === 2000000 && candidateS > 500000 && candidateS <= 2000000) {
      isValidForTier = true;
    } else if (tier.limit === Infinity && candidateS > 2000000) {
      isValidForTier = true;
    }
    
    if (isValidForTier) {
      actualSupplierTotal = candidateS;
      break;
    }
  }
  
  // In case of mathematical edge case floating points not catching, fallback to closest
  if (actualSupplierTotal === 0) {
      // Just approximate based on the highest tier to be safe
      actualSupplierTotal = targetSubtotal / (1 + (settings.markupTier4Percentage / 100));
  }
  
  return actualSupplierTotal / quantity;
}
