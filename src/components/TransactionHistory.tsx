import { useState, useMemo, useEffect } from 'react';
import { Expense, EXPENSE_CATEGORIES, BankAccount } from '@/types/expense';
import { CreditCard as CreditCardType } from '@/types/creditCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trash2, CreditCard, Filter, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransactionHistoryProps {
  expenses: Expense[];
  cards?: CreditCardType[];
  bankAccounts?: BankAccount[];
  onDeleteExpense?: (id: string) => void;
}

export const TransactionHistory = ({ 
  expenses, 
  cards = [], 
  bankAccounts = [], 
  onDeleteExpense 
}: TransactionHistoryProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCard, setSelectedCard] = useState<string>('all');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Extract unique payment sources that have actually been used in the currently selected month
  const paymentSources = useMemo(() => {
    const sources: { id: string; name: string; type: 'card' | 'bank' }[] = [];
    const addedKeys = new Set<string>();

    // Filter expenses for the currently selected month first
    const monthExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
    });

    // Only include cards and bank accounts that have transactions in this selected month
    monthExpenses.forEach(exp => {
      if (exp.paymentSourceName) {
        const name = exp.paymentSourceName;
        const id = exp.paymentSourceId || name;
        if (!addedKeys.has(id) && !addedKeys.has(name)) {
          addedKeys.add(id);
          addedKeys.add(name);
          sources.push({
            id,
            name,
            type: exp.paymentMethod === 'credit_card' ? 'card' : 'bank'
          });
        }
      }
    });

    return sources;
  }, [expenses, monthStart, monthEnd]);

  // Reset selected card filter if selected card is not used in the active month
  useEffect(() => {
    if (selectedCard !== 'all') {
      const isAvailableInMonth = paymentSources.some(
        s => s.id === selectedCard || s.name === selectedCard
      );
      if (!isAvailableInMonth) {
        setSelectedCard('all');
      }
    }
  }, [paymentSources, selectedCard]);

  const activeSourceObj = useMemo(() => {
    if (selectedCard === 'all') return null;
    return paymentSources.find(s => s.id === selectedCard || s.name === selectedCard);
  }, [selectedCard, paymentSources]);

  const filteredExpenses = expenses
    .filter((expense) => {
      const expenseDate = new Date(expense.date);
      const inMonth = isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
      if (!inMonth) return false;

      if (selectedCard !== 'all') {
        const isMatchById = expense.paymentSourceId === selectedCard;
        const isMatchByName = expense.paymentSourceName === selectedCard || 
          (activeSourceObj && expense.paymentSourceName === activeSourceObj.name);
        if (!isMatchById && !isMatchByName) return false;
      }

      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const getCategoryEmoji = (category: Expense['category']) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category)?.emoji || '📦';
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="space-y-4">
      {/* Month & Card Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Month Selector */}
        <div className="flex items-center justify-between sm:justify-start gap-2 border border-border/60 rounded-xl p-1 bg-background shadow-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold text-sm px-2 min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Card / Account Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Select value={selectedCard} onValueChange={setSelectedCard}>
            <SelectTrigger className="w-full sm:w-[240px] rounded-xl h-10 border-border/60 bg-background shadow-sm">
              <div className="flex items-center gap-2 truncate">
                <CreditCard className="w-4 h-4 text-primary shrink-0" />
                <SelectValue placeholder="Filter by Card / Account" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-[260px]">
              <SelectItem value="all">
                <span className="font-medium">All Cards & Accounts</span>
              </SelectItem>
              {paymentSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground shrink-0">
                      {source.type === 'card' ? 'Card' : 'Bank'}
                    </span>
                    <span className="truncate">{source.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCard !== 'all' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedCard('all')}
              className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
              title="Clear card filter"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Total Spent summary banner */}
      <Card className="p-4 bg-primary/10 border-primary/20 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">
            {selectedCard === 'all'
              ? 'Total Spent'
              : `Total Spent (${activeSourceObj?.name || 'Selected Source'})`}
          </p>
          <p className="text-2xl font-bold text-foreground">₹{totalSpent.toLocaleString('en-IN')}</p>
        </div>
        {selectedCard !== 'all' && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/20 text-primary flex items-center gap-1.5">
            <Filter className="w-3 h-3" /> {activeSourceObj?.name || 'Filtered'}
          </span>
        )}
      </Card>

      {/* Transaction List */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed rounded-2xl border-border/60">
            <p className="text-muted-foreground font-medium">
              {selectedCard !== 'all' 
                ? `No transactions for "${activeSourceObj?.name || 'selected card'}" in ${format(currentMonth, 'MMMM yyyy')}`
                : `No transactions in ${format(currentMonth, 'MMMM yyyy')}`}
            </p>
            {selectedCard !== 'all' && (
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setSelectedCard('all')} 
                className="mt-1 text-primary"
              >
                Clear filter to view all
              </Button>
            )}
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <Card key={expense.id} className="p-3 group hover:bg-secondary/50 transition-colors rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl shrink-0">{getCategoryEmoji(expense.category)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-foreground">{expense.storeName || expense.category}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {format(new Date(expense.date), 'dd MMM')} • <span className="font-medium text-foreground/80">{expense.paymentSourceName}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-destructive whitespace-nowrap">
                    -₹{expense.amount.toLocaleString('en-IN')}
                  </p>
                  {onDeleteExpense && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg"
                      onClick={() => onDeleteExpense(expense.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

