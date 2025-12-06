export interface BankAccount {
  id: string;
  bankName: string;
  balance: number;
  type: 'savings' | 'current';
}

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: 'food' | 'shopping' | 'bills' | 'transport' | 'entertainment' | 'other';
  storeName?: string;
  paymentMethod: 'bank' | 'credit_card';
  paymentSourceId: string; // bank account id or credit card id
  paymentSourceName: string;
  note?: string;
  createdAt: string;
}

export interface Lending {
  id: string;
  personName: string;
  amount: number;
  givenDate: string;
  reminderDate?: string;
  isReturned: boolean;
  note?: string;
  createdAt: string;
}

export const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food', emoji: '🍔' },
  { value: 'shopping', label: 'Shopping', emoji: '🛒' },
  { value: 'bills', label: 'Bills', emoji: '📄' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { value: 'other', label: 'Other', emoji: '📦' },
] as const;

export const POPULAR_STORES = [
  'Flipkart', 'Amazon', 'BigBasket', 'Swiggy', 'Zomato', 
  'DMart', 'Reliance Fresh', 'More', 'Blinkit', 'Zepto'
];
