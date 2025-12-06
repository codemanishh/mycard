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
  const isDue = daysLeft <= 3 && card.currentBill > 0;
  const isUpcoming = daysLeft <= 7 && card.currentBill > 0;
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
            isDue && "border-destructive ring-2 md:ring-4 ring-destructive/20",
            isUpcoming && !isDue && "border-warning ring-2 md:ring-4 ring-warning/20",
            !isUpcoming && !isDue && "border-border"
          )}
        >
          <BankLogo bankName={card.bankName} size="md" />
        </div>
        
        {/* Badge */}
        {card.currentBill > 0 && daysLeft <= 7 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 min-w-[18px] md:min-w-[22px] h-[18px] md:h-[22px] px-1 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-bold shadow-lg",
            isDue ? "bg-destructive text-white" : "bg-warning text-white"
          )}>
            {daysLeft}d
          </span>
        )}
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
