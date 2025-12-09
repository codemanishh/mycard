import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Expense, EXPENSE_CATEGORIES, POPULAR_STORES, BankAccount } from '@/types/expense';
import { CreditCard as CreditCardType } from '@/types/creditCard';
import { BankLogo } from './BankLogo';
import { Receipt } from 'lucide-react';

interface QuickExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  paymentSource: {
    type: 'bank' | 'credit_card';
    id: string;
    name: string;
  } | null;
}

export const QuickExpenseDialog = ({ 
  open, 
  onOpenChange, 
  onSave, 
  paymentSource 
}: QuickExpenseDialogProps) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<Expense['category']>('food');
  const [storeName, setStoreName] = useState('');

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Quick Add Expense
          </DialogTitle>
        </DialogHeader>

        {/* Payment Source Display */}
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
          <BankLogo bankName={paymentSource.name.split(' ')[0]} size="md" />
          <div>
            <p className="font-medium">{paymentSource.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {paymentSource.type === 'credit_card' ? 'Credit Card' : 'Bank Account'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-semibold"
              autoFocus
            />
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Expense['category'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Store (Optional)</Label>
            <Select value={storeName} onValueChange={setStoreName}>
              <SelectTrigger>
                <SelectValue placeholder="Select or type store" />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_STORES.map((store) => (
                  <SelectItem key={store} value={store}>
                    {store}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} className="w-full" disabled={!amount}>
            Add Expense
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
