export interface BillingItem {
  price: number;
  promoValue?: number;
  quantity: number;
}

export interface BillSummary {
  originalSubtotal: number;
  totalDeductions: number;
  finalPayable: number;
}

export function calculateBillSummary(items: BillingItem[]): BillSummary {
  let originalSubtotal = 0;
  let totalDeductions = 0;
  let finalPayable = 0;

  items.forEach(item => {
    const qty = item.quantity || 1;
    const finalPrice = item.price || 0;
    const unitDiscount = item.promoValue || 0;
    // Net price is represented by finalPrice, base price is net + unitDiscount
    const originalUnitPrice = finalPrice + unitDiscount;

    originalSubtotal += (originalUnitPrice * qty);
    totalDeductions += (unitDiscount * qty);
    finalPayable += (finalPrice * qty);
  });

  return {
    originalSubtotal,
    totalDeductions,
    finalPayable
  };
}
