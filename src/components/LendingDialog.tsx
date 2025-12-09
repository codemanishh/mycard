import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lending } from '@/types/expense';

interface LendingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lending: Omit<Lending, 'id' | 'createdAt' | 'isReturned'>) => void;
  editingLending?: Lending | null;
}

export const LendingDialog = ({ open, onOpenChange, onSave, editingLending }: LendingDialogProps) => {
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [givenDate, setGivenDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderDate, setReminderDate] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editingLending) {
      setPersonName(editingLending.personName);
      setAmount(editingLending.amount.toString());
      setGivenDate(editingLending.givenDate);
      setReminderDate(editingLending.reminderDate || '');
      setBorrowerPhone(editingLending.borrowerPhone || '');
      setNote(editingLending.note || '');
    } else {
      resetForm();
    }
  }, [editingLending, open]);

  const resetForm = () => {
    setPersonName('');
    setAmount('');
    setGivenDate(new Date().toISOString().split('T')[0]);
    setReminderDate('');
    setBorrowerPhone('');
    setNote('');
  };

  const handleSave = () => {
    if (!personName || !amount) return;

    onSave({
      personName,
      amount: parseFloat(amount),
      givenDate,
      reminderDate: reminderDate || undefined,
      borrowerPhone: borrowerPhone || undefined,
      note: note || undefined,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingLending ? 'Edit Lending' : 'Add Money Lent'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Person Name</Label>
            <Input
              placeholder="Enter name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
            />
          </div>

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
            <Label>Given Date</Label>
            <Input
              type="date"
              value={givenDate}
              onChange={(e) => setGivenDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Reminder Date (Optional)</Label>
            <Input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Borrower's Phone (Optional)</Label>
            <Input
              type="tel"
              placeholder="+91 9876543210"
              value={borrowerPhone}
              onChange={(e) => setBorrowerPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              For in-app reminder notifications
            </p>
          </div>

          <div>
            <Label>Note (Optional)</Label>
            <Input
              placeholder="Any note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button onClick={handleSave} className="w-full" disabled={!personName || !amount}>
            {editingLending ? 'Update Entry' : 'Add Entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
