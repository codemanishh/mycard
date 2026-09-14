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

  const overdueAmount = Math.max(0, card.overdueAmount || 0);
  const currentAmount = Math.max(0, card.currentBill || 0);

  // Card is overdue ONLY if overdueAmount > 0
  if (overdueAmount > 0) {
    const overdueDays = Math.max(1, currentDay >= card.billingDate ? currentDay - card.billingDate : 1);
    return {
      isOverdue: true,
      overdueDays,
      daysLeft,
      overdueAmount,
      currentAmount,
      totalDue: overdueAmount + currentAmount,
      statusLabel: `${overdueDays}d Overdue`,
    };
  }

  // Otherwise, currentAmount is Current Month Bill
  return {
    isOverdue: false,
    overdueDays: 0,
    daysLeft,
    overdueAmount: 0,
    currentAmount,
    totalDue: currentAmount,
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
