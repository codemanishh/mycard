import { CreditCard as CreditCardType, getCardBillStatus } from '@/types/creditCard';
import { BankLogo, getBankColor } from '@/components/BankLogo';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface CardCircleProps {
  card: CreditCardType;
  onClick: (card: CreditCardType) => void;
  index: number;
}

export const CardCircle = ({ card, onClick, index }: CardCircleProps) => {
  const status = getCardBillStatus(card);
  const bankColor = getBankColor(card.bankName);
  const cleanCardTitle = card.cardName.replace(/^R_/, '').replace(/_/g, ' ');

  const hasOverdue = status.isOverdue && status.overdueAmount > 0;
  const hasCurrent = status.currentAmount > 0 && hasOverdue;
  const isUrgent = hasOverdue || (status.totalDue > 0 && status.daysLeft <= 2);
  const isAlert = status.totalDue > 0 && status.daysLeft <= 5;

  return (
    <div 
      className="flex flex-col items-center gap-1.5 animate-fade-in group cursor-pointer" 
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={() => onClick(card)}
    >
      <div className={cn(
        "relative transition-all duration-200 transform group-hover:-translate-y-1 group-hover:scale-105 active:scale-95",
        card.status === 'blocked' && "opacity-50 saturate-50"
      )}>
        {/* Soft Bank Accent Shadow */}
        <div 
          className="absolute inset-0 rounded-full blur-md opacity-25 group-hover:opacity-60 transition-opacity"
          style={{ backgroundColor: bankColor }}
        />

        {/* Clean Circle Avatar */}
        <div
          className={cn(
            "relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full flex items-center justify-center p-2.5",
            "bg-card border-2 shadow-sm transition-all overflow-hidden",
            hasOverdue
              ? "border-red-600 ring-2 ring-red-600/40"
              : isUrgent 
                ? "border-red-500 ring-2 ring-red-500/30" 
                : isAlert 
                  ? "border-amber-500 ring-2 ring-amber-500/20" 
                  : "border-border/60 hover:border-primary"
          )}
        >
          {/* ONLY the crisp Bank Logo inside the circle */}
          <BankLogo bankName={card.bankName} size="md" className="shadow-sm" />
        </div>
        
        {/* Compact Floating Status Badge */}
        <span className={cn(
          "absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-extrabold shadow-md z-10 border border-white/50 whitespace-nowrap",
          hasOverdue
            ? "bg-red-600 text-white animate-pulse"
            : isUrgent 
              ? "bg-red-600 text-white" 
              : isAlert 
                ? "bg-amber-500 text-white" 
                : "bg-emerald-500 text-white"
        )}>
          {hasOverdue ? (
            <span className="flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> {status.statusLabel}
            </span>
          ) : isUrgent ? (
            <span className="flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> {status.daysLeft}d
            </span>
          ) : (
            status.statusLabel
          )}
        </span>
      </div>
      
      {/* Labels below circle */}
      <div className="text-center space-y-0.5 max-w-[100px] sm:max-w-[115px]">
        {/* Line 1: Clean Card Name (Primary Title) */}
        <p className="text-xs font-bold text-foreground leading-tight truncate title-case">
          {cleanCardTitle}
        </p>

        {/* Line 2: Bank Name (Subtitle) */}
        <p className="text-[10px] text-muted-foreground truncate leading-tight">
          {card.bankName}
        </p>

        {/* Line 3: Overdue & Current Month Amount breakdown */}
        {hasOverdue && hasCurrent ? (
          <div className="space-y-0 text-center leading-tight">
            <p className="text-[10px] font-extrabold text-red-600 dark:text-red-400 font-mono truncate">
              Due: ₹{status.overdueAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono truncate">
              Curr: ₹{status.currentAmount.toLocaleString('en-IN')}
            </p>
          </div>
        ) : hasOverdue ? (
          <p className="text-[11px] font-extrabold text-red-600 dark:text-red-400 font-mono leading-tight truncate">
            ₹{status.overdueAmount.toLocaleString('en-IN')} <span className="text-[9px] font-bold uppercase">(OVERDUE)</span>
          </p>
        ) : (
          <p className="text-[11px] font-bold font-mono leading-tight truncate text-emerald-600 dark:text-emerald-400">
            ₹{status.totalDue > 0 ? status.totalDue.toLocaleString('en-IN') : '0'}
          </p>
        )}
      </div>
    </div>
  );
};
