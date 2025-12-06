import { useState } from 'react';
import { Expense, EXPENSE_CATEGORIES } from '@/types/expense';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface TransactionHistoryProps {
  expenses: Expense[];
}

export const TransactionHistory = ({ expenses }: TransactionHistoryProps) => {
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
            <Card key={expense.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryEmoji(expense.category)}</span>
                  <div>
                    <p className="font-medium">{expense.storeName || expense.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(expense.date), 'dd MMM')} • {expense.paymentSourceName}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-destructive">-₹{expense.amount.toLocaleString('en-IN')}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
