import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PiggyBank, Plus, Trash2, Pencil, Wallet, TrendingUp, CandlestickChart, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SavingsItem, SavingsType, calculateSavingsStats } from '@/types/savings';

interface SavingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savings: SavingsItem[];
  onSaveSavings: (item: Omit<SavingsItem, 'id' | 'createdAt'> & { id?: string }) => void;
  onDeleteSavings: (id: string) => void;
  initialMode?: 'add' | 'list';
}

export const SavingsDialog: React.FC<SavingsDialogProps> = ({
  open,
  onOpenChange,
  savings,
  onSaveSavings,
  onDeleteSavings,
  initialMode = 'list',
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'list'>(initialMode);
  const [type, setType] = useState<SavingsType>('cash');
  const [name, setName] = useState('');
  const [realValue, setRealValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialMode);
      if (initialMode === 'add') {
        resetForm();
      }
    }
  }, [open, initialMode]);

  const resetForm = () => {
    setType('cash');
    setName('');
    setRealValue('');
    setCurrentValue('');
    setNotes('');
    setEditingId(null);
  };

  const handleStartEdit = (item: SavingsItem) => {
    setEditingId(item.id);
    setType(item.type);
    setName(item.name);
    setRealValue(item.realValue.toString());
    setCurrentValue(item.currentValue.toString());
    setNotes(item.notes || '');
    setActiveTab('add');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const real = parseFloat(realValue) || 0;
    const current = type === 'cash' ? real : (parseFloat(currentValue) || real);

    onSaveSavings({
      id: editingId || undefined,
      name: name.trim(),
      type,
      realValue: real,
      currentValue: current,
      notes: notes.trim() || undefined,
    });

    resetForm();
    setActiveTab('list');
  };

  const stats = calculateSavingsStats(savings);
  const parsedReal = parseFloat(realValue) || 0;
  const parsedCurrent = type === 'cash' ? parsedReal : (parseFloat(currentValue) || 0);
  const previewDiff = parsedCurrent - parsedReal;
  const previewPercent = parsedReal > 0 ? (previewDiff / parsedReal) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-5 rounded-3xl border-border/60 shadow-2xl bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-lg font-bold">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <PiggyBank className="w-5 h-5" />
              </div>
              <span>My Savings & Investments</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Total Summary Header Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-3 shadow-xs">
          <div className="grid grid-cols-2 gap-2 text-center divide-x divide-border/40">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Current Value</p>
              <p className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                ₹{stats.totalCurrentValue.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Invested (Real) Value</p>
              <p className="text-lg font-extrabold font-mono text-foreground">
                ₹{stats.totalRealValue.toLocaleString('en-IN')}
              </p>
              {stats.totalRealValue > 0 && (
                <p className={cn(
                  "text-[10px] font-bold font-mono",
                  stats.totalGain >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {stats.totalGain >= 0 ? '+' : ''}₹{stats.totalGain.toLocaleString('en-IN')} ({stats.totalGainPercent.toFixed(1)}%)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tab Switcher: Add vs List */}
        <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40 text-xs">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setActiveTab('list');
            }}
            className={cn(
              "flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5",
              activeTab === 'list'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>All Savings ({savings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeTab !== 'add') resetForm();
              setActiveTab('add');
            }}
            className={cn(
              "flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5",
              activeTab === 'add'
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{editingId ? 'Edit Saving' : 'Add New'}</span>
          </button>
        </div>

        {/* TAB 1: ADD / EDIT SAVINGS FORM */}
        {activeTab === 'add' && (
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            {/* Savings Category Selection */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Savings Type
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Wallet, desc: 'Locker/Cash' },
                  { id: 'sip', label: 'SIP', icon: TrendingUp, desc: 'Mutual Funds' },
                  { id: 'stock', label: 'Stock', icon: CandlestickChart, desc: 'Equity/Shares' },
                ].map((item) => {
                  const IconComp = item.icon;
                  const isSelected = type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as SavingsType)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center select-none",
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold ring-2 ring-emerald-500/30"
                          : "bg-background border-border/60 hover:bg-muted/50 text-muted-foreground font-medium"
                      )}
                    >
                      <IconComp className="w-5 h-5 mb-1" />
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[9px] opacity-75">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Savings Name */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                {type === 'cash' ? 'Account / Name' : type === 'sip' ? 'Fund / SIP Name' : 'Stock / Company Name'}
              </Label>
              <Input
                type="text"
                placeholder={type === 'cash' ? 'e.g. Home Emergency Cash' : type === 'sip' ? 'e.g. Parag Parikh Flexi Cap' : 'e.g. Tata Motors'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl border-border/80 text-sm font-medium"
                required
              />
            </div>

            {/* Amount Inputs */}
            {type === 'cash' ? (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Cash Amount (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold font-mono text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={realValue}
                    onChange={(e) => {
                      setRealValue(e.target.value);
                      setCurrentValue(e.target.value);
                    }}
                    className="pl-7 h-10 rounded-xl border-border/80 text-base font-mono font-bold"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {/* Real Value (Invested Amount) */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      Real Value <span className="text-[9px] font-normal text-muted-foreground">(Invested)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold font-mono text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={realValue}
                        onChange={(e) => setRealValue(e.target.value)}
                        className="pl-7 h-10 rounded-xl border-border/80 text-sm font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  {/* Current Value (Market Amount) */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      Current Value <span className="text-[9px] font-normal text-emerald-500">(Market)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold font-mono text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        className="pl-7 h-10 rounded-xl border-border/80 text-sm font-mono font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Profit/Loss Live Preview Badge */}
                {parsedReal > 0 && parsedCurrent > 0 && (
                  <div className="p-2 bg-muted/40 rounded-xl border border-border/40 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-primary" /> Returns Preview:
                    </span>
                    <span className={cn(
                      "font-bold font-mono px-2 py-0.5 rounded-lg text-xs",
                      previewDiff >= 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-500"
                    )}>
                      {previewDiff >= 0 ? '+' : ''}₹{previewDiff.toLocaleString('en-IN')} ({previewPercent.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Notes (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. Monthly SIP on 10th"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 rounded-xl border-border/80 text-xs font-medium"
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-2">
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="rounded-xl h-10 text-xs font-bold"
                >
                  Cancel Edit
                </Button>
              )}
              <Button
                type="submit"
                disabled={!name || !realValue}
                className="flex-1 rounded-xl h-10 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              >
                {editingId ? 'Update Saving' : 'Save Savings Item'}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: SAVINGS LIST VIEW */}
        {activeTab === 'list' && (
          <div className="space-y-2 pt-1">
            {savings.length === 0 ? (
              <div className="text-center py-8 px-4 bg-muted/30 rounded-2xl border border-dashed border-border/60">
                <PiggyBank className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm font-bold text-foreground">No Savings Added Yet</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">Add your Cash, SIP, and Stock investments to track real vs current values.</p>
                <Button
                  onClick={() => {
                    resetForm();
                    setActiveTab('add');
                  }}
                  size="sm"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add First Saving
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                {savings.map((item) => {
                  const diff = item.currentValue - item.realValue;
                  const percent = item.realValue > 0 ? (diff / item.realValue) * 100 : 0;
                  const isPositive = diff >= 0;

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-card border border-border/60 rounded-2xl hover:border-emerald-500/40 transition-all flex items-center justify-between gap-3 shadow-xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs font-bold text-xs uppercase",
                          item.type === 'cash' ? "bg-gradient-to-br from-green-500 to-emerald-600" :
                          item.type === 'sip' ? "bg-gradient-to-br from-cyan-500 to-blue-600" :
                          "bg-gradient-to-br from-indigo-500 to-purple-600"
                        )}>
                          {item.type === 'cash' ? '💵' : item.type === 'sip' ? '📈' : '📊'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-sm text-foreground truncate">{item.name}</p>
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                              {item.type}
                            </span>
                          </div>

                          {item.type === 'cash' ? (
                            <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              ₹{item.currentValue.toLocaleString('en-IN')}
                            </p>
                          ) : (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold font-mono text-foreground">
                                ₹{item.currentValue.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                Real: ₹{item.realValue.toLocaleString('en-IN')}
                              </span>
                              {item.realValue > 0 && (
                                <span className={cn(
                                  "font-bold font-mono text-[10px] px-1 py-0.2 rounded",
                                  isPositive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-500"
                                )}>
                                  {isPositive ? '+' : ''}{percent.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          )}

                          {item.notes && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartEdit(item)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Edit Savings"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDeleteSavings(item.id)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          title="Delete Savings"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
