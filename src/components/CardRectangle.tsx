import { CreditCard as CreditCardType, getCardBillStatus } from '@/types/creditCard';
import { Expense } from '@/types/expense';
import { BankLogo, getBankColor } from '@/components/BankLogo';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CardRectangleProps {
  card: CreditCardType;
  onClick: (card: CreditCardType) => void;
  index: number;
  expenses?: Expense[];
}

export const CardRectangle = ({ card, onClick, index, expenses }: CardRectangleProps) => {
  const status = getCardBillStatus(card, expenses);
  const bankColor = getBankColor(card.bankName);
  const cleanCardTitle = card.cardName.replace(/^R_/, '').replace(/_/g, ' ');

  const hasOverdue = status.isOverdue && status.overdueAmount > 0;

  return (
    <div 
      onClick={() => onClick(card)}
      style={{ animationDelay: `${index * 0.05}s` }}
      className={cn(
        "group relative rounded-2xl p-3.5 sm:p-4 transition-all duration-300 cursor-pointer overflow-hidden border shadow-card hover:shadow-elevated",
        "bg-card/90 backdrop-blur-xl hover:-translate-y-1 active:scale-[0.99]",
        hasOverdue
          ? "border-red-500/50 ring-2 ring-red-500/20"
          : "border-border/60 hover:border-primary/50"
      )}
    >
      {/* Decorative Top Accent Glow */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: bankColor }}
      />

      {/* Top Header: Bank Logo + Card Name & Bank Name + Status Badge */}
      <div className="flex items-center justify-between gap-2.5 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <BankLogo bankName={card.bankName} size="md" className="shadow-sm border border-border/40 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate leading-tight title-case">
              {cleanCardTitle}
            </h3>
            <p className="text-xs text-muted-foreground truncate leading-tight">
              {card.bankName}
            </p>
          </div>
        </div>

        {/* Floating Status Pill Badge */}
        <Badge 
          className={cn(
            "text-[10px] sm:text-xs px-2.5 py-0.5 font-extrabold rounded-full border shadow-sm shrink-0 transition-all",
            hasOverdue 
              ? "bg-red-600 text-white border-red-400 animate-pulse" 
              : status.daysLeft <= 5 
                ? "bg-amber-500 text-white border-amber-300"
                : "bg-emerald-500 text-white border-emerald-300"
          )}
        >
          {hasOverdue ? (
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {status.statusLabel}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {status.statusLabel}
            </span>
          )}
        </Badge>
      </div>

      {/* Middle Section: Clean Billed Breakdown Cards */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {/* Due / Overdue Amount Box (Bold Red) */}
        <div className={cn(
          "p-2 rounded-xl border transition-colors",
          hasOverdue ? "bg-red-500/10 border-red-500/30" : "bg-muted/30 border-border/30"
        )}>
          <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider mb-0.5">
            {hasOverdue ? "Due / Overdue" : "Due Amount"}
          </span>
          <span className={cn(
            "font-extrabold text-sm sm:text-base font-mono block",
            hasOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
          )}>
            ₹{status.overdueAmount.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Current Month Bill Box (Green) */}
        <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20">
          <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider mb-0.5">
            Current Month
          </span>
          <span className="font-bold text-sm sm:text-base font-mono text-emerald-600 dark:text-emerald-400 block">
            ₹{status.currentAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
};
