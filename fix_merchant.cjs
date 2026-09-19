const fs = require('fs');
let content = fs.readFileSync('src/pages/merchant/MerchantOrders.tsx', 'utf8');

content = content.replace(/const getBidFinalPrices = \(bidPrice: number, reqQuantity: number\) => \{[\s\S]*?return calculateFinalPrice\(bidPrice \/ reqQuantity, reqQuantity, profitSettings\);\n  \};/m, 
`const getBidFinalPrices = (bid: any, reqQuantity: number) => {
    if (!bid) return { finalItemPrice: 0, finalTotal: 0, platformProfit: 0 };
    const rawTotal = typeof bid === 'number' ? bid : (bid.cost_price || bid.price);
    if (!rawTotal) return { finalItemPrice: 0, finalTotal: 0, platformProfit: 0 };
    return calculateFinalPrice(rawTotal / reqQuantity, reqQuantity, profitSettings);
  };`);

content = content.replace(/getBidFinalPrices\(\s*price\s*,/g, 'getBidFinalPrices(selectedBidForPayment,');
content = content.replace(/getBidFinalPrices\(\s*selectedBidForPayment\.price\s*,/g, 'getBidFinalPrices(selectedBidForPayment,');
content = content.replace(/getBidFinalPrices\(\s*bidData\.price\s*,/g, 'getBidFinalPrices(bidData,');
content = content.replace(/getBidFinalPrices\(\s*bid\.price\s*,/g, 'getBidFinalPrices(bid,');
content = content.replace(/getBidFinalPrices\(\s*negotiationBid\.price\s*,/g, 'getBidFinalPrices(negotiationBid,');

fs.writeFileSync('src/pages/merchant/MerchantOrders.tsx', content);
console.log('Done!');
