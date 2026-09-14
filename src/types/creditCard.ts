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

import type { Expense } from './expense';

export const getCardBillStatus = (card: CreditCard, expenses?: Expense[]): CardBillStatus => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Days left calculation until next statement / billing date
  let nextBillingDate = new Date(currentYear, currentMonth, card.billingDate);
  if (currentDay >= card.billingDate) {
    nextBillingDate = new Date(currentYear, currentMonth + 1, card.billingDate);
  }
  const diffTime = nextBillingDate.getTime() - today.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let overdueAmount = 0;
  let currentAmount = Math.max(0, card.currentBill || 0);

  // If user explicitly marked overdue as paid (card.overdueAmount === 0), honor it!
  const isExplicitlyPaid = card.overdueAmount === 0;

  // Calculate dynamic cycle breakdown if expenses exist
  if (expenses && expenses.length > 0) {
    const cardExpenses = expenses.filter(
      e => e.paymentMethod === 'credit_card' && e.paymentSourceId === card.id
    );

    if (cardExpenses.length > 0) {
      let calcOverdue = 0;
      let calcCurrent = 0;

      // Current cycle start date:
      // If today >= billingDate: cycle started on billingDate of current month
      // If today < billingDate: cycle started on billingDate of previous month
      let cycleStartDate: Date;
      if (currentDay >= card.billingDate) {
        cycleStartDate = new Date(currentYear, currentMonth, card.billingDate);
      } else {
        cycleStartDate = new Date(currentYear, currentMonth - 1, card.billingDate);
      }
      cycleStartDate.setHours(0, 0, 0, 0);

      cardExpenses.forEach(exp => {
        const parts = exp.date.split('-');
        if (parts.length === 3) {
          const expYear = parseInt(parts[0], 10);
          const expMonth = parseInt(parts[1], 10) - 1;
          const expDay = parseInt(parts[2], 10);
          const expDateTime = new Date(expYear, expMonth, expDay, 0, 0, 0, 0);

          if (expDateTime < cycleStartDate) {
            calcOverdue += exp.amount;
          } else {
            calcCurrent += exp.amount;
          }
        }
      });

      if (!isExplicitlyPaid && calcOverdue > 0) {
        overdueAmount = calcOverdue;
        currentAmount = Math.max(calcCurrent, (card.currentBill || 0) - calcOverdue);
      } else {
        currentAmount = Math.max(0, card.currentBill || 0);
      }
    }
  }

  // Fallback: If no card expenses were found, but card.overdueAmount > 0 OR (today >= billingDate and card.currentBill > 0)
  if (overdueAmount === 0 && !isExplicitlyPaid) {
    if (card.overdueAmount && card.overdueAmount > 0) {
      overdueAmount = card.overdueAmount;
    } else if (currentDay >= card.billingDate && (card.currentBill || 0) > 0) {
      overdueAmount = card.currentBill;
      currentAmount = 0;
    }
  }

  const isOverdue = overdueAmount > 0;
  let overdueDays = 0;

  if (isOverdue) {
    if (currentDay >= card.billingDate) {
      overdueDays = currentDay - card.billingDate;
    } else {
      const prevBillingDate = new Date(currentYear, currentMonth - 1, card.billingDate);
      const diffOverdue = today.getTime() - prevBillingDate.getTime();
      overdueDays = Math.max(0, Math.floor(diffOverdue / (1000 * 60 * 60 * 24)));
    }
  }

  const statusLabel = isOverdue
    ? (overdueDays === 0 ? 'Due Today' : `${overdueDays}d Overdue`)
    : (daysLeft === 0 ? 'Due Today' : `${daysLeft}d left`);

  return {
    isOverdue,
    overdueDays,
    daysLeft,
    overdueAmount,
    currentAmount,
    totalDue: overdueAmount + currentAmount,
    statusLabel,
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
