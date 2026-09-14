export interface CreditCard {
  id: string;
  bankName: string;
  cardName: string;
  billingDate: number; // Day of month (1-31)
  currentBill: number;
  overdueAmount?: number;
  status: 'active' | 'blocked' | 'inactive';
  limitType: 'monthly' | 'per-transaction' | 'full-card';
  limitAmount: number;
  notes?: string;
  logo?: string;
  cardNumber?: string;
  expiryDate?: string;
  createdAt: string;
}

export interface CardBillStatus {
  isOverdue: boolean;
  overdueDays: number;
  daysLeft: number;
  overdueAmount: number;
  currentAmount: number;
  totalDue: number;
  statusLabel: string;
}

export const getCardBillStatus = (card: CreditCard): CardBillStatus => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Next statement / billing date calculation
  let nextBillingDate = new Date(currentYear, currentMonth, card.billingDate);
  if (currentDay >= card.billingDate) {
    nextBillingDate = new Date(currentYear, currentMonth + 1, card.billingDate);
  }
  const diffTime = nextBillingDate.getTime() - today.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const explicitOverdue = Math.max(0, card.overdueAmount || 0);
  const currentBill = Math.max(0, card.currentBill || 0);
  const totalUnpaid = explicitOverdue + currentBill;

  // Case A: Bill is 100% PAID / CLEARED (totalUnpaid === 0)
  if (totalUnpaid === 0) {
    return {
      isOverdue: false,
      overdueDays: 0,
      daysLeft: daysLeft === 0 ? 30 : daysLeft,
      overdueAmount: 0,
      currentAmount: 0,
      totalDue: 0,
      statusLabel: `${daysLeft === 0 ? 30 : daysLeft}d left`,
    };
  }

  // Case B: Explicit overdue amount exists
  if (explicitOverdue > 0) {
    const overdueDays = Math.max(1, currentDay >= card.billingDate ? currentDay - card.billingDate : 1);
    return {
      isOverdue: true,
      overdueDays,
      daysLeft,
      overdueAmount: explicitOverdue,
      currentAmount: currentBill,
      totalDue: totalUnpaid,
      statusLabel: `${overdueDays}d Overdue`,
    };
  }

  // Case C: Today is ON or PAST the billing date (currentDay >= card.billingDate) with unpaid bill
  if (currentDay >= card.billingDate && currentBill > 0) {
    const overdueDays = currentDay - card.billingDate;
    const isDueToday = overdueDays === 0;

    return {
      isOverdue: true,
      overdueDays,
      daysLeft,
      overdueAmount: currentBill,
      currentAmount: 0,
      totalDue: currentBill,
      statusLabel: isDueToday ? 'Due Today' : `${overdueDays}d Overdue`,
    };
  }

  // Case D: Today is BEFORE the billing date (currentDay < card.billingDate) with unpaid bill
  return {
    isOverdue: false,
    overdueDays: 0,
    daysLeft,
    overdueAmount: 0,
    currentAmount: currentBill,
    totalDue: currentBill,
    statusLabel: daysLeft === 0 ? 'Due Today' : `${daysLeft}d left`,
  };
};

// Bank names list for reference
export const BANK_NAMES = [
  'ICICI Bank',
  'HDFC Bank',
  'Axis Bank',
  'BharatPe',
  'SBI',
  'Kotak',
  'Kotak Bank',
  'American Express',
  'Yes Bank',
  'IndusInd Bank',
  'RBL Bank',
  'IDFC First Bank',
  'Federal Bank',
  'AU Small Finance Bank',
  'OneCard',
] as const;
