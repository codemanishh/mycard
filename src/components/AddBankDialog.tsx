import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BankAccount } from '@/types/expense';
import { Building2, Plus, Trash2, Search } from 'lucide-react';
import { BankLogo } from './BankLogo';
import { INDIAN_BANKS, getBanksByCategory } from '@/lib/bankData';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (open) {
      setShowAddForm(existingBanks.length === 0);
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [open, existingBanks.length]);

  const filteredBanks = INDIAN_BANKS.filter(bank => {
    const matchesSearch = bank.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || bank.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

  const handleBankSelect = (name: string) => {
    setBankName(name);
    if (name !== 'Other') {
      setCustomBankName('');
    }
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
                <div className="flex items-center gap-3">
                  <BankLogo bankName={bank.bankName} size="sm" />
                  <div>
                    <p className="font-medium">{bank.bankName}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{bank.balance.toLocaleString('en-IN')} • {bank.type}
                    </p>
                  </div>
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
            
            {/* Search and Filter */}
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

            {/* Bank Selection */}
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-border/50 rounded-xl p-2">
                {filteredBanks.map((bank) => (
                  <button
                    key={bank.name}
                    type="button"
                    onClick={() => handleBankSelect(bank.name)}
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
                <button
                  type="button"
                  onClick={() => handleBankSelect('Other')}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                    bankName === 'Other' 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-secondary'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">Other Bank</span>
                </button>
              </div>
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
              <Button type="submit" className="flex-1 rounded-xl" disabled={!bankName || !balance}>
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
