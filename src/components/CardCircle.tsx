import { CreditCard as CreditCardType } from '@/types/creditCard';
import { BankLogo, getBankColor } from '@/components/BankLogo';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface CardCircleProps {
  card: CreditCardType;
  onClick: (card: CreditCardType) => void;
  index: number;
}

export const CardCircle = ({ card, onClick, index }: CardCircleProps) => {
  const getBillingDaysLeft = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let nextBillingDate = new Date(currentYear, currentMonth, card.billingDate);
    if (currentDay >= card.billingDate) {
      nextBillingDate = new Date(currentYear, currentMonth + 1, card.billingDate);
    }
    
    const diffTime = nextBillingDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getBillingDaysLeft();
  const isAlert = card.currentBill > 0 && daysLeft <= 5;
  const isUrgent = card.currentBill > 0 && daysLeft <= 2;
  const bankColor = getBankColor(card.bankName);

  // Clean card name display (stripping legacy raw prefixes like R_ if present)
  const cleanCardTitle = card.cardName.replace(/^R_/, '').replace(/_/g, ' ');

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
            isUrgent 
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
          "absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-md z-10 border border-white/50",
          isUrgent 
            ? "bg-red-600 text-white" 
            : isAlert 
              ? "bg-amber-500 text-white" 
              : "bg-emerald-500 text-white"
        )}>
          {isUrgent ? (
            <span className="flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> {daysLeft}d
            </span>
          ) : (
            `${daysLeft}d left`
          )}
        </span>
      </div>
      
      {/* Labels below circle */}
      <div className="text-center space-y-0.5 max-w-[95px] sm:max-w-[110px]">
        {/* Line 1: Clean Card Name (Primary Title) */}
        <p className="text-xs font-bold text-foreground leading-tight truncate title-case">
          {cleanCardTitle}
        </p>

        {/* Line 2: Bank Name (Subtitle) */}
        <p className="text-[10px] text-muted-foreground truncate leading-tight">
          {card.bankName}
        </p>

        {/* Line 3: Current Bill Amount */}
        <p className={cn(
          "text-[11px] font-bold font-mono leading-tight",
          card.currentBill > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
        )}>
          ₹{card.currentBill > 0 ? card.currentBill.toLocaleString('en-IN') : '0'}
        </p>
      </div>
    </div>
  );
};
