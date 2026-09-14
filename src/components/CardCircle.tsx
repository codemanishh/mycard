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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysLeft = getBillingDaysLeft();
  const isAlert = card.currentBill > 0 && daysLeft <= 5;
  const bankColor = getBankColor(card.bankName);

  return (
    <div 
      className="flex flex-col items-center gap-1.5 md:gap-3 animate-fade-in" 
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <button
        onClick={() => onClick(card)}
        className={cn(
          "relative group",
          card.status === 'blocked' && "opacity-50"
        )}
      >
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300 hidden md:block"
          style={{ backgroundColor: bankColor }}
        />
        
        {/* Main circle */}
        <div
          className={cn(
            "relative w-14 h-14 md:w-[72px] md:h-[72px] rounded-xl md:rounded-2xl flex items-center justify-center",
            "transition-all duration-300 group-hover:scale-105 group-active:scale-95",
            "bg-card shadow-card group-hover:shadow-elevated",
            "border-2",
            isAlert 
              ? "border-red-500 ring-2 md:ring-4 ring-red-500/20" 
              : "border-emerald-500 ring-2 md:ring-4 ring-emerald-500/20"
          )}
        >
          <BankLogo bankName={card.bankName} size="md" />
        </div>
        
        {/* Countdown Badge - Displayed on ALL cards */}
        <span className={cn(
          "absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 min-w-[20px] md:min-w-[24px] h-[20px] md:h-[24px] px-1 rounded-full flex items-center justify-center text-[9px] md:text-[11px] font-bold shadow-md z-10 transition-colors",
          isAlert ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
        )}>
          {daysLeft}d
        </span>
      </button>
      
      <div className="text-center space-y-0 md:space-y-0.5 max-w-[70px] md:max-w-[90px]">
        <p className="text-[11px] md:text-sm font-semibold text-foreground leading-tight truncate">{card.cardName}</p>
        <p className="text-[9px] md:text-xs text-muted-foreground truncate">{card.bankName}</p>
        {card.currentBill > 0 && (
          <p className="text-[10px] md:text-xs font-medium text-primary">₹{card.currentBill.toLocaleString('en-IN')}</p>
        )}
      </div>
    </div>
  );
};
