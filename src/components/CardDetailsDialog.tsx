import { CreditCard as CreditCardType } from '@/types/creditCard';
import { CreditCardVisual } from '@/components/CreditCardVisual';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, IndianRupee, CreditCard, AlertCircle, Edit, Trash2, Receipt, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardDetailsDialogProps {
  card: CreditCardType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (card: CreditCardType) => void;
  onDelete: (id: string) => void;
  onAddExpense: (card: CreditCardType) => void;
}

export const CardDetailsDialog = ({ card, open, onOpenChange, onEdit, onDelete, onAddExpense }: CardDetailsDialogProps) => {
  if (!card) return null;

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

  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const daysLeft = getBillingDaysLeft();
  const isAlert = card.currentBill > 0 && daysLeft <= 5;
  const availableCredit = Math.max(0, card.limitAmount - card.currentBill);
  const utilizationPercent = card.limitAmount > 0 
    ? Math.min(100, Math.round((card.currentBill / card.limitAmount) * 100))
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
            <CreditCardVisual card={card} showDetails={true} />
          </div>

          {/* Billing Alert Notification */}
          <div className={cn(
            "flex items-center gap-2.5 p-3 rounded-2xl text-xs font-semibold border",
            isAlert 
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" 
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          )}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {daysLeft === 0 
                ? '⚠️ Bill is due today! Please complete payment.' 
                : isAlert 
                  ? `⚠️ Payment due in ${daysLeft} days!` 
                  : `🟢 Next bill cycle closes in ${daysLeft} days (${card.billingDate}${getOrdinalSuffix(card.billingDate)} of month)`}
            </span>
          </div>

          {/* Key Financial Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                <IndianRupee className="w-3.5 h-3.5 text-amber-500" />
                <span>Current Bill</span>
              </div>
              <p className={cn(
                "text-xl font-bold font-mono",
                card.currentBill > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                ₹{card.currentBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Available Limit</span>
              </div>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
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
