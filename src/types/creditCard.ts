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
  const explicitOverdue = Math.max(0, card.overdueAmount || 0);

  // If explicit overdue amount is provided
  if (explicitOverdue > 0) {
    return {
      isOverdue: true,
      overdueDays: currentDay > card.billingDate ? currentDay - card.billingDate : 1,
      daysLeft: 0,
      overdueAmount: explicitOverdue,
      currentAmount: card.currentBill,
      totalDue: explicitOverdue + card.currentBill,
      statusLabel: 'Overdue',
    };
  }

  // If current day has passed billing date and bill > 0, it's overdue for this month!
  if (currentDay > card.billingDate && card.currentBill > 0) {
    const overdueDays = currentDay - card.billingDate;
    return {
      isOverdue: true,
      overdueDays,
      daysLeft: 0,
      overdueAmount: card.currentBill,
      currentAmount: 0,
      totalDue: card.currentBill,
      statusLabel: overdueDays === 1 ? '1d Overdue' : `${overdueDays}d Overdue`,
    };
  }

  // Not overdue: billing date is today or in the future
  const daysLeft = card.billingDate - currentDay;
  return {
    isOverdue: false,
    overdueDays: 0,
    daysLeft: Math.max(0, daysLeft),
    overdueAmount: 0,
    currentAmount: card.currentBill,
    totalDue: card.currentBill,
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
