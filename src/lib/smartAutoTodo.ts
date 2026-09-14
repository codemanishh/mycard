import { CreditCard as CreditCardType } from '@/types/creditCard';
import { BankAccount, Lending } from '@/types/expense';

export interface SuggestedTask {
  id: string;
  title: string;
  description: string;
  category: 'Finance' | 'Personal' | 'Work' | 'Shopping' | 'Health' | 'Other';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  sourceType: 'credit_card' | 'lending' | 'bank_account' | 'template' | 'monthly_audit';
  sourceId?: string;
}

export const RESEARCHED_FINANCE_TEMPLATES: Array<{
  title: string;
  description: string;
  category: 'Finance' | 'Personal' | 'Health';
  priority: 'low' | 'medium' | 'high';
  icon: string;
  recommendedTag: string;
}> = [
  {
    title: 'Check Credit Score (CIBIL / Experian)',
    description: 'Monitor monthly credit report to detect errors, unauthorized inquiries, or score drops.',
    category: 'Finance',
    priority: 'high',
    icon: '📊',
    recommendedTag: 'Monthly Essential',
  },
  {
    title: 'Review Monthly Bank & Card Statements',
    description: 'Audit transactions for unexpected subscriptions, double charges, or unknown auto-debits.',
    category: 'Finance',
    priority: 'high',
    icon: '🧾',
    recommendedTag: 'Fraud Prevention',
  },
  {
    title: 'Set Aside 20% Income for Emergency Fund',
    description: 'Transfer monthly savings to a high-yield liquid account or emergency fund reserve.',
    category: 'Finance',
    priority: 'high',
    icon: '🛡️',
    recommendedTag: 'Wealth Building',
  },
  {
    title: 'Review & Cancel Unused Subscriptions',
    description: 'Check active OTT, app, or software memberships to stop unnecessary auto-renewals.',
    category: 'Finance',
    priority: 'medium',
    icon: '✂️',
    recommendedTag: 'Cost Saver',
  },
  {
    title: 'Reconcile Bank Account Balance',
    description: 'Match actual bank balance against recorded income, expenses, and pending transfers.',
    category: 'Finance',
    priority: 'medium',
    icon: '🏦',
    recommendedTag: 'Accountability',
  },
  {
    title: 'Organize Digital Expense Receipts & Tax Proofs',
    description: 'Save medical, investment, and business bills for 80C/80D tax deductions.',
    category: 'Finance',
    priority: 'medium',
    icon: '📁',
    recommendedTag: 'Tax Prep',
  },
  {
    title: 'Update Bank Passwords & Enable 2FA Security',
    description: 'Ensure 2-factor authentication is active on all UPI apps, net banking, and cards.',
    category: 'Personal',
    priority: 'high',
    icon: '🔒',
    recommendedTag: 'Cyber Hygiene',
  },
  {
    title: 'Check Active UPI Auto-pay & Mandate Limits',
    description: 'Review recurring e-mandates on phone apps to avoid surprise deductions.',
    category: 'Finance',
    priority: 'low',
    icon: '📲',
    recommendedTag: 'Smart Controls',
  },
];

/**
 * Scans user's financial entities (cards, lendings, bank accounts)
 * and returns auto-detected missed or upcoming tasks.
 */
export function detectMissedFinancialTasks(
  cards: CreditCardType[],
  bankAccounts: BankAccount[],
  lendings: Lending[],
  existingTodoTitles: string[]
): SuggestedTask[] {
  const suggested: SuggestedTask[] = [];
  const existingNormalized = new Set(
    existingTodoTitles.map((t) => t.toLowerCase().trim())
  );

  const today = new Date();
  const currentDay = today.getDate();

  // 1. Credit Card Bills (Due soon or overdue)
  cards.forEach((card) => {
    if (card.status === 'blocked') return;

    const billingDay = card.billingDate;
    let daysUntilBilling = billingDay - currentDay;
    if (daysUntilBilling < 0) {
      // Due next month
      daysUntilBilling += 30;
    }

    // Flag if bill is due in <= 5 days or if current bill balance > 0
    const taskTitle = `Pay ${card.bankName} (${card.cardName}) Bill`;
    if (!existingNormalized.has(taskTitle.toLowerCase().trim())) {
      if (card.currentBill > 0 || daysUntilBilling <= 5) {
        const dueDate = new Date();
        dueDate.setDate(today.getDate() + daysUntilBilling);

        suggested.push({
          id: `auto-card-${card.id}`,
          title: taskTitle,
          description: `Current bill amount: ₹${card.currentBill.toLocaleString()}. Billing day is ${card.billingDate}th of the month.`,
          category: 'Finance',
          priority: card.currentBill > 5000 || daysUntilBilling <= 2 ? 'high' : 'medium',
          due_date: dueDate.toISOString().split('T')[0],
          sourceType: 'credit_card',
          sourceId: card.id,
        });
      }
    }
  });

  // 2. Pending Lendings / Borrowings
  lendings.forEach((lending) => {
    if (lending.isReturned) return;

    const givenDate = new Date(lending.givenDate);
    const diffDays = Math.ceil((today.getTime() - givenDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if reminder date passed or lent for > 7 days
    const isOverdueReminder = lending.reminderDate && new Date(lending.reminderDate) <= today;
    const isOlderThanWeek = diffDays >= 7;

    if (isOverdueReminder || isOlderThanWeek) {
      const taskTitle = `Follow up with ${lending.personName} for ₹${lending.amount.toLocaleString()}`;
      if (!existingNormalized.has(taskTitle.toLowerCase().trim())) {
        suggested.push({
          id: `auto-lending-${lending.id}`,
          title: taskTitle,
          description: `Money given on ${lending.givenDate}.${lending.note ? ` Note: ${lending.note}` : ''}`,
          category: 'Finance',
          priority: diffDays > 14 ? 'high' : 'medium',
          due_date: lending.reminderDate || today.toISOString().split('T')[0],
          sourceType: 'lending',
          sourceId: lending.id,
        });
      }
    }
  });

  // 3. Low Bank Balance Alerts
  bankAccounts.forEach((acc) => {
    if (acc.balance < 1000) {
      const taskTitle = `Top up balance in ${acc.bankName} (${acc.type})`;
      if (!existingNormalized.has(taskTitle.toLowerCase().trim())) {
        suggested.push({
          id: `auto-bank-${acc.id}`,
          title: taskTitle,
          description: `Account balance is low (₹${acc.balance.toLocaleString()}). Keep minimum balance to avoid bank charges.`,
          category: 'Finance',
          priority: 'medium',
          sourceType: 'bank_account',
          sourceId: acc.id,
        });
      }
    }
  });

  // 4. End of Month Financial Review Audit
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  if (currentDay >= daysInMonth - 4) {
    const taskTitle = 'Perform Monthly Expense & Budget Review';
    if (!existingNormalized.has(taskTitle.toLowerCase().trim())) {
      suggested.push({
        id: 'auto-monthly-review',
        title: taskTitle,
        description: 'Month end is approaching. Audit total expenses, credit bills, and bank balances.',
        category: 'Finance',
        priority: 'high',
        due_date: new Date(today.getFullYear(), today.getMonth(), daysInMonth).toISOString().split('T')[0],
        sourceType: 'monthly_audit',
      });
    }
  }

  return suggested;
}
