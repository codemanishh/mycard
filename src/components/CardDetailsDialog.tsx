import { CreditCard as CreditCardType } from '@/types/creditCard';
import { BankLogo } from '@/components/BankLogo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, IndianRupee, CreditCard, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardDetailsDialogProps {
  card: CreditCardType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (card: CreditCardType) => void;
  onDelete: (id: string) => void;
}

export const CardDetailsDialog = ({ card, open, onOpenChange, onEdit, onDelete }: CardDetailsDialogProps) => {
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
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
  const isUpcoming = daysLeft <= 7 && card.currentBill > 0;
  const isDue = daysLeft <= 3 && card.currentBill > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BankLogo bankName={card.bankName} size="lg" />
              <div>
                <DialogTitle className="text-xl">{card.cardName}</DialogTitle>
                <p className="text-sm text-muted-foreground">{card.bankName}</p>
              </div>
            </div>
            <Badge 
              variant={card.status === 'active' ? 'default' : 'destructive'}
              className={cn(
                card.status === 'active' && 'bg-success text-success-foreground'
              )}
            >
              {card.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Billing Date</span>
            </div>
            <span className="font-semibold text-foreground">
              {card.billingDate}{getOrdinalSuffix(card.billingDate)} of month
            </span>
          </div>

          {daysLeft <= 10 && card.currentBill > 0 && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-lg",
              isDue ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
            )}>
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {daysLeft === 0 ? 'Due today!' : `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <IndianRupee className="w-4 h-4" />
              <span className="text-sm">Current Bill</span>
            </div>
            <span className={cn(
              "font-bold text-lg",
              card.currentBill > 0 ? "text-primary" : "text-muted-foreground"
            )}>
              ₹{card.currentBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm">Limit</span>
            </div>
            <span className="text-sm text-foreground">
              ₹{card.limitAmount.toLocaleString('en-IN')} ({card.limitType.replace('-', ' ')})
            </span>
          </div>

          {card.notes && (
            <p className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
              {card.notes}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                onEdit(card);
                onOpenChange(false);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onDelete(card.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
