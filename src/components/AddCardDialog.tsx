import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard } from '@/types/creditCard';
import { useToast } from '@/hooks/use-toast';

interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (card: Omit<CreditCard, 'id' | 'createdAt'>) => void;
  editCard?: CreditCard | null;
}

const BANKS = [
  'ICICI Bank',
  'HDFC Bank',
  'Axis Bank',
  'BharatPe',
  'SBI',
  'Kotak',
  'American Express',
  'Other'
];

export const AddCardDialog = ({ open, onOpenChange, onSave, editCard }: AddCardDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<{
    bankName: string;
    cardName: string;
    billingDate: number;
    currentBill: number;
    status: 'active' | 'blocked' | 'inactive';
    limitType: 'monthly' | 'per-transaction' | 'full-card';
    limitAmount: number;
    notes: string;
  }>({
    bankName: '',
    cardName: '',
    billingDate: 1,
    currentBill: 0,
    status: 'active',
    limitType: 'monthly',
    limitAmount: 0,
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
        notes: '',
      });
    }
  }, [editCard, open]);

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editCard ? 'Edit Credit Card' : 'Add New Credit Card'}</DialogTitle>
          <DialogDescription>
            {editCard ? 'Update your credit card details' : 'Enter your credit card details to track bills'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name *</Label>
            <Select 
              value={formData.bankName} 
              onValueChange={(value) => setFormData({ ...formData, bankName: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardName">Card Name *</Label>
            <Input
              id="cardName"
              placeholder="e.g., Coral, Amazon Pay"
              value={formData.cardName}
              onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingDate">Billing Date (Day of Month) *</Label>
            <Input
              id="billingDate"
              type="number"
              min="1"
              max="31"
              value={formData.billingDate}
              onChange={(e) => setFormData({ ...formData, billingDate: parseInt(e.target.value) })}
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Card Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="monthly">Monthly Limit</SelectItem>
                <SelectItem value="per-transaction">Per Transaction</SelectItem>
                <SelectItem value="full-card">Full Card Limit</SelectItem>
              </SelectContent>
            </Select>
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
              {editCard ? 'Update Card' : 'Add Card'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
