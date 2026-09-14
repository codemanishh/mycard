import { CreditCard as CreditCardType } from '@/types/creditCard';
import { BankLogo, getBankColor } from '@/components/BankLogo';
import { cn } from '@/lib/utils';

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

  return (
    <div 
      className="flex flex-col items-center gap-1.5 md:gap-2 animate-fade-in group" 
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <button
        type="button"
        onClick={() => onClick(card)}
        className={cn(
          "relative transition-all duration-300 transform group-hover:-translate-y-1 active:scale-95 focus:outline-none",
          card.status === 'blocked' && "opacity-50 saturate-50"
        )}
      >
        {/* Soft Ambient Glow Effect */}
        <div 
          className="absolute -inset-1 rounded-2xl md:rounded-3xl blur-md opacity-30 group-hover:opacity-75 transition-opacity duration-300"
          style={{ backgroundColor: bankColor }}
        />
        
        {/* Main Card Icon Box */}
        <div
          className={cn(
            "relative w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center p-2",
            "transition-all duration-300 bg-card border-2 shadow-elevated",
            isUrgent 
              ? "border-red-500 ring-4 ring-red-500/30 animate-pulse" 
              : isAlert 
                ? "border-amber-500 ring-4 ring-amber-500/20" 
                : "border-emerald-500/60 ring-2 ring-emerald-500/10 hover:border-emerald-500"
          )}
        >
          <BankLogo bankName={card.bankName} size="md" className="shadow-sm" />
          <span className="text-[9px] md:text-[10px] font-bold text-foreground truncate max-w-full mt-1">
            {card.cardName}
          </span>
        </div>
        
        {/* Countdown Badge */}
        <span className={cn(
          "absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 px-1.5 py-0.5 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-extrabold shadow-lg z-10 border border-white/40",
          isUrgent 
            ? "bg-red-600 text-white animate-bounce" 
            : isAlert 
              ? "bg-amber-500 text-white" 
              : "bg-emerald-500 text-white"
        )}>
          {daysLeft}d
        </span>
      </button>
      
      {/* Label & Bill details */}
      <div className="text-center space-y-0.5 max-w-[80px] md:max-w-[100px]">
        <p className="text-[11px] md:text-xs font-semibold text-foreground leading-tight truncate">
          {card.bankName}
        </p>
        <p className={cn(
          "text-[10px] md:text-xs font-bold font-mono",
          card.currentBill > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
        )}>
          ₹{card.currentBill > 0 ? card.currentBill.toLocaleString('en-IN') : '0'}
        </p>
      </div>
    </div>
  );
};
