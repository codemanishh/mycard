import { useState } from 'react';
import { Expense, EXPENSE_CATEGORIES } from '@/types/expense';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface TransactionHistoryProps {
  expenses: Expense[];
  onDeleteExpense?: (id: string) => void;
}

export const TransactionHistory = ({ expenses, onDeleteExpense }: TransactionHistoryProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const filteredExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Card className="p-3 bg-primary/10 border-primary/20">
        <p className="text-sm text-muted-foreground">Total Spent</p>
        <p className="text-xl font-bold">₹{totalSpent.toLocaleString('en-IN')}</p>
      </Card>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {filteredExpenses.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No transactions this month</p>
        ) : (
          filteredExpenses.map((expense) => (
            <Card key={expense.id} className="p-3 group hover:bg-secondary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl shrink-0">{getCategoryEmoji(expense.category)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{expense.storeName || expense.category}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {format(new Date(expense.date), 'dd MMM')} • {expense.paymentSourceName}
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
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
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
