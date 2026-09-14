import { BankAccount } from '@/types/expense';
import { Wallet, TrendingUp } from 'lucide-react';
import { BankLogo } from './BankLogo';

interface BankBalanceCardProps {
  accounts: BankAccount[];
  totalBills?: number;
  onBankClick?: (bank: BankAccount) => void;
}

export const BankBalanceCard = ({ accounts, totalBills = 0, onBankClick }: BankBalanceCardProps) => {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const actualBalance = totalBalance - totalBills;
  
  return (
    <div className="space-y-2 md:space-y-3">
      {/* Total Balance & Actual Balance */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20">
        <div className="flex items-center justify-between gap-3">
          {/* Left Side: Total Balance */}
          <div>
            <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
              <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/70" />
              <span className="text-xs md:text-sm text-white/70">Total Balance</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight">
              ₹{totalBalance.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Right Side: Actual Balance (Slightly Smaller Font Size) */}
          <div className="text-right border-l border-white/20 pl-3 md:pl-4">
            <div className="flex items-center justify-end gap-1 mb-0.5 md:mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-xs md:text-sm text-white/80 font-medium">Actual Balance</span>
            </div>
            <p className={`text-lg md:text-2xl font-bold tracking-tight ${
              actualBalance >= 0 ? 'text-emerald-300' : 'text-red-300'
            }`}>
              ₹{actualBalance.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Individual Banks */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {accounts.map((account) => (
            <button 
              key={account.id} 
              onClick={() => onBankClick?.(account)}
              className="bg-white/10 backdrop-blur-md rounded-lg md:rounded-xl p-2 md:p-3 border border-white/10 flex items-center gap-2 md:gap-3 hover:bg-white/20 transition-colors text-left active:scale-95"
            >
              <BankLogo bankName={account.bankName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-xs text-white/60 truncate">{account.bankName}</p>
                <p className="text-xs md:text-sm font-semibold">
                  ₹{account.balance.toLocaleString('en-IN')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};