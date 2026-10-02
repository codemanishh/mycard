import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard } from '@/types/creditCard';
import { useToast } from '@/hooks/use-toast';
import { BankLogo } from './BankLogo';
import { INDIAN_BANKS } from '@/lib/bankData';
import { Search, Share2 } from 'lucide-react';

interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (card: Omit<CreditCard, 'id' | 'createdAt'>) => void;
  editCard?: CreditCard | null;
}

export const AddCardDialog = ({ open, onOpenChange, onSave, editCard }: AddCardDialogProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [bankName, setBankName] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  // Clean string states for numbers (no HTML5 spinner arrows, no leading 0 bugs like 0999 or 077)
  const [billingDateStr, setBillingDateStr] = useState('1');
  const [currentBillStr, setCurrentBillStr] = useState('');
  const [overdueAmountStr, setOverdueAmountStr] = useState('');
  const [limitAmountStr, setLimitAmountStr] = useState('');
  
  const [status, setStatus] = useState<'active' | 'blocked' | 'inactive'>('active');
  const [limitType, setLimitType] = useState<'monthly' | 'per-transaction' | 'full-card'>('monthly');
  const [isSharedLimit, setIsSharedLimit] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editCard) {
      setBankName(editCard.bankName || '');
      setCardName(editCard.cardName || '');
      setCardNumber(editCard.cardNumber || '');
      setExpiryDate(editCard.expiryDate || '');
      setBillingDateStr(String(editCard.billingDate || 1));
      setCurrentBillStr(editCard.currentBill ? String(editCard.currentBill) : '');
      setOverdueAmountStr(editCard.overdueAmount ? String(editCard.overdueAmount) : '');
      setLimitAmountStr(editCard.limitAmount ? String(editCard.limitAmount) : '');
      setStatus(editCard.status || 'active');
      setLimitType(editCard.limitType || 'monthly');
      setIsSharedLimit(Boolean(
        editCard.isSharedLimit ||
        (editCard.notes && editCard.notes.includes('[SHARED_LIMIT:true]')) ||
        (typeof window !== 'undefined' && localStorage.getItem(`card_shared_limit_${editCard.id}`) === 'true')
      ));
      setNotes(editCard.notes || '');
    } else {
      setBankName('');
      setCardName('');
      setCardNumber('');
      setExpiryDate('');
      setBillingDateStr('1');
      setCurrentBillStr('');
      setOverdueAmountStr('');
      setLimitAmountStr('');
      setStatus('active');
      setLimitType('monthly');
      setIsSharedLimit(false);
      setNotes('');
    }
    setSearchQuery('');
    setSelectedCategory('all');
  }, [editCard, open]);

  const filteredBanks = INDIAN_BANKS.filter(bank => {
    const matchesSearch = bank.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || bank.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bankName || !cardName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const billingDateNum = Math.min(31, Math.max(1, parseInt(billingDateStr, 10) || 1));

    onSave({
      bankName,
      cardName,
      cardNumber,
      expiryDate,
      billingDate: billingDateNum,
      currentBill: parseFloat(currentBillStr) || 0,
      overdueAmount: parseFloat(overdueAmountStr) || 0,
      limitAmount: parseFloat(limitAmountStr) || 0,
      status,
      limitType,
      isSharedLimit,
      notes,
    });

    onOpenChange(false);
    toast({
      title: editCard ? 'Card Updated' : 'Card Added',
      description: `${cardName} has been ${editCard ? 'updated' : 'added'} successfully.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{editCard ? 'Edit Credit Card' : 'Add New Credit Card'}</DialogTitle>
          <DialogDescription>
            {editCard ? 'Update your credit card details' : 'Enter your credit card details to track bills'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bank Selection with Search */}
          <div className="space-y-2">
            <Label>Bank Name *</Label>
            
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search banks..."
                  className="pl-9 rounded-xl"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks</SelectItem>
                  <SelectItem value="public">Public Sector</SelectItem>
                  <SelectItem value="private">Private Sector</SelectItem>
                  <SelectItem value="small-finance">Small Finance</SelectItem>
                  <SelectItem value="payments">Payments Banks</SelectItem>
                  <SelectItem value="foreign">Foreign Banks</SelectItem>
                  <SelectItem value="other">Fintech/Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bank List */}
            <div className="max-h-36 overflow-y-auto space-y-1 border border-border/50 rounded-xl p-2">
              {filteredBanks.map((bank) => (
                <button
                  key={bank.name}
                  type="button"
                  onClick={() => setBankName(bank.name)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                    bankName === bank.name 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-secondary'
                  }`}
                >
                  <BankLogo bankName={bank.name} size="sm" />
                  <span className="text-sm font-medium truncate">{bank.name}</span>
                </button>
              ))}
              {filteredBanks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No banks found</p>
              )}
            </div>

            {bankName && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                <BankLogo bankName={bankName} size="sm" />
                <span className="text-sm font-medium">{bankName}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardName">Card Name *</Label>
            <Input
              id="cardName"
              placeholder="e.g., Coral, Amazon Pay, Regalia"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          {/* Card Number & Expiry Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="cardNumber" className="text-xs">Card Number (Dummy/Real)</Label>
              <Input
                id="cardNumber"
                placeholder="4532 8912 3456 7890"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="rounded-xl font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiryDate" className="text-xs">Expiry Date</Label>
              <Input
                id="expiryDate"
                placeholder="08/28"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="rounded-xl font-mono text-xs"
              />
            </div>
          </div>

          {/* Billing Date (Day of Month: 1 - 31) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="billingDate" className="text-xs font-semibold">Billing Date (Day of Month) *</Label>
              <span className="text-[10px] text-muted-foreground font-medium">1 to 31 max</span>
            </div>
            <Input
              id="billingDate"
              type="text"
              inputMode="numeric"
              placeholder="1 - 31"
              value={billingDateStr}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                if (digits === '') {
                  setBillingDateStr('');
                  return;
                }
                let num = parseInt(digits, 10);
                if (num > 31) num = 31;
                setBillingDateStr(String(num));
              }}
              onBlur={() => {
                if (!billingDateStr || parseInt(billingDateStr, 10) < 1) {
                  setBillingDateStr('1');
                }
              }}
              className="rounded-xl font-mono text-sm"
              required
            />
          </div>

          {/* Amounts (Current Month Bill & Overdue Bill) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="currentBill" className="text-xs font-medium">Current Month Bill (₹)</Label>
              <Input
                id="currentBill"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={currentBillStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    setCurrentBillStr(val);
                  }
                }}
                className="rounded-xl font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overdueAmount" className="text-xs font-medium text-red-500 flex items-center gap-1">
                <span>Overdue Bill (₹)</span>
              </Label>
              <Input
                id="overdueAmount"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={overdueAmountStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    setOverdueAmountStr(val);
                  }
                }}
                className="rounded-xl font-mono text-xs text-red-500 border-red-500/30 focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="status">Card Status</Label>
              <Select 
                value={status} 
                onValueChange={(value: any) => setStatus(value)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover rounded-xl">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limitType">Limit Type</Label>
              <Select 
                value={limitType} 
                onValueChange={(value: any) => setLimitType(value)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover rounded-xl">
                  <SelectItem value="monthly">Monthly Limit</SelectItem>
                  <SelectItem value="per-transaction">Per Transaction</SelectItem>
                  <SelectItem value="full-card">Full Card Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Limit Amount */}
          <div className="space-y-2">
            <Label htmlFor="limitAmount">Limit Amount (₹)</Label>
            <Input
              id="limitAmount"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={limitAmountStr}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  setLimitAmountStr(val);
                }
              }}
              className="rounded-xl font-mono text-sm"
            />
          </div>

          {/* Shared Limit Checkbox */}
          <div className="flex items-start space-x-3 p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl">
            <Checkbox
              id="isSharedLimit"
              checked={isSharedLimit}
              onCheckedChange={(checked) => setIsSharedLimit(Boolean(checked))}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor="isSharedLimit"
                className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-primary" />
                Shared Limit across {bankName || 'same bank'} cards
              </Label>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Check this if your cards from {bankName || 'this bank'} share a single credit limit. Limits and credit utilization ratio will be calculated across all shared cards of this bank.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-xl"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 rounded-xl bg-primary hover:bg-primary/90">
              {editCard ? 'Update Card' : 'Add Card'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
