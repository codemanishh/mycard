import { CreditCard as CreditCardType } from '@/types/creditCard';
import { BankLogo } from '@/components/BankLogo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, IndianRupee, CreditCard, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditCardItemProps {
  card: CreditCardType;
  onEdit: (card: CreditCardType) => void;
  onDelete: (id: string) => void;
}

export const CreditCardItem = ({ card, onEdit, onDelete }: CreditCardItemProps) => {
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
  const isUpcoming = daysLeft <= 7 && card.currentBill > 0;
  const isDue = daysLeft <= 3 && card.currentBill > 0;

  return (
    <Card 
      className={cn(
        "p-5 transition-all duration-300 hover:shadow-lg border-2",
        "bg-gradient-to-br from-card to-card/50",
        isUpcoming && "border-warning/30 bg-warning/5",
        isDue && "border-destructive/30 bg-destructive/5",
        card.status === 'blocked' && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <BankLogo bankName={card.bankName} size="md" />
          <div>
            <h3 className="font-semibold text-lg text-foreground">{card.cardName}</h3>
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

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Billing Date</span>
          </div>
          <span className="font-semibold text-foreground">{card.billingDate}{getOrdinalSuffix(card.billingDate)} of month</span>
        </div>

        {daysLeft <= 10 && card.currentBill > 0 && (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg",
            isDue ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
          )}>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {daysLeft === 0 ? 'Due today!' : `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm">Limit</span>
          </div>
          <span className="text-sm text-foreground">
            ₹{card.limitAmount.toLocaleString('en-IN')} ({card.limitType.replace('-', ' ')})
          </span>
        </div>
      </div>

      {card.notes && (
        <p className="text-xs text-muted-foreground mb-4 p-2 bg-muted/50 rounded">
          {card.notes}
        </p>
      )}

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => onEdit(card)}
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(card.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
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
