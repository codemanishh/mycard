import { useState, useMemo, useEffect } from 'react';
import { Expense, EXPENSE_CATEGORIES, BankAccount } from '@/types/expense';
import { CreditCard as CreditCardType } from '@/types/creditCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BankLogo } from '@/components/BankLogo';
import { ChevronLeft, ChevronRight, Trash2, CreditCard, Filter, X, BarChart3, List, Calendar, TrendingUp, ArrowUpRight, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

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
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'cards' | 'months'>('list');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCardForYearlyView, setSelectedCardForYearlyView] = useState<{ id: string; name: string } | null>(null);

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

  // Extract ALL unique payment sources across all time
  const allPaymentSources = useMemo(() => {
    const sources: { id: string; name: string; type: 'card' | 'bank' }[] = [];
    const addedKeys = new Set<string>();

    expenses.forEach(exp => {
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

    // Also include configured cards even if they have 0 expenses yet
    cards.forEach(c => {
      const name = `${c.bankName} ${c.cardName}`;
      if (!addedKeys.has(c.id) && !addedKeys.has(name)) {
        addedKeys.add(c.id);
        addedKeys.add(name);
        sources.push({ id: c.id, name, type: 'card' });
      }
    });

    return sources;
  }, [expenses, cards]);

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

  const filteredExpenses = useMemo(() => {
    return expenses
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
  }, [expenses, monthStart, monthEnd, selectedCard, activeSourceObj]);

  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Credit Card-wise Spend calculation (for current month)
  const cardWiseBreakdown = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: 'credit_card' | 'bank'; amount: number; count: number; ytdAmount: number }>();

    filteredExpenses.forEach(exp => {
      const key = exp.paymentSourceId || exp.paymentSourceName || 'Unknown';
      const existing = map.get(key);
      if (existing) {
        existing.amount += exp.amount;
        existing.count += 1;
      } else {
        map.set(key, {
          id: exp.paymentSourceId,
          name: exp.paymentSourceName || 'Unknown',
          type: exp.paymentMethod === 'credit_card' ? 'credit_card' : 'bank',
          amount: exp.amount,
          count: 1,
          ytdAmount: 0,
        });
      }
    });

    // Also calculate YTD amount for each card in selectedYear
    map.forEach((value, key) => {
      let ytd = 0;
      expenses.forEach(exp => {
        const match = exp.paymentSourceId === key || exp.paymentSourceName === value.name;
        if (match) {
          const parts = exp.date.split('-');
          if (parts.length === 3 && parseInt(parts[0], 10) === selectedYear) {
            ytd += exp.amount;
          }
        }
      });
      value.ytdAmount = ytd;
    });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, expenses, selectedYear]);

  // Card-specific Yearly & Monthly breakdown calculation
  const singleCardYearlySpend = useMemo(() => {
    if (!selectedCardForYearlyView) return null;

    const targetCardId = selectedCardForYearlyView.id;
    const targetCardName = selectedCardForYearlyView.name;
    const year = selectedYear;

    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, i, 1);
      return {
        monthIndex: i,
        monthName: format(d, 'MMM'),
        fullMonthName: format(d, 'MMMM'),
        totalAmount: 0,
        count: 0
      };
    });

    let totalCardYtdSpend = 0;
    let cardTotalTransactions = 0;

    const cardExpenses = expenses.filter(exp => {
      const matchId = exp.paymentSourceId === targetCardId;
      const matchName = exp.paymentSourceName === targetCardName || 
        (targetCardName && exp.paymentSourceName.toLowerCase().includes(targetCardName.toLowerCase()));
      return matchId || matchName;
    });

    cardExpenses.forEach(exp => {
      const parts = exp.date.split('-');
      if (parts.length === 3) {
        const expYear = parseInt(parts[0], 10);
        const expMonth = parseInt(parts[1], 10) - 1;
        if (expYear === year && expMonth >= 0 && expMonth < 12) {
          months[expMonth].totalAmount += exp.amount;
          months[expMonth].count += 1;
          totalCardYtdSpend += exp.amount;
          cardTotalTransactions += 1;
        }
      }
    });

    const maxMonthSpend = Math.max(...months.map(m => m.totalAmount), 1);

    return {
      cardId: targetCardId,
      cardName: targetCardName,
      year,
      months,
      totalCardYtdSpend,
      cardTotalTransactions,
      maxMonthSpend,
      cardExpenses: cardExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [selectedCardForYearlyView, selectedYear, expenses]);

  // Monthly & Yearly sums calculation (All Cards)
  const yearlyMonthlySpend = useMemo(() => {
    const year = selectedYear;
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, i, 1);
      return {
        monthIndex: i,
        monthName: format(d, 'MMM'),
        fullMonthName: format(d, 'MMMM'),
        dateObj: d,
        totalAmount: 0,
        count: 0
      };
    });

    let totalYearSpend = 0;

    expenses.forEach(exp => {
      if (selectedCard !== 'all') {
        const isMatchById = exp.paymentSourceId === selectedCard;
        const isMatchByName = exp.paymentSourceName === selectedCard;
        if (!isMatchById && !isMatchByName) return;
      }

      const parts = exp.date.split('-');
      if (parts.length === 3) {
        const expYear = parseInt(parts[0], 10);
        const expMonth = parseInt(parts[1], 10) - 1;
        if (expYear === year && expMonth >= 0 && expMonth < 12) {
          months[expMonth].totalAmount += exp.amount;
          months[expMonth].count += 1;
          totalYearSpend += exp.amount;
        }
      }
    });

    const maxMonthSpend = Math.max(...months.map(m => m.totalAmount), 1);

    return { months, totalYearSpend, maxMonthSpend };
  }, [expenses, selectedYear, selectedCard]);

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    yearSet.add(new Date().getFullYear());
    expenses.forEach(exp => {
      const year = parseInt(exp.date.split('-')[0], 10);
      if (!isNaN(year)) yearSet.add(year);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [expenses]);

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
      {/* History Views Switcher Sub-Tabs */}
      <div className="flex items-center justify-between gap-2 bg-muted/60 p-1 rounded-2xl border border-border/40">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('list');
            setSelectedCardForYearlyView(null);
          }}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            activeSubTab === 'list' && !selectedCardForYearlyView
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <List className="w-3.5 h-3.5" />
          <span>Transactions</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('cards');
            setSelectedCardForYearlyView(null);
          }}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            activeSubTab === 'cards' || selectedCardForYearlyView
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Card Spend</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('months');
            setSelectedCardForYearlyView(null);
          }}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            activeSubTab === 'months' && !selectedCardForYearlyView
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Monthly / Yearly</span>
        </button>
      </div>

      {/* SUB-TAB 1: TRANSACTIONS LIST */}
      {activeSubTab === 'list' && !selectedCardForYearlyView && (
        <div className="space-y-4 animate-fade-in">
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
          <Card className="p-4 bg-primary/10 border-primary/20 rounded-2xl flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {selectedCard === 'all'
                  ? `Total Spent (${format(currentMonth, 'MMM yyyy')})`
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
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
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
                <Card key={expense.id} className="p-3 group hover:bg-secondary/50 transition-colors rounded-xl border-border/50">
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
                      <p className="font-semibold text-destructive whitespace-nowrap font-mono">
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
      )}

      {/* SUB-TAB 2: CREDIT CARD-WISE SPEND OVERVIEW (WHEN NO SPECIFIC CARD DRILLDOWN IS ACTIVE) */}
      {activeSubTab === 'cards' && !selectedCardForYearlyView && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-foreground">Credit Card Wise Spend</h3>
              <p className="text-xs text-muted-foreground">
                Breakdown of spending for {format(currentMonth, 'MMMM yyyy')} <span className="text-primary font-medium">(tap any card for yearly breakdown)</span>
              </p>
            </div>
            <div className="flex items-center gap-1 border border-border/60 rounded-xl p-1 bg-background text-xs">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={prevMonth}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="font-semibold px-1 text-xs">{format(currentMonth, 'MMM yyyy')}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={nextMonth}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {cardWiseBreakdown.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl border-dashed">
              <p className="text-muted-foreground text-sm font-medium">
                No card spend recorded for {format(currentMonth, 'MMMM yyyy')}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {cardWiseBreakdown.map((item) => {
                const percent = totalSpent > 0 ? Math.round((item.amount / totalSpent) * 100) : 0;
                return (
                  <Card 
                    key={item.id || item.name} 
                    onClick={() => setSelectedCardForYearlyView({ id: item.id, name: item.name })}
                    className="p-3.5 rounded-2xl border-border/60 hover:border-primary/50 hover:bg-secondary/40 transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BankLogo bankName={item.name.split(' ')[0]} size="sm" />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.count} transaction{item.count === 1 ? '' : 's'} • {percent}% of month
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-extrabold text-base font-mono text-foreground">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </p>
                        <span className="text-[11px] font-semibold text-primary group-hover:underline flex items-center justify-end gap-0.5 ml-auto">
                          View Yearly Breakdown <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>

                    {/* Spend Ratio Progress Bar */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden p-0.5 border border-border/30">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DEDICATED CARD YEARLY & MONTHLY SPEND PAGE (DRILL-DOWN ON A SPECIFIC CARD) */}
      {selectedCardForYearlyView && singleCardYearlySpend && (
        <div className="space-y-4 animate-fade-in">
          {/* Top Bar with Back Button & Card Switcher Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-2xl border border-border/60">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCardForYearlyView(null)}
                className="h-9 rounded-xl border-border/60 hover:bg-background text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5 text-primary" />
                Back to All Cards
              </Button>

              <div className="flex items-center gap-2">
                <BankLogo bankName={singleCardYearlySpend.cardName.split(' ')[0]} size="sm" />
                <div>
                  <h3 className="font-bold text-sm text-foreground leading-tight truncate">
                    {singleCardYearlySpend.cardName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Card Yearly & Monthly Spend
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Card Switcher & Year Selector */}
            <div className="flex items-center gap-2">
              <Select 
                value={singleCardYearlySpend.cardId || singleCardYearlySpend.cardName}
                onValueChange={(val) => {
                  const found = allPaymentSources.find(s => s.id === val || s.name === val);
                  if (found) setSelectedCardForYearlyView({ id: found.id, name: found.name });
                }}
              >
                <SelectTrigger className="w-[160px] sm:w-[180px] rounded-xl h-9 text-xs font-semibold border-border/60 bg-background">
                  <SelectValue placeholder="Switch Card" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {allPaymentSources.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="truncate text-xs">{s.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val, 10))}>
                <SelectTrigger className="w-[95px] rounded-xl h-9 text-xs font-bold border-border/60 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableYears.map(yr => (
                    <SelectItem key={yr} value={yr.toString()}>
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hero Card: Year-To-Date (YTD) Spend for this Specific Card */}
          <Card className="p-4 bg-gradient-to-r from-primary/15 via-primary/10 to-indigo-500/10 border-primary/30 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  YEAR-TO-DATE (YTD) SPEND • {selectedYear}
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground mt-1">
                  ₹{singleCardYearlySpend.totalCardYtdSpend.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {singleCardYearlySpend.cardTotalTransactions} total transaction{singleCardYearlySpend.cardTotalTransactions === 1 ? '' : 's'} on this card in {selectedYear}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </Card>

          {/* 12-Month Spend Grid for this Specific Card (JAN - DEC) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-foreground">Monthly Breakdown ({selectedYear})</h4>
              <span className="text-xs text-muted-foreground font-medium">Tap any month to view transactions</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {singleCardYearlySpend.months.map((m) => {
                const isSelectedMonth = currentMonth.getFullYear() === selectedYear && currentMonth.getMonth() === m.monthIndex;
                const barWidth = singleCardYearlySpend.maxMonthSpend > 0 
                  ? (m.totalAmount / singleCardYearlySpend.maxMonthSpend) * 100 
                  : 0;

                return (
                  <Card 
                    key={m.monthName}
                    onClick={() => {
                      setCurrentMonth(new Date(selectedYear, m.monthIndex, 1));
                      setSelectedCard(singleCardYearlySpend.cardId);
                      setActiveSubTab('list');
                    }}
                    className={cn(
                      "p-3 rounded-2xl cursor-pointer transition-all duration-200 border space-y-2 hover:-translate-y-0.5",
                      isSelectedMonth 
                        ? "border-primary ring-2 ring-primary/30 bg-primary/10 shadow-xs" 
                        : "border-border/60 hover:border-primary/40 bg-card"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground uppercase">{m.monthName}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {m.count} exp
                      </span>
                    </div>

                    <p className="text-sm font-extrabold font-mono text-foreground">
                      ₹{m.totalAmount.toLocaleString('en-IN')}
                    </p>

                    {/* Visual Bar */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          m.totalAmount > 0 ? "bg-primary" : "bg-transparent"
                        )}
                        style={{ width: `${Math.min(100, Math.max(5, barWidth))}%` }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Card Transactions List */}
          <div className="space-y-2 pt-2">
            <h4 className="font-bold text-sm text-foreground">
              Transactions for {singleCardYearlySpend.cardName}
            </h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {singleCardYearlySpend.cardExpenses.length === 0 ? (
                <div className="text-center py-6 px-4 border border-dashed rounded-2xl border-border/60">
                  <p className="text-muted-foreground text-xs font-medium">No transactions recorded for this card yet</p>
                </div>
              ) : (
                singleCardYearlySpend.cardExpenses.map((expense) => (
                  <Card key={expense.id} className="p-3 hover:bg-secondary/40 transition-colors rounded-xl border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xl shrink-0">{getCategoryEmoji(expense.category)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-foreground truncate">{expense.storeName || expense.category}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(expense.date), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-destructive font-mono">
                          -₹{expense.amount.toLocaleString('en-IN')}
                        </p>
                        {onDeleteExpense && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 h-7 w-7 rounded-lg"
                            onClick={() => onDeleteExpense(expense.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MONTH-WISE & YEAR-WISE SUMS */}
      {activeSubTab === 'months' && !selectedCardForYearlyView && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-foreground">Monthly & Yearly Spend Summary</h3>
              <p className="text-xs text-muted-foreground">
                Sum of spend month-wise and total YTD for {selectedYear}
              </p>
            </div>

            {/* Year Selector */}
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val, 10))}>
              <SelectTrigger className="w-[110px] rounded-xl h-9 text-xs font-bold border-border/60 bg-background shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableYears.map(yr => (
                  <SelectItem key={yr} value={yr.toString()}>
                    {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* YTD Total Spend Box */}
          <Card className="p-4 bg-gradient-to-r from-primary/15 via-primary/10 to-accent/10 border-primary/20 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Year-To-Date (YTD) Spend • {selectedYear}
                </p>
                <p className="text-2xl md:text-3xl font-extrabold font-mono text-foreground mt-0.5">
                  ₹{yearlyMonthlySpend.totalYearSpend.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-primary/20 text-primary">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </Card>

          {/* Month-wise Spend Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {yearlyMonthlySpend.months.map((m) => {
              const isCurrentSelectedMonth = currentMonth.getFullYear() === selectedYear && currentMonth.getMonth() === m.monthIndex;
              const barWidth = yearlyMonthlySpend.maxMonthSpend > 0 
                ? (m.totalAmount / yearlyMonthlySpend.maxMonthSpend) * 100 
                : 0;

              return (
                <Card 
                  key={m.monthName}
                  onClick={() => {
                    setCurrentMonth(new Date(selectedYear, m.monthIndex, 1));
                    setActiveSubTab('list');
                  }}
                  className={cn(
                    "p-3 rounded-2xl cursor-pointer transition-all duration-200 border space-y-2 hover:-translate-y-0.5",
                    isCurrentSelectedMonth 
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                      : "border-border/60 hover:border-primary/40 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground uppercase">{m.monthName}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {m.count} exp
                    </span>
                  </div>

                  <p className="text-sm font-extrabold font-mono text-foreground">
                    ₹{m.totalAmount.toLocaleString('en-IN')}
                  </p>

                  {/* Visual Bar */}
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        m.totalAmount > 0 ? "bg-primary" : "bg-transparent"
                      )}
                      style={{ width: `${Math.min(100, Math.max(5, barWidth))}%` }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};



