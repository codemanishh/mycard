export type SavingsType = 'cash' | 'sip' | 'stock';

export interface SavingsItem {
  id: string;
  name: string;
  type: SavingsType;
  realValue: number; // Invested / Purchase amount (for Cash, this is the balance)
  currentValue: number; // Current Market value (for Cash, this is equal to realValue)
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SavingsStats {
  totalRealValue: number;
  totalCurrentValue: number;
  totalGain: number;
  totalGainPercent: number;
  
  cashTotal: number;
  cashCount: number;
  
  sipRealValue: number;
  sipCurrentValue: number;
  sipGain: number;
  sipGainPercent: number;
  sipCount: number;
  
  stockRealValue: number;
  stockCurrentValue: number;
  stockGain: number;
  stockGainPercent: number;
  stockCount: number;
}

export const calculateSavingsStats = (savings: SavingsItem[]): SavingsStats => {
  let totalRealValue = 0;
  let totalCurrentValue = 0;

  let cashTotal = 0;
  let cashCount = 0;

  let sipRealValue = 0;
  let sipCurrentValue = 0;
  let sipCount = 0;

  let stockRealValue = 0;
  let stockCurrentValue = 0;
  let stockCount = 0;

  savings.forEach(item => {
    const real = item.realValue || 0;
    const current = item.currentValue || 0;

    totalRealValue += real;
    totalCurrentValue += current;

    if (item.type === 'cash') {
      cashTotal += current;
      cashCount++;
    } else if (item.type === 'sip') {
      sipRealValue += real;
      sipCurrentValue += current;
      sipCount++;
    } else if (item.type === 'stock') {
      stockRealValue += real;
      stockCurrentValue += current;
      stockCount++;
    }
  });

  const totalGain = totalCurrentValue - totalRealValue;
  const totalGainPercent = totalRealValue > 0 ? (totalGain / totalRealValue) * 100 : 0;

  const sipGain = sipCurrentValue - sipRealValue;
  const sipGainPercent = sipRealValue > 0 ? (sipGain / sipRealValue) * 100 : 0;

  const stockGain = stockCurrentValue - stockRealValue;
  const stockGainPercent = stockRealValue > 0 ? (stockGain / stockRealValue) * 100 : 0;

  return {
    totalRealValue,
    totalCurrentValue,
    totalGain,
    totalGainPercent,
    cashTotal,
    cashCount,
    sipRealValue,
    sipCurrentValue,
    sipGain,
    sipGainPercent,
    sipCount,
    stockRealValue,
    stockCurrentValue,
    stockGain,
    stockGainPercent,
    stockCount,
  };
};
