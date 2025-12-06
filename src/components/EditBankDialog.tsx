import { useState, useEffect } from 'react';
import { BankAccount } from '@/types/expense';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus } from 'lucide-react';

interface EditBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  onUpdateBalance: (bankId: string, newBalance: number) => void;
}

export const EditBankDialog = ({ open, onOpenChange, bankAccounts, onUpdateBalance }: EditBankDialogProps) => {
  const [selectedBank, setSelectedBank] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'add' | 'deduct'>('add');

  useEffect(() => {
    if (open && bankAccounts.length > 0) {
      setSelectedBank(bankAccounts[0].id);
    }
  }, [open, bankAccounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const bank = bankAccounts.find(b => b.id === selectedBank);
    if (!bank || !amount) return;

    const amountNum = parseFloat(amount);
    const newBalance = transactionType === 'add' 
      ? bank.balance + amountNum 
      : bank.balance - amountNum;

    onUpdateBalance(selectedBank, Math.max(0, newBalance));
    
    setAmount('');
    setTransactionType('add');
    onOpenChange(false);
  };

  const selectedBankData = bankAccounts.find(b => b.id === selectedBank);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Bank Balance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Bank</Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.bankName} - ₹{bank.balance.toLocaleString('en-IN')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={transactionType === 'add' ? 'default' : 'outline'}
                onClick={() => setTransactionType('add')}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Credit
              </Button>
              <Button
                type="button"
                variant={transactionType === 'deduct' ? 'default' : 'outline'}
                onClick={() => setTransactionType('deduct')}
                className="w-full"
              >
                <Minus className="w-4 h-4 mr-2" />
                Debit
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
            />
          </div>

          {selectedBankData && amount && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">New Balance:</p>
              <p className="text-lg font-semibold">
                ₹{(transactionType === 'add' 
                  ? selectedBankData.balance + parseFloat(amount || '0')
                  : Math.max(0, selectedBankData.balance - parseFloat(amount || '0'))
                ).toLocaleString('en-IN')}
              </p>
            </div>
          )}

          <Button type="submit" className="w-full">
            Update Balance
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
