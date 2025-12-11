import { BankAccount } from '@/types/expense';
import { Wallet, Eye, EyeOff } from 'lucide-react';
import { BankLogo } from './BankLogo';
import { useState } from 'react';

interface BankBalanceCardProps {
  accounts: BankAccount[];
  onBankClick?: (bank: BankAccount) => void;
}

export const BankBalanceCard = ({ accounts, onBankClick }: BankBalanceCardProps) => {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // 👁️ State for hiding/showing balance
  const [showBalance, setShowBalance] = useState(false);

  return (
    <div className="space-y-2 md:space-y-3">

      {/* Total Balance */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20">
        <div className="flex items-center justify-between mb-0.5 md:mb-1">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/70" />
            <span className="text-xs md:text-sm text-white/70">Total Balance</span>
          </div>

          {/* 👁️ Eye Toggle Button */}
          <button onClick={() => setShowBalance(!showBalance)}>
            {showBalance ? (
              <EyeOff className="w-4 h-4 text-white/70" />
            ) : (
              <Eye className="w-4 h-4 text-white/70" />
            )}
          </button>
        </div>

        <p className="text-2xl md:text-3xl font-bold tracking-tight">
          {showBalance
            ? `₹${totalBalance.toLocaleString('en-IN')}`
            : '₹XXXXXX'}
        </p>
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
