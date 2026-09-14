import { CreditCard as CreditCardType, getCardBillStatus } from '@/types/creditCard';
import { Expense } from '@/types/expense';
import { CreditCardVisual } from '@/components/CreditCardVisual';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, IndianRupee, CreditCard, AlertCircle, Edit, Trash2, Receipt, ShieldCheck, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardDetailsDialogProps {
  card: CreditCardType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (card: CreditCardType) => void;
  onDelete: (id: string) => void;
  onAddExpense: (card: CreditCardType) => void;
  onClearOverdue?: (card: CreditCardType) => void;
  onClearTotalBill?: (card: CreditCardType) => void;
  expenses?: Expense[];
}

export const CardDetailsDialog = ({ card, open, onOpenChange, onEdit, onDelete, onAddExpense, onClearOverdue, onClearTotalBill, expenses }: CardDetailsDialogProps) => {
  if (!card) return null;

  const status = getCardBillStatus(card, expenses);

  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const hasOverdue = status.isOverdue && status.overdueAmount > 0;
  const availableCredit = Math.max(0, card.limitAmount - status.totalDue);
  const utilizationPercent = card.limitAmount > 0 
    ? Math.min(100, Math.round((status.totalDue / card.limitAmount) * 100))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-4 sm:p-6 rounded-3xl border border-border/50 shadow-elevated overflow-y-auto max-h-[90vh]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Card Details
            </span>
            <Badge 
              variant={card.status === 'active' ? 'default' : 'destructive'}
              className={cn(
                "capitalize text-xs px-2.5 py-0.5 rounded-full font-bold",
                card.status === 'active' && "bg-emerald-500 text-white"
              )}
            >
              {card.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Top Banner: Digital Wallet Credit Card Graphic */}
          <div className="transform hover:scale-[1.01] transition-transform">
            <CreditCardVisual card={card} expenses={expenses} showDetails={true} />
          </div>

          {/* Billing Alert Notification */}
          <div className={cn(
            "flex items-center gap-2.5 p-3 rounded-2xl text-xs font-semibold border",
            hasOverdue 
              ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40" 
              : status.daysLeft <= 5 
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          )}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {hasOverdue 
                ? status.overdueDays === 0
                  ? `⚠️ BILL DUE TODAY! Statement bill of ₹${status.overdueAmount.toLocaleString('en-IN')} is due today.`
                  : `🚨 OVERDUE BILL! Payment was due on ${card.billingDate}${getOrdinalSuffix(card.billingDate)} of month (${status.overdueDays} day${status.overdueDays > 1 ? 's' : ''} ago). Please pay to avoid penalties.` 
                : status.daysLeft === 0 
                  ? '⚠️ Bill is due today! Please complete payment.' 
                  : status.daysLeft <= 5 
                    ? `⚠️ Payment due in ${status.daysLeft} days!` 
                    : `🟢 Next bill cycle closes in ${status.daysLeft} days (${card.billingDate}${getOrdinalSuffix(card.billingDate)} of month)`}
            </span>
          </div>

          {/* Quick Clear Bill Buttons */}
          {(hasOverdue || status.totalDue > 0) && (
            <div className="flex gap-2">
              {hasOverdue && onClearOverdue && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onClearOverdue(card)}
                  className="flex-1 rounded-xl border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-extrabold text-xs h-9"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-red-500" />
                  Mark Due Paid (₹{status.overdueAmount.toLocaleString('en-IN')})
                </Button>
              )}
              {status.totalDue > 0 && onClearTotalBill && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onClearTotalBill(card)}
                  className="flex-1 rounded-xl border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs h-9"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Mark All Bills Paid
                </Button>
              )}
            </div>
          )}

          {/* Key Financial Metrics: Overdue Amount, Current Bill & Total Due */}
          <div className={cn("grid gap-3", hasOverdue && status.currentAmount > 0 ? "grid-cols-3" : "grid-cols-2")}>
            {/* Overdue Box if present */}
            {hasOverdue && (
              <div className="p-3 bg-red-500/10 dark:bg-red-950/30 rounded-2xl border border-red-500/30 space-y-1">
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-[11px] font-bold uppercase">
                  <AlertCircle className="w-3 h-3" />
                  <span>{status.overdueDays === 0 ? "Due Today" : "Overdue"}</span>
                </div>
                <p className="text-base sm:text-lg font-extrabold font-mono text-red-600 dark:text-red-400">
                  ₹{status.overdueAmount.toLocaleString('en-IN')}
                </p>
              </div>
            )}

            <div className="p-3 bg-muted/40 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground text-[11px] font-medium">
                <IndianRupee className="w-3 h-3 text-emerald-500" />
                <span>{hasOverdue && status.currentAmount > 0 ? "Current Month" : "Current Bill"}</span>
              </div>
              <p className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ₹{status.currentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground text-[11px] font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Available Limit</span>
              </div>
              <p className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ₹{availableCredit.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Utilization Progress Bar Card */}
          <div className="p-3.5 bg-card rounded-2xl border border-border/50 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Credit Utilization ({utilizationPercent}%)</span>
              <span className="font-bold">Limit: ₹{card.limitAmount.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden p-0.5 border border-border/30">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  utilizationPercent > 80 
                    ? "bg-red-500" 
                    : utilizationPercent > 50
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                )}
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
            
            <p className="text-[11px] text-muted-foreground">
              {utilizationPercent > 70 
                ? '⚠️ High utilization may impact your credit score. Try keeping it below 30%.'
                : '🟢 Healthy credit utilization ratio.'}
            </p>
          </div>

          {/* Notes if any */}
          {card.notes && (
            <div className="p-3 bg-muted/30 rounded-2xl border border-border/40 text-xs">
              <p className="font-semibold text-muted-foreground mb-0.5">Notes</p>
              <p className="text-foreground leading-relaxed">{card.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button 
              className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold h-11"
              onClick={() => {
                onAddExpense(card);
                onOpenChange(false);
              }}
            >
              <Receipt className="w-4 h-4 mr-2" />
              + Add Expense / Spend
            </Button>
            
            <Button 
              variant="outline" 
              className="rounded-xl h-11 px-4 border-border/60"
              onClick={() => {
                onEdit(card);
                onOpenChange(false);
              }}
              title="Edit Card"
            >
              <Edit className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="rounded-xl h-11 px-4 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => {
                onDelete(card.id);
                onOpenChange(false);
              }}
              title="Delete Card"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
