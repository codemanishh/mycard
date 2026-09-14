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

  const utilizationPercent = card.limitAmount > 0 
    ? Math.min(100, Math.round((card.currentBill / card.limitAmount) * 100))
    : 0;

  return (
    <div 
      className="flex flex-col items-center gap-2 animate-fade-in group cursor-pointer" 
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => onClick(card)}
    >
      <div className={cn(
        "relative transition-all duration-300 transform group-hover:-translate-y-1.5 group-hover:scale-105 active:scale-95",
        card.status === 'blocked' && "opacity-50 saturate-50"
      )}>
        {/* Soft Ambient Halo Glow */}
        <div 
          className="absolute -inset-1.5 rounded-full blur-lg opacity-40 group-hover:opacity-90 transition-opacity duration-300"
          style={{ backgroundColor: bankColor }}
        />
        
        {/* Outer Circular Ring with Metallic Gradient Border */}
        <div
          className={cn(
            "relative w-18 h-18 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-full flex flex-col items-center justify-center p-2.5",
            "bg-gradient-to-br from-card via-card to-secondary/60 shadow-elevated transition-all duration-300 border-2",
            isUrgent 
              ? "border-red-500 ring-4 ring-red-500/30 animate-pulse" 
              : isAlert 
                ? "border-amber-500 ring-4 ring-amber-500/20" 
                : "border-emerald-500/60 hover:border-emerald-500 ring-2 ring-emerald-500/10"
          )}
        >
          {/* Bank Logo */}
          <BankLogo bankName={card.bankName} size="md" className="shadow-md border border-white/20" />
          
          {/* Card Short Name */}
          <span className="text-[10px] sm:text-[11px] font-extrabold text-foreground truncate max-w-full mt-1.5 tracking-tight text-center leading-none">
            {card.cardName}
          </span>

          {/* Mini Gold Chip Indicator on the circle */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-3 rounded-[2px] bg-gradient-to-br from-amber-200 to-yellow-600 border border-amber-300/40 opacity-70 hidden sm:block" />
        </div>
        
        {/* Floating Countdown Badge */}
        <span className={cn(
          "absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 px-2 py-0.5 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-extrabold shadow-lg z-10 border border-white/40 tracking-tight",
          isUrgent 
            ? "bg-red-600 text-white animate-bounce" 
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

        {/* Utilization Ring / Dot */}
        {utilizationPercent > 0 && (
          <span className={cn(
            "absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 text-[9px] font-bold rounded-full border border-white/30 text-white shadow-sm",
            utilizationPercent > 75 ? "bg-red-500" : "bg-slate-800/90"
          )}>
            {utilizationPercent}%
          </span>
        )}
      </div>
      
      {/* Label & Bill Amount */}
      <div className="text-center space-y-0.5 max-w-[90px] sm:max-w-[110px]">
        <p className="text-[11px] sm:text-xs font-bold text-foreground leading-tight truncate">
          {card.bankName}
        </p>
        <p className={cn(
          "text-[11px] sm:text-xs font-extrabold font-mono",
          card.currentBill > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
        )}>
          ₹{card.currentBill > 0 ? card.currentBill.toLocaleString('en-IN') : '0.00'}
        </p>
      </div>
    </div>
  );
};
