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
  category: 'petrol' | 'food' | 'shopping' | 'bills' | 'transport' | 'entertainment' | 'other';
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
  borrowerPhone?: string;
  isReturned: boolean;
  note?: string;
  createdAt: string;
}

export const EXPENSE_CATEGORIES = [
  { value: 'petrol', label: 'Petrol / Fuel', emoji: '⛽' },
  { value: 'food', label: 'Food', emoji: '🍔' },
  { value: 'shopping', label: 'Shopping', emoji: '🛒' },
  { value: 'bills', label: 'Bills', emoji: '📄' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { value: 'other', label: 'Other', emoji: '📦' },
] as const;

export const POPULAR_STORES = [
  'Indian Oil', 'Bharat Petroleum', 'HP Fuel', 'Shell',
  'Flipkart', 'Amazon', 'BigBasket', 'Swiggy', 'Zomato', 
  'DMart', 'Reliance Fresh', 'More', 'Blinkit', 'Zepto'
];
