import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Expense, EXPENSE_CATEGORIES, POPULAR_STORES, BankAccount } from '@/types/expense';
import { CreditCard as CreditCardType } from '@/types/creditCard';
import { cn } from '@/lib/utils';

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  bankAccounts: BankAccount[];
  creditCards: CreditCardType[];
}

export const AddExpenseDialog = ({ 
  open, 
  onOpenChange, 
  onSave, 
  bankAccounts, 
  creditCards 
}: AddExpenseDialogProps) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<Expense['category']>('food');
  const [storeName, setStoreName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'credit_card'>('bank');
  const [paymentSourceId, setPaymentSourceId] = useState('');

  const handleSave = () => {
    if (!amount || !paymentSourceId) return;

    const source = paymentMethod === 'bank' 
      ? bankAccounts.find(a => a.id === paymentSourceId)
      : creditCards.find(c => c.id === paymentSourceId);

    onSave({
      amount: parseFloat(amount),
      date,
      category,
      storeName: storeName || undefined,
      paymentMethod,
      paymentSourceId,
      paymentSourceName: paymentMethod === 'bank' 
        ? (source as BankAccount)?.bankName || ''
        : `${(source as CreditCardType)?.bankName} ${(source as CreditCardType)?.cardName}`,
    });

    // Reset form
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('food');
    setStoreName('');
    setPaymentMethod('bank');
    setPaymentSourceId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Category
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value as Expense['category'])}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border text-left text-xs font-medium transition-all",
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-bold ring-1 ring-primary/30"
                        : "bg-background border-border/60 hover:bg-muted text-foreground"
                    )}
                  >
                    <span>{cat.emoji}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
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

          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => {
              setPaymentMethod(v as 'bank' | 'credit_card');
              setPaymentSourceId('');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Account</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{paymentMethod === 'bank' ? 'Select Bank' : 'Select Credit Card'}</Label>
            <Select value={paymentSourceId} onValueChange={setPaymentSourceId}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${paymentMethod === 'bank' ? 'bank' : 'card'}`} />
              </SelectTrigger>
              <SelectContent>
                {paymentMethod === 'bank' 
                  ? bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bankName} - ₹{acc.balance.toLocaleString('en-IN')}
                      </SelectItem>
                    ))
                  : creditCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.bankName} {card.cardName}
                      </SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} className="w-full" disabled={!amount || !paymentSourceId}>
            Add Expense
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
