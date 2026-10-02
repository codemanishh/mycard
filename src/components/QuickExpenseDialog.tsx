import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Expense, EXPENSE_CATEGORIES, POPULAR_STORES } from '@/types/expense';
import { BankLogo } from './BankLogo';
import { Receipt, Check, Fuel } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  paymentSource: {
    type: 'bank' | 'credit_card';
    id: string;
    name: string;
  } | null;
  initialCategory?: Expense['category'];
}

export const QuickExpenseDialog = ({ 
  open, 
  onOpenChange, 
  onSave, 
  paymentSource,
  initialCategory = 'food'
}: QuickExpenseDialogProps) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<Expense['category']>(initialCategory);
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    if (open) {
      setCategory(initialCategory || 'food');
    }
  }, [open, initialCategory]);

  const handleSave = () => {
    if (!amount || !paymentSource) return;

    onSave({
      amount: parseFloat(amount),
      date,
      category,
      storeName: storeName || undefined,
      paymentMethod: paymentSource.type,
      paymentSourceId: paymentSource.id,
      paymentSourceName: paymentSource.name,
    });

    // Reset form
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('food');
    setStoreName('');
    onOpenChange(false);
  };

  if (!paymentSource) return null;

  const currentCatInfo = EXPENSE_CATEGORIES.find(c => c.value === category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 rounded-3xl border-border/60 shadow-2xl bg-card">
        <DialogHeader className="pb-1 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt className="w-5 h-5" />
            </div>
            Quick Add Spend
          </DialogTitle>
        </DialogHeader>

        {/* Selected Payment Source Banner */}
        <div className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-2xl border border-border/50">
          <div className="flex items-center gap-3">
            <BankLogo bankName={paymentSource.name.split(' ')[0]} size="md" />
            <div>
              <p className="font-semibold text-sm text-foreground">{paymentSource.name}</p>
              <p className="text-xs text-muted-foreground font-medium capitalize">
                {paymentSource.type === 'credit_card' ? '💳 Credit Card' : '🏦 Bank Account'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary">
            Active Source
          </span>
        </div>

        <div className="space-y-4 pt-1">
          {/* Amount Input with quick shortcuts */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Amount (₹)
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground font-mono">
                ₹
              </span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-2xl font-bold font-mono h-12 rounded-xl border-border/80 focus-visible:ring-primary focus-visible:border-primary"
                autoFocus
              />
            </div>
            {/* Quick Amount Chips */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
              {[50, 100, 500, 1000, 2000, 5000].map((quickAmt) => (
                <button
                  key={quickAmt}
                  type="button"
                  onClick={() => setAmount(quickAmt.toString())}
                  className="px-2.5 py-1 text-xs font-semibold font-mono rounded-lg bg-secondary hover:bg-primary/20 hover:text-primary transition-all text-secondary-foreground border border-border/40 shrink-0"
                >
                  +₹{quickAmt}
                </button>
              ))}
            </div>
          </div>

          {/* All Categories Displayed directly on page as clickable options */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Select Category <span className="text-primary font-normal text-[11px] lowercase">(tap to select)</span>
              </Label>
              {currentCatInfo && (
                <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                  <span>{currentCatInfo.emoji}</span> {currentCatInfo.label}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value as Expense['category'])}
                    className={cn(
                      "relative flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all duration-200 outline-none select-none",
                      isSelected
                        ? "bg-primary/10 border-primary ring-2 ring-primary/30 text-primary font-bold shadow-sm"
                        : "bg-background border-border/60 hover:border-border hover:bg-muted/50 text-foreground font-medium"
                    )}
                  >
                    <span className="text-lg shrink-0">{cat.emoji}</span>
                    <span className="text-xs truncate flex-1">{cat.label}</span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-xl border-border/80 text-sm font-medium"
            />
          </div>



          {/* Submit Button */}
          <Button 
            onClick={handleSave} 
            className="w-full h-11 text-sm font-bold rounded-xl shadow-lg shadow-primary/25 mt-2" 
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Submit Spend
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

