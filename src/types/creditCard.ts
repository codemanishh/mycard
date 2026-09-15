export interface CreditCard {
  id: string;
  bankName: string;
  cardName: string;
  billingDate: number; // Day of month (1-31)
  currentBill: number;
  overdueAmount?: number;
  lastPaidBillingDate?: string; // YYYY-MM-DD statement date that was paid
  isSharedLimit?: boolean; // Whether credit limit is shared across cards of the same bank
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

export interface CardLimitAndUtilization {
  isShared: boolean;
  limit: number;
  totalDue: number; // Combined due if shared, individual due if not
  individualDue: number; // Spend/due on this specific card
  availableLimit: number;
  utilizationPercent: number;
  bankCardsCount: number;
}

import type { Expense } from './expense';

export const getCardBillStatus = (card: CreditCard, expenses?: Expense[]): CardBillStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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

  // Current statement cutoff date:
  // If currentDay >= billingDate: statement date is billingDate of current month (e.g. 15 Sep 23:59:59)
  // If currentDay < billingDate: statement date is billingDate of previous month (e.g. 15 Aug 23:59:59)
  let statementDate: Date;
  if (currentDay >= card.billingDate) {
    statementDate = new Date(currentYear, currentMonth, card.billingDate, 23, 59, 59, 999);
  } else {
    statementDate = new Date(currentYear, currentMonth - 1, card.billingDate, 23, 59, 59, 999);
  }

  // Retrieve last paid statement date for this card
  let lastPaidDateStr = card.lastPaidBillingDate;
  if (!lastPaidDateStr && typeof window !== 'undefined') {
    lastPaidDateStr = localStorage.getItem(`card_last_paid_${card.id}`) || undefined;
  }
  if (!lastPaidDateStr && card.notes && card.notes.includes('[LAST_PAID:')) {
    const match = card.notes.match(/\[LAST_PAID:([\d-]+)\]/);
    if (match) lastPaidDateStr = match[1];
  }

  let lastPaidDate: Date | null = null;
  if (lastPaidDateStr) {
    const parts = lastPaidDateStr.split('-');
    if (parts.length === 3) {
      lastPaidDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59, 999);
    }
  }

  let overdueAmount = 0;
  let currentAmount = 0;

  if (expenses && expenses.length > 0) {
    const cardExpenses = expenses.filter(
      e => e.paymentMethod === 'credit_card' && e.paymentSourceId === card.id
    );

    if (cardExpenses.length > 0) {
      cardExpenses.forEach(exp => {
        const parts = exp.date.split('-');
        if (parts.length === 3) {
          const expYear = parseInt(parts[0], 10);
          const expMonth = parseInt(parts[1], 10) - 1;
          const expDay = parseInt(parts[2], 10);
          const expDateTime = new Date(expYear, expMonth, expDay, 0, 0, 0, 0);

          // An expense is considered paid if it occurred on or before lastPaidDate
          const isPaid = lastPaidDate ? expDateTime <= lastPaidDate : false;

          if (!isPaid) {
            if (expDateTime <= statementDate) {
              overdueAmount += exp.amount;
            } else {
              currentAmount += exp.amount;
            }
          }
        }
      });
    } else {
      currentAmount = Math.max(0, card.currentBill || 0);
      if (card.overdueAmount && card.overdueAmount > 0) {
        overdueAmount = card.overdueAmount;
      }
    }
  } else {
    currentAmount = Math.max(0, card.currentBill || 0);
    if (card.overdueAmount && card.overdueAmount > 0) {
      overdueAmount = card.overdueAmount;
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

export const getCardLimitAndUtilization = (
  card: CreditCard,
  allCards: CreditCard[] = [],
  expenses?: Expense[]
): CardLimitAndUtilization => {
  const cardStatus = getCardBillStatus(card, expenses);
  const individualDue = cardStatus.totalDue;

  // Check if target card is marked as shared limit
  const isTargetShared = Boolean(
    card.isSharedLimit ||
    (card.notes && card.notes.includes('[SHARED_LIMIT:true]')) ||
    (typeof window !== 'undefined' && localStorage.getItem(`card_shared_limit_${card.id}`) === 'true')
  );

  if (!isTargetShared || !allCards || allCards.length === 0) {
    const limit = card.limitAmount || 0;
    const availableLimit = Math.max(0, limit - individualDue);
    const utilizationPercent = limit > 0 ? Math.min(100, Math.round((individualDue / limit) * 100)) : 0;
    return {
      isShared: false,
      limit,
      totalDue: individualDue,
      individualDue,
      availableLimit,
      utilizationPercent,
      bankCardsCount: 1,
    };
  }

  // Find all cards of the SAME bank that have shared limit enabled
  const normalizedBankName = card.bankName.trim().toLowerCase();
  const sameBankSharedCards = allCards.filter(c => {
    const cBank = c.bankName.trim().toLowerCase();
    if (cBank !== normalizedBankName) return false;
    return Boolean(
      c.isSharedLimit ||
      (c.notes && c.notes.includes('[SHARED_LIMIT:true]')) ||
      (typeof window !== 'undefined' && localStorage.getItem(`card_shared_limit_${c.id}`) === 'true')
    );
  });

  if (!sameBankSharedCards.some(c => c.id === card.id)) {
    sameBankSharedCards.push(card);
  }

  const sharedLimit = Math.max(...sameBankSharedCards.map(c => c.limitAmount || 0), card.limitAmount || 0);

  const totalBankDue = sameBankSharedCards.reduce((sum, c) => {
    const status = getCardBillStatus(c, expenses);
    return sum + status.totalDue;
  }, 0);

  const availableLimit = Math.max(0, sharedLimit - totalBankDue);
  const utilizationPercent = sharedLimit > 0 ? Math.min(100, Math.round((totalBankDue / sharedLimit) * 100)) : 0;

  return {
    isShared: true,
    limit: sharedLimit,
    totalDue: totalBankDue,
    individualDue,
    availableLimit,
    utilizationPercent,
    bankCardsCount: sameBankSharedCards.length,
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
