import { CreditCard as CreditCardType, getCardBillStatus, getCardLimitAndUtilization } from '@/types/creditCard';
import { Expense } from '@/types/expense';
import { BankLogo, getBankColor } from '@/components/BankLogo';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Share2 } from 'lucide-react';

interface CardRectangleProps {
  card: CreditCardType;
  cards?: CreditCardType[];
  onClick: (card: CreditCardType) => void;
  index: number;
  expenses?: Expense[];
}

export const CardRectangle = ({ card, cards = [], onClick, index, expenses }: CardRectangleProps) => {
  const status = getCardBillStatus(card, expenses);
  const limitInfo = getCardLimitAndUtilization(card, cards, expenses);
  const bankColor = getBankColor(card.bankName);
  const cleanCardTitle = card.cardName.replace(/^R_/, '').replace(/_/g, ' ');

  const hasOverdue = status.isOverdue && status.overdueAmount > 0;

  return (
    <div 
      onClick={() => onClick(card)}
      style={{ animationDelay: `${index * 0.05}s` }}
      className={cn(
        "group relative rounded-2xl p-3 transition-all duration-300 cursor-pointer overflow-hidden border shadow-sm hover:shadow-md",
        "bg-card/90 backdrop-blur-xl hover:-translate-y-0.5 active:scale-[0.99]",
        hasOverdue
          ? "border-red-500/50 ring-1 ring-red-500/30"
          : "border-border/60 hover:border-primary/50"
      )}
    >
      {/* Decorative Top Accent Glow */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 opacity-80 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: bankColor }}
      />

      {/* Unified Compact Div Container */}
      <div className="flex flex-col gap-2">
        {/* Header Row: Bank Logo + Title & Bank + Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BankLogo bankName={card.bankName} size="sm" className="shadow-xs border border-border/40 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight title-case">
                {cleanCardTitle}
              </h3>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate leading-tight">
                <span>{card.bankName}</span>
                {limitInfo.isShared && (
                  <span className="inline-flex items-center gap-0.5 px-1 rounded bg-primary/15 text-primary font-extrabold text-[9px]">
                    <Share2 className="w-2.5 h-2.5" /> Shared Limit
                  </span>
                )}
              </div>
            </div>
          </div>

          <Badge 
            className={cn(
              "text-[10px] px-2 py-0.5 font-extrabold rounded-full border shrink-0 transition-all",
              hasOverdue 
                ? "bg-red-600 text-white border-red-400 animate-pulse" 
                : status.daysLeft <= 5 
                  ? "bg-amber-500 text-white border-amber-300"
                  : "bg-emerald-500 text-white border-emerald-300"
            )}
          >
            {hasOverdue ? (
              <span className="flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> {status.statusLabel}
              </span>
            ) : (
              <span className="flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> {status.statusLabel}
              </span>
            )}
          </Badge>
        </div>

        {/* Breakdown Amounts Row (In-Line Compact Badges) */}
        <div className="flex items-center gap-2 pt-1.5 border-t border-border/30 text-xs">
          <div className={cn(
            "flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg border transition-colors",
            hasOverdue ? "bg-red-500/10 border-red-500/30" : "bg-muted/30 border-border/30"
          )}>
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Due</span>
            <span className={cn(
              "font-extrabold text-xs font-mono ml-1",
              hasOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
            )}>
              ₹{status.overdueAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Current</span>
            <span className="font-bold text-xs font-mono text-emerald-600 dark:text-emerald-400 ml-1">
              ₹{status.currentAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
