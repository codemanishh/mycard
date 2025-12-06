import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BankAccount } from '@/types/expense';
import { Building2, Plus, Trash2 } from 'lucide-react';

const BANK_OPTIONS = [
  'HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra',
  'Yes Bank', 'IndusInd Bank', 'Punjab National Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank', 'IDBI Bank', 'Federal Bank', 'Other'
];

interface AddBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBank: (bank: Omit<BankAccount, 'id'>) => void;
  onDeleteBank: (id: string) => void;
  existingBanks: BankAccount[];
}

export const AddBankDialog = ({ 
  open, 
  onOpenChange, 
  onAddBank, 
  onDeleteBank,
  existingBanks 
}: AddBankDialogProps) => {
  const [bankName, setBankName] = useState('');
  const [customBankName, setCustomBankName] = useState('');
  const [balance, setBalance] = useState('');
  const [type, setType] = useState<'savings' | 'current'>('savings');
  const [showAddForm, setShowAddForm] = useState(existingBanks.length === 0);

  useEffect(() => {
    if (open) {
      setShowAddForm(existingBanks.length === 0);
    }
  }, [open, existingBanks.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBankName = bankName === 'Other' ? customBankName : bankName;
    if (!finalBankName || !balance) return;

    onAddBank({
      bankName: finalBankName,
      balance: Number(balance),
      type,
    });

    setBankName('');
    setCustomBankName('');
    setBalance('');
    setType('savings');
    setShowAddForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-border/50 shadow-elevated max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-5 h-5 text-primary" />
            Manage Bank Accounts
          </DialogTitle>
        </DialogHeader>

        {/* Existing Banks */}
        {existingBanks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Your Banks</p>
            {existingBanks.map((bank) => (
              <div 
                key={bank.id} 
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl border border-border/50 group hover:bg-secondary transition-colors"
              >
                <div>
                  <p className="font-medium">{bank.bankName}</p>
                  <p className="text-sm text-muted-foreground">
                    ₹{bank.balance.toLocaleString('en-IN')} • {bank.type}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDeleteBank(bank.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Bank Form */}
        {showAddForm ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-border/50 mt-4">
            <p className="text-sm font-medium text-muted-foreground">Add New Bank</p>
            
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Select value={bankName} onValueChange={setBankName}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {BANK_OPTIONS.map((bank) => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {bankName === 'Other' && (
              <div className="space-y-2">
                <Label>Custom Bank Name</Label>
                <Input
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  placeholder="Enter bank name"
                  className="rounded-xl"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'savings' | 'current')}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="current">Current Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Current Balance (₹)</Label>
              <Input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="Enter balance"
                className="rounded-xl"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 rounded-xl"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 rounded-xl">
                Add Bank
              </Button>
            </div>
          </form>
        ) : (
          <Button 
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="w-full rounded-xl mt-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Bank
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};
