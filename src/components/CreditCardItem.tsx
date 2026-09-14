import { CreditCard as CreditCardType, getCardBillStatus } from '@/types/creditCard';
import { Expense } from '@/types/expense';
import { CreditCardVisual } from '@/components/CreditCardVisual';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, IndianRupee, Edit, Trash2, Receipt, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditCardItemProps {
  card: CreditCardType;
  onEdit: (card: CreditCardType) => void;
  onDelete: (id: string) => void;
  onAddExpense?: (card: CreditCardType) => void;
  expenses?: Expense[];
}

export const CreditCardItem = ({ card, onEdit, onDelete, onAddExpense, expenses }: CreditCardItemProps) => {
  const status = getCardBillStatus(card, expenses);

  const hasOverdue = status.isOverdue && status.overdueAmount > 0;
  const availableCredit = Math.max(0, card.limitAmount - status.totalDue);
  const utilizationPercent = card.limitAmount > 0 
    ? Math.min(100, Math.round((status.totalDue / card.limitAmount) * 100))
    : 0;

  return (
    <div className="group space-y-3 transition-all duration-300">
      {/* 3D Physical Credit Card Graphic */}
      <CreditCardVisual 
        card={card} 
        expenses={expenses}
        onClick={() => onEdit(card)}
        className="group-hover:scale-[1.02] group-hover:shadow-2xl transition-all"
      />

      {/* Info & Action Controls Card */}
      <Card className="p-4 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-card space-y-3">
        {/* Billing Status Message */}
        <div className={cn(
          "flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-colors",
          hasOverdue 
            ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/40 animate-pulse"
            : status.daysLeft === 0
              ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
              : status.daysLeft <= 5 
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" 
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
        )}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {hasOverdue 
              ? `🚨 OVERDUE! Payment was due ${status.overdueDays} day${status.overdueDays > 1 ? 's' : ''} ago.`
              : status.daysLeft === 0 
                ? "⚠️ Bill Due Today! Please make payment soon." 
                : status.daysLeft <= 5 
                  ? `⚠️ Bill due in ${status.daysLeft} days!` 
                  : `🟢 Next billing in ${status.daysLeft} days (${card.billingDate}${getOrdinalSuffix(card.billingDate)} of month)`
            }
          </span>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={cn(
            "p-2.5 rounded-xl border",
            hasOverdue ? "bg-red-500/10 border-red-500/30" : "bg-muted/40 border-border/30"
          )}>
            <span className="text-muted-foreground block text-[11px] mb-0.5">
              {hasOverdue ? "Due / Overdue" : "Due Amount"}
            </span>
            <span className={cn(
              "font-extrabold text-sm block font-mono",
              hasOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
            )}>
              ₹{status.overdueAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20">
            <span className="text-muted-foreground block text-[11px] mb-0.5">Current Month</span>
            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 block font-mono">
              ₹{status.currentAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Notes snippet if present */}
        {card.notes && (
          <p className="text-[11px] text-muted-foreground italic px-3 py-1.5 bg-muted/30 rounded-lg border border-border/30 truncate">
            {card.notes}
          </p>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-1">
          {onAddExpense && (
            <Button 
              size="sm" 
              className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium text-xs h-9 shadow-sm"
              onClick={() => onAddExpense(card)}
            >
              <Receipt className="w-3.5 h-3.5 mr-1.5" />
              + Expense
            </Button>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl border-border/60 hover:bg-muted font-medium text-xs h-9 px-3"
            onClick={() => onEdit(card)}
            title="Edit Card Details"
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 h-9 px-3"
            onClick={() => onDelete(card.id)}
            title="Delete Card"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
