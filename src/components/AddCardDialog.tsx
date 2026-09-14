import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard } from '@/types/creditCard';
import { useToast } from '@/hooks/use-toast';
import { BankLogo } from './BankLogo';
import { INDIAN_BANKS } from '@/lib/bankData';
import { Search } from 'lucide-react';

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
  const [formData, setFormData] = useState<{
    bankName: string;
    cardName: string;
    billingDate: number;
    currentBill: number;
    status: 'active' | 'blocked' | 'inactive';
    limitType: 'monthly' | 'per-transaction' | 'full-card';
    limitAmount: number;
    cardNumber: string;
    expiryDate: string;
    notes: string;
  }>({
    bankName: '',
    cardName: '',
    billingDate: 1,
    currentBill: 0,
    status: 'active',
    limitType: 'monthly',
    limitAmount: 0,
    cardNumber: '',
    expiryDate: '',
    notes: '',
  });

  useEffect(() => {
    if (editCard) {
      setFormData({
        bankName: editCard.bankName,
        cardName: editCard.cardName,
        billingDate: editCard.billingDate,
        currentBill: editCard.currentBill,
        status: editCard.status,
        limitType: editCard.limitType,
        limitAmount: editCard.limitAmount,
        cardNumber: editCard.cardNumber || '',
        expiryDate: editCard.expiryDate || '',
        notes: editCard.notes || '',
      });
    } else {
      setFormData({
        bankName: '',
        cardName: '',
        billingDate: 1,
        currentBill: 0,
        status: 'active',
        limitType: 'monthly',
        limitAmount: 0,
        cardNumber: '',
        expiryDate: '',
        notes: '',
      });
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
    
    if (!formData.bankName || !formData.cardName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    onSave(formData);
    onOpenChange(false);
    toast({
      title: editCard ? 'Card Updated' : 'Card Added',
      description: `${formData.cardName} has been ${editCard ? 'updated' : 'added'} successfully.`,
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
                  onClick={() => setFormData({ ...formData, bankName: bank.name })}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                    formData.bankName === bank.name 
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

            {formData.bankName && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                <BankLogo bankName={formData.bankName} size="sm" />
                <span className="text-sm font-medium">{formData.bankName}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardName">Card Name *</Label>
            <Input
              id="cardName"
              placeholder="e.g., Coral, Amazon Pay, Regalia"
              value={formData.cardName}
              onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
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
                value={formData.cardNumber}
                onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                className="rounded-xl font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiryDate" className="text-xs">Expiry Date</Label>
              <Input
                id="expiryDate"
                placeholder="08/28"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="rounded-xl font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingDate">Billing Date (Day of Month) *</Label>
            <Input
              id="billingDate"
              type="number"
              min="1"
              max="31"
              value={formData.billingDate}
              onChange={(e) => setFormData({ ...formData, billingDate: parseInt(e.target.value) || 1 })}
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentBill">Current Bill (₹)</Label>
            <Input
              id="currentBill"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.currentBill}
              onChange={(e) => setFormData({ ...formData, currentBill: parseFloat(e.target.value) || 0 })}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="status">Card Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
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
                value={formData.limitType} 
                onValueChange={(value: any) => setFormData({ ...formData, limitType: value })}
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

          <div className="space-y-2">
            <Label htmlFor="limitAmount">Limit Amount (₹)</Label>
            <Input
              id="limitAmount"
              type="number"
              min="0"
              placeholder="0"
              value={formData.limitAmount}
              onChange={(e) => setFormData({ ...formData, limitAmount: parseFloat(e.target.value) || 0 })}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
