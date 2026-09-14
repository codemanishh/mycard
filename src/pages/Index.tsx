import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard as CreditCardType } from '@/types/creditCard';
import { BankAccount, Expense, Lending } from '@/types/expense';
import { CreditCardItem } from '@/components/CreditCardItem';
import { CardCircle } from '@/components/CardCircle';
import { CardDetailsDialog } from '@/components/CardDetailsDialog';
import { AddCardDialog } from '@/components/AddCardDialog';
import { BankBalanceCard } from '@/components/BankBalanceCard';
import { AddExpenseDialog } from '@/components/AddExpenseDialog';
import { QuickExpenseDialog } from '@/components/QuickExpenseDialog';
import { LendingDialog } from '@/components/LendingDialog';
import { TransactionHistory } from '@/components/TransactionHistory';
import { LendingList } from '@/components/LendingList';
import { LendingHistory } from '@/components/LendingHistory';
import { EditBankDialog } from '@/components/EditBankDialog';
import { AddBankDialog } from '@/components/AddBankDialog';
import { ProfileDialog } from '@/components/ProfileDialog';
import { VoicePaymentDialog } from '@/components/VoicePaymentDialog';
import TodoApp from '@/pages/TodoApp';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Bell, TrendingUp, Grid3x3, ArrowLeft, Receipt, Users, Pencil, LogOut, History, Building2, User, ListTodo, MessageCircle, Calendar, Mic, CircleDot, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOffline } from '@/contexts/OfflineContext';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { queueMutation } = useOffline();
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [lendings, setLendings] = useState<Lending[]>([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [viewMode, setViewMode] = useState<'circles' | 'grid' | 'carousel'>('circles');
  const [selectedCard, setSelectedCard] = useState<CreditCardType | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [quickExpenseDialogOpen, setQuickExpenseDialogOpen] = useState(false);
  const [quickExpenseSource, setQuickExpenseSource] = useState<{
    type: 'bank' | 'credit_card';
    id: string;
    name: string;
  } | null>(null);
  const [lendingDialogOpen, setLendingDialogOpen] = useState(false);
  const [editingLending, setEditingLending] = useState<Lending | null>(null);
  const [bankEditDialogOpen, setBankEditDialogOpen] = useState(false);
  const [bankAddDialogOpen, setBankAddDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [lendingTab, setLendingTab] = useState<'pending' | 'history'>('pending');
  const [cardSortBy, setCardSortBy] = useState<'billingDate' | 'bankName'>('billingDate');
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [mainTab, setMainTab] = useState<string>('cards');
  
  const { toast } = useToast();

  const handleConfirmVoiceExpense = async (expense: {
    sourceType: 'credit_card' | 'bank';
    sourceId: string;
    sourceName: string;
    amount: number;
    category: string;
    note: string;
  }) => {
    if (!user) return;

    // 1. Insert expense record
    const newExpense = {
      user_id: user.id,
      amount: expense.amount,
      date: new Date().toISOString().split('T')[0],
      category: expense.category,
      payment_method: expense.sourceType,
      payment_source_id: expense.sourceId,
      payment_source_name: expense.sourceName,
      note: expense.note,
    };

    const { data: insertedExp, error: expError } = await supabase
      .from('expenses')
      .insert(newExpense)
      .select()
      .single();

    if (expError) throw expError;

    // Update local expenses state
    if (insertedExp) {
      const mapped: Expense = {
        id: insertedExp.id,
        amount: Number(insertedExp.amount),
        date: insertedExp.date,
        category: insertedExp.category as Expense['category'],
        paymentMethod: insertedExp.payment_method as Expense['paymentMethod'],
        paymentSourceId: insertedExp.payment_source_id,
        paymentSourceName: insertedExp.payment_source_name,
        note: insertedExp.note || undefined,
        createdAt: insertedExp.created_at,
      };
      setExpenses(prev => [mapped, ...prev]);
    }

    // 2. Update Credit Card Bill or Bank Balance
    if (expense.sourceType === 'credit_card') {
      const targetCard = cards.find(c => c.id === expense.sourceId);
      if (targetCard) {
        const newBill = targetCard.currentBill + expense.amount;
        const { error: cardError } = await supabase
          .from('credit_cards')
          .update({ current_bill: newBill })
          .eq('id', targetCard.id);

        if (!cardError) {
          setCards(prev => prev.map(c => c.id === targetCard.id ? { ...c, currentBill: newBill } : c));
        }
      }
    } else {
      const targetBank = bankAccounts.find(b => b.id === expense.sourceId);
      if (targetBank) {
        const newBalance = targetBank.balance - expense.amount;
        const { error: bankError } = await supabase
          .from('bank_accounts')
          .update({ balance: newBalance })
          .eq('id', targetBank.id);

        if (!bankError) {
          setBankAccounts(prev => prev.map(b => b.id === targetBank.id ? { ...b, balance: newBalance } : b));
        }
      }
    }
  };

  const getBillingDaysLeft = (billingDate: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    let nextBillingDate = new Date(currentYear, currentMonth, billingDate);
    if (currentDay >= billingDate) {
      nextBillingDate = new Date(currentYear, currentMonth + 1, billingDate);
    }
    return Math.ceil((nextBillingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const sortedCards = [...cards].sort((a, b) => {
    if (cardSortBy === 'bankName') {
      const bankCompare = a.bankName.localeCompare(b.bankName);
      if (bankCompare !== 0) return bankCompare;
      return a.cardName.localeCompare(b.cardName);
    }
    // Default: Sort by billing date / days left (nearest deadline first)
    const daysA = getBillingDaysLeft(a.billingDate);
    const daysB = getBillingDaysLeft(b.billingDate);
    return daysA - daysB;
  });

  // Fetch data from database
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      // Fetch credit cards
      const { data: cardsData } = await supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (cardsData) {
        setCards(cardsData.map(card => ({
          id: card.id,
          cardName: card.card_name,
          bankName: card.bank_name,
          billingDate: card.billing_date,
          currentBill: Number(card.current_bill) || 0,
          limitAmount: Number(card.limit_amount) || 0,
          limitType: card.limit_type as CreditCardType['limitType'],
          status: card.status as CreditCardType['status'],
          notes: card.notes || '',
          cardNumber: (card as any).card_number || (card as any).cardNumber || '',
          expiryDate: (card as any).expiry_date || (card as any).expiryDate || '',
          createdAt: card.created_at,
        })));
      }

      // Fetch bank accounts
      const { data: banksData } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (banksData) {
        setBankAccounts(banksData.map(bank => ({
          id: bank.id,
          bankName: bank.bank_name,
          balance: Number(bank.balance) || 0,
          type: bank.type as BankAccount['type'],
        })));
      }

      // Fetch expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (expensesData) {
        setExpenses(expensesData.map(exp => ({
          id: exp.id,
          amount: Number(exp.amount),
          date: exp.date,
          category: exp.category as Expense['category'],
          storeName: exp.store_name || undefined,
          paymentMethod: exp.payment_method as Expense['paymentMethod'],
          paymentSourceId: exp.payment_source_id,
          paymentSourceName: exp.payment_source_name,
          note: exp.note || undefined,
          createdAt: exp.created_at,
        })));
      }

      // Fetch lendings
      const { data: lendingsData } = await supabase
        .from('lendings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (lendingsData) {
        setLendings(lendingsData.map(l => ({
          id: l.id,
          personName: l.person_name,
          amount: Number(l.amount),
          givenDate: l.given_date,
          reminderDate: l.reminder_date || undefined,
          borrowerPhone: l.borrower_phone || undefined,
          isReturned: l.is_returned || false,
          note: l.note || undefined,
          createdAt: l.created_at,
        })));
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (cards.length > 0) {
      checkUpcomingBills();
    }
  }, [cards]);

  useEffect(() => {
    if (lendings.length > 0) {
      checkLendingReminders();
    }
  }, [lendings]);

  const checkUpcomingBills = () => {
    const today = new Date();
    const currentDay = today.getDate();
    
    cards.forEach((card: CreditCardType) => {
      const daysUntilBill = card.billingDate - currentDay;
      
      if (daysUntilBill === 0 && card.currentBill > 0) {
        toast({
          title: '💳 Bill Due Today!',
          description: `${card.bankName} ${card.cardName}: ₹${card.currentBill.toLocaleString('en-IN')}`,
          duration: 10000,
        });
      } else if (daysUntilBill === 1 && card.currentBill > 0) {
        toast({
          title: '⚠️ Bill Due Tomorrow',
          description: `${card.bankName} ${card.cardName}: ₹${card.currentBill.toLocaleString('en-IN')}`,
          duration: 8000,
        });
      } else if (daysUntilBill > 0 && daysUntilBill <= 3 && card.currentBill > 0) {
        toast({
          title: `📅 Bill Due in ${daysUntilBill} Days`,
          description: `${card.bankName} ${card.cardName}: ₹${card.currentBill.toLocaleString('en-IN')}`,
          duration: 6000,
        });
      }
    });
  };

  const checkLendingReminders = () => {
    const today = new Date();
    lendings.forEach((lending) => {
      if (lending.isReturned || !lending.reminderDate) return;
      
      const reminderDate = new Date(lending.reminderDate);
      if (reminderDate.toDateString() === today.toDateString()) {
        toast({
          title: '💰 Reminder: Ask for money back!',
          description: `${lending.personName} owes you ₹${lending.amount.toLocaleString('en-IN')}`,
          duration: 10000,
        });
      }
    });
  };

  const handleSendWhatsAppReminder = async (card: CreditCardType) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-reminder', {
        body: {
          userId: user.id,
          cardName: card.cardName,
          bankName: card.bankName,
          billAmount: card.currentBill,
          dueDate: card.billingDate,
        },
      });

      if (error) throw error;

      if (data?.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
        toast({
          title: 'WhatsApp Opened',
          description: 'Send the message to receive the reminder.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reminder. Please update your phone in profile.',
        variant: 'destructive',
      });
    }
  };

  const handleAddCard = async (cardData: Omit<CreditCardType, 'id' | 'createdAt'>) => {
    if (!user) return;

    if (editingCard) {
      const { error } = await supabase
        .from('credit_cards')
        .update({
          card_name: cardData.cardName,
          bank_name: cardData.bankName,
          billing_date: cardData.billingDate,
          current_bill: cardData.currentBill,
          limit_amount: cardData.limitAmount,
          limit_type: cardData.limitType,
          status: cardData.status,
          notes: cardData.notes,
        })
        .eq('id', editingCard.id);

      if (!error) {
        setCards(cards.map(c => c.id === editingCard.id ? { ...cardData, id: editingCard.id, createdAt: editingCard.createdAt } : c));
        setEditingCard(null);
      }
    } else {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({
          user_id: user.id,
          card_name: cardData.cardName,
          bank_name: cardData.bankName,
          billing_date: cardData.billingDate,
          current_bill: cardData.currentBill,
          limit_amount: cardData.limitAmount,
          limit_type: cardData.limitType,
          status: cardData.status,
          notes: cardData.notes,
        })
        .select()
        .single();

      if (data && !error) {
        const newCard: CreditCardType = {
          ...cardData,
          id: data.id,
          createdAt: data.created_at,
        };
        setCards([newCard, ...cards]);
      }
    }
  };

  const handleEditCard = (card: CreditCardType) => {
    setEditingCard(card);
    setDialogOpen(true);
  };

  const handleDeleteCard = async (id: string) => {
    const cardToDelete = cards.find(c => c.id === id);
    
    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', id);

    if (!error) {
      setCards(cards.filter(c => c.id !== id));
      toast({
        title: 'Card Deleted',
        description: `${cardToDelete?.cardName} has been removed.`,
      });
    }
  };

  const handleCardClick = (card: CreditCardType) => {
    setSelectedCard(card);
    setDetailsOpen(true);
  };

  const handleAddBank = async (bankData: Omit<BankAccount, 'id'>) => {
    if (!user) return;
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          bank_name: bankData.bankName,
          balance: bankData.balance,
          type: bankData.type,
        })
        .select()
        .single();

      if (data && !error) {
        setBankAccounts([{
          id: data.id,
          bankName: data.bank_name,
          balance: Number(data.balance) || 0,
          type: data.type as BankAccount['type'],
        }, ...bankAccounts]);
        toast({
          title: 'Bank Added',
          description: `${bankData.bankName} has been added.`,
        });
      }
    } else {
      // queue for later and optimistically update UI
      const tempId = `offline-${Date.now()}`;
      await queueMutation('supabase', { op: 'insert', table: 'bank_accounts', data: { user_id: user.id, bank_name: bankData.bankName, balance: bankData.balance, type: bankData.type } });
      setBankAccounts([{ id: tempId, bankName: bankData.bankName, balance: bankData.balance, type: bankData.type }, ...bankAccounts]);
      toast({ title: 'Bank Added (offline)', description: `${bankData.bankName} will be saved when online.` });
    }
  };

  const handleDeleteBank = async (id: string) => {
    const bankToDelete = bankAccounts.find(b => b.id === id);
    if (navigator.onLine) {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (!error) {
        setBankAccounts(bankAccounts.filter(b => b.id !== id));
        toast({ title: 'Bank Deleted', description: `${bankToDelete?.bankName} has been removed.` });
      }
    } else {
      // queue deletion and optimistically remove
      await queueMutation('supabase', { op: 'delete', table: 'bank_accounts', match: { id } });
      setBankAccounts(bankAccounts.filter(b => b.id !== id));
      toast({ title: 'Bank Deleted (offline)', description: `${bankToDelete?.bankName} will be removed when online.` });
    }
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!user) return;
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          amount: expenseData.amount,
          date: expenseData.date,
          category: expenseData.category,
          store_name: expenseData.storeName,
          payment_method: expenseData.paymentMethod,
          payment_source_id: expenseData.paymentSourceId,
          payment_source_name: expenseData.paymentSourceName,
          note: expenseData.note,
        })
        .select()
        .single();

      if (data && !error) {
        const newExpense: Expense = { ...expenseData, id: data.id, createdAt: data.created_at };
        setExpenses([newExpense, ...expenses]);

        if (expenseData.paymentMethod === 'bank') {
          const updatedBalance = bankAccounts.find(acc => acc.id === expenseData.paymentSourceId)!.balance - expenseData.amount;
          await supabase.from('bank_accounts').update({ balance: updatedBalance }).eq('id', expenseData.paymentSourceId);
          setBankAccounts(bankAccounts.map(acc => acc.id === expenseData.paymentSourceId ? { ...acc, balance: updatedBalance } : acc));
        } else {
          const card = cards.find(c => c.id === expenseData.paymentSourceId);
          if (card) {
            const updatedBill = card.currentBill + expenseData.amount;
            await supabase.from('credit_cards').update({ current_bill: updatedBill }).eq('id', expenseData.paymentSourceId);
            setCards(cards.map(c => c.id === expenseData.paymentSourceId ? { ...c, currentBill: updatedBill } : c));
          }
        }

        toast({ title: 'Expense Added', description: `₹${expenseData.amount.toLocaleString('en-IN')} from ${expenseData.paymentSourceName}` });
      }
    } else {
      // Offline: queue expense insert and any dependent updates, then optimistic UI update
      const tempId = `offline-expense-${Date.now()}`;
      await queueMutation('supabase', { op: 'insert', table: 'expenses', data: { user_id: user.id, amount: expenseData.amount, date: expenseData.date, category: expenseData.category, store_name: expenseData.storeName, payment_method: expenseData.paymentMethod, payment_source_id: expenseData.paymentSourceId, payment_source_name: expenseData.paymentSourceName, note: expenseData.note } });

      const newExpense: Expense = { ...expenseData, id: tempId, createdAt: new Date().toISOString() };
      setExpenses([newExpense, ...expenses]);

      if (expenseData.paymentMethod === 'bank') {
        const updatedBalance = bankAccounts.find(acc => acc.id === expenseData.paymentSourceId)!.balance - expenseData.amount;
        await queueMutation('supabase', { op: 'update', table: 'bank_accounts', data: { balance: updatedBalance }, match: { id: expenseData.paymentSourceId } });
        setBankAccounts(bankAccounts.map(acc => acc.id === expenseData.paymentSourceId ? { ...acc, balance: updatedBalance } : acc));
      } else {
        const card = cards.find(c => c.id === expenseData.paymentSourceId);
        if (card) {
          const updatedBill = card.currentBill + expenseData.amount;
          await queueMutation('supabase', { op: 'update', table: 'credit_cards', data: { current_bill: updatedBill }, match: { id: expenseData.paymentSourceId } });
          setCards(cards.map(c => c.id === expenseData.paymentSourceId ? { ...c, currentBill: updatedBill } : c));
        }
      }

      toast({ title: 'Expense Added (offline)', description: `₹${expenseData.amount.toLocaleString('en-IN')} will be synced when online.` });
    }
  };

  const handleAddLending = async (lendingData: Omit<Lending, 'id' | 'createdAt' | 'isReturned'>) => {
    if (!user) return;

    if (editingLending) {
      const { error } = await supabase
        .from('lendings')
        .update({
          person_name: lendingData.personName,
          amount: lendingData.amount,
          given_date: lendingData.givenDate,
          reminder_date: lendingData.reminderDate,
          borrower_phone: lendingData.borrowerPhone,
          note: lendingData.note,
        })
        .eq('id', editingLending.id);

      if (!error) {
        setLendings(lendings.map(l => 
          l.id === editingLending.id 
            ? { ...lendingData, id: editingLending.id, isReturned: editingLending.isReturned, createdAt: editingLending.createdAt }
            : l
        ));
        setEditingLending(null);
        toast({
          title: 'Lending Updated',
          description: `Updated lending for ${lendingData.personName}`,
        });
      }
    } else {
      const { data, error } = await supabase
        .from('lendings')
        .insert({
          user_id: user.id,
          person_name: lendingData.personName,
          amount: lendingData.amount,
          given_date: lendingData.givenDate,
          reminder_date: lendingData.reminderDate,
          borrower_phone: lendingData.borrowerPhone,
          note: lendingData.note,
          is_returned: false,
        })
        .select()
        .single();

      if (data && !error) {
        const newLending: Lending = {
          ...lendingData,
          id: data.id,
          isReturned: false,
          createdAt: data.created_at,
        };
        setLendings([newLending, ...lendings]);
        toast({
          title: 'Lending Added',
          description: `₹${lendingData.amount.toLocaleString('en-IN')} to ${lendingData.personName}`,
        });
      }
    }
  };

  const handleEditLending = (lending: Lending) => {
    setEditingLending(lending);
    setLendingDialogOpen(true);
  };

  const handleMarkReturned = async (id: string) => {
    const { error } = await supabase
      .from('lendings')
      .update({ is_returned: true })
      .eq('id', id);

    if (!error) {
      setLendings(lendings.map(l => 
        l.id === id ? { ...l, isReturned: true } : l
      ));
      toast({
        title: 'Marked as Closed',
        description: 'Lending has been marked as closed.',
      });
    }
  };

  const handleDeleteLending = async (id: string) => {
    const { error } = await supabase
      .from('lendings')
      .delete()
      .eq('id', id);

    if (!error) {
      setLendings(lendings.filter(l => l.id !== id));
      toast({
        title: 'Deleted',
        description: 'Lending record has been removed.',
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (!error) {
      setExpenses(expenses.filter(e => e.id !== id));
      
      // Restore balance if it was from a bank account
      if (expenseToDelete && expenseToDelete.paymentMethod === 'bank') {
        const bank = bankAccounts.find(acc => acc.id === expenseToDelete.paymentSourceId);
        if (bank) {
          const restoredBalance = bank.balance + expenseToDelete.amount;
          await supabase
            .from('bank_accounts')
            .update({ balance: restoredBalance })
            .eq('id', expenseToDelete.paymentSourceId);
          
          setBankAccounts(bankAccounts.map(acc => 
            acc.id === expenseToDelete.paymentSourceId 
              ? { ...acc, balance: restoredBalance }
              : acc
          ));
        }
      } else if (expenseToDelete && expenseToDelete.paymentMethod === 'credit_card') {
        // Reduce credit card bill
        const card = cards.find(c => c.id === expenseToDelete.paymentSourceId);
        if (card) {
          const updatedBill = Math.max(0, card.currentBill - expenseToDelete.amount);
          await supabase
            .from('credit_cards')
            .update({ current_bill: updatedBill })
            .eq('id', expenseToDelete.paymentSourceId);
          
          setCards(cards.map(c => 
            c.id === expenseToDelete.paymentSourceId 
              ? { ...c, currentBill: updatedBill }
              : c
          ));
        }
      }
      
      toast({
        title: 'Expense Deleted',
        description: `₹${expenseToDelete?.amount.toLocaleString('en-IN')} has been removed.`,
      });
    }
  };

  const handleQuickExpenseFromBank = (bank: BankAccount) => {
    setQuickExpenseSource({
      type: 'bank',
      id: bank.id,
      name: bank.bankName,
    });
    setQuickExpenseDialogOpen(true);
  };

  const handleQuickExpenseFromCard = (card: CreditCardType) => {
    setQuickExpenseSource({
      type: 'credit_card',
      id: card.id,
      name: `${card.bankName} ${card.cardName}`,
    });
    setQuickExpenseDialogOpen(true);
  };

  const handleUpdateBankBalance = async (bankId: string, newBalance: number) => {
    const { error } = await supabase
      .from('bank_accounts')
      .update({ balance: newBalance })
      .eq('id', bankId);

    if (!error) {
      setBankAccounts(bankAccounts.map(acc => 
        acc.id === bankId ? { ...acc, balance: newBalance } : acc
      ));
      toast({
        title: 'Balance Updated',
        description: 'Bank balance has been updated successfully.',
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    });
  };

  const totalBill = cards.reduce((sum, card) => sum + card.currentBill, 0);
  const totalLimit = cards.reduce((sum, card) => sum + card.limitAmount, 0);
  const usedLimit = totalBill;
  const utilizationPercent = totalLimit > 0 ? Math.round((usedLimit / totalLimit) * 100) : 0;
  const totalBankBalance = bankAccounts.reduce((sum, bank) => sum + bank.balance, 0);
  const netActualBalance = totalBankBalance - totalBill;
  const activeCards = cards.filter(c => c.status === 'active').length;
  const upcomingBills = cards.filter(card => {
    const today = new Date().getDate();
    const daysLeft = card.billingDate - today;
    return daysLeft > 0 && daysLeft <= 7 && card.currentBill > 0;
  }).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header with Premium Gradient */}
      <header className="gradient-hero text-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 md:w-96 h-64 md:h-96 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-32 -left-32 w-48 md:w-80 h-48 md:h-80 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 pb-6 md:pb-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="p-1.5 md:p-2 bg-white/20 rounded-lg md:rounded-xl backdrop-blur-sm shrink-0">
                <CreditCard className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold tracking-tight">Finance Tracker</h1>
                <p className="text-[10px] md:text-xs text-white/70 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-1 md:gap-2 shrink-0">
              <Button 
                onClick={() => setVoiceDialogOpen(true)}
                size="icon"
                className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-md backdrop-blur-sm rounded-lg md:rounded-xl h-8 w-8 md:h-10 md:w-10 transition-all active:scale-95"
                title="Voice Payment Logger (Speak to add expense/bill)"
              >
                <Mic className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <Button 
                onClick={() => setExpenseDialogOpen(true)}
                size="icon"
                className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm rounded-lg md:rounded-xl h-8 w-8 md:h-10 md:w-10 transition-all active:scale-95"
              >
                <Receipt className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
              <Button 
                onClick={() => setLendingDialogOpen(true)}
                size="icon"
                className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm rounded-lg md:rounded-xl h-8 w-8 md:h-10 md:w-10 transition-all active:scale-95"
              >
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
              <Button 
                onClick={() => {
                  setEditingCard(null);
                  setDialogOpen(true);
                }}
                size="icon"
                className="bg-white hover:bg-white/90 text-primary border-0 rounded-lg md:rounded-xl h-8 w-8 md:h-10 md:w-10 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <Button 
                onClick={() => setProfileDialogOpen(true)}
                size="icon"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg md:rounded-xl h-8 w-8 md:h-10 md:w-10 transition-all active:scale-95"
              >
                <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
              <Button 
                onClick={handleLogout}
                size="icon"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg md:rounded-xl h-8 w-8 md:h-10 md:w-10 transition-all active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </div>
          </div>

          {/* Bank Balances */}
          <BankBalanceCard accounts={bankAccounts} totalBills={totalBill} onBankClick={handleQuickExpenseFromBank} />
          <div className="flex gap-2 mt-2 md:mt-3">
            <Button 
              onClick={() => setBankAddDialogOpen(true)}
              size="sm"
              variant="ghost"
              className="flex-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg md:rounded-xl transition-all text-xs md:text-sm h-8 md:h-9"
            >
              <Building2 className="w-3 h-3 mr-1.5 md:mr-2" />
              Manage Banks
            </Button>
            <Button 
              onClick={() => setBankEditDialogOpen(true)}
              size="sm"
              variant="ghost"
              className="flex-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg md:rounded-xl transition-all text-xs md:text-sm h-8 md:h-9"
            >
              <Pencil className="w-3 h-3 mr-1.5 md:mr-2" />
              Edit Balance
            </Button>
          </div>

          {/* Unified Credit Summary Box */}
          <div className="bg-white/15 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/20 mt-3 md:mt-4 shadow-lg space-y-3">
            <div className="grid grid-cols-3 gap-2 md:gap-4 divide-x divide-white/20 text-center">
              {/* 1st: Total Limit */}
              <div className="px-1 md:px-2">
                <div className="flex items-center justify-center gap-1 md:gap-1.5 mb-1">
                  <div className="p-1 bg-white/20 rounded-md">
                    <CreditCard className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                  </div>
                  <p className="text-[10px] md:text-xs text-white/80 font-medium uppercase tracking-wider">Total Limit</p>
                </div>
                <p className="text-sm md:text-xl font-bold font-mono text-white">₹{totalLimit.toLocaleString('en-IN')}</p>
              </div>

              {/* 2nd: Used Limit */}
              <div className="px-1 md:px-2">
                <div className="flex items-center justify-center gap-1 md:gap-1.5 mb-1">
                  <div className="p-1 bg-white/20 rounded-md">
                    <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                  </div>
                  <p className="text-[10px] md:text-xs text-white/80 font-medium uppercase tracking-wider">Used Limit</p>
                </div>
                <p className="text-sm md:text-xl font-bold font-mono text-white">₹{usedLimit.toLocaleString('en-IN')}</p>
              </div>

              {/* 3rd: % Utilized */}
              <div className="px-1 md:px-2">
                <div className="flex items-center justify-center gap-1 md:gap-1.5 mb-1">
                  <div className="p-1 bg-white/20 rounded-md">
                    <PieChart className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                  </div>
                  <p className="text-[10px] md:text-xs text-white/80 font-medium uppercase tracking-wider">% Utilized</p>
                </div>
                <p className={cn(
                  "text-sm md:text-xl font-bold font-mono",
                  utilizationPercent > 75 ? "text-red-300" : utilizationPercent > 50 ? "text-amber-300" : "text-emerald-300"
                )}>
                  {utilizationPercent}%
                </p>
              </div>
            </div>

            {/* % Utilized Progress Bar */}
            {totalLimit > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      utilizationPercent > 75 ? "bg-red-400" : utilizationPercent > 50 ? "bg-amber-300" : "bg-emerald-400"
                    )}
                    style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                  />
                </div>
                <span className="text-[10px] md:text-xs font-semibold text-white/90 shrink-0">
                  {utilizationPercent < 30 ? '🟢 Safe Ratio' : utilizationPercent < 70 ? '🟡 Moderate' : '🔴 High Usage'}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6 pb-20 md:pb-24 -mt-2 md:-mt-4 relative z-10">
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 md:mb-6 bg-card/80 backdrop-blur-lg border border-border/50 shadow-card p-1 h-10 md:h-12 rounded-xl md:rounded-2xl">
            <TabsTrigger value="cards" className="rounded-lg md:rounded-xl text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Cards</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg md:rounded-xl text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">History</TabsTrigger>
            <TabsTrigger value="lending" className="rounded-lg md:rounded-xl text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Lending</TabsTrigger>
            <TabsTrigger value="todo" className="rounded-lg md:rounded-xl text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">To-Do</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="animate-fade-in space-y-5">
            {/* Header & View Switcher Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-foreground">Your Cards</h2>
                <span className="text-xs text-muted-foreground font-semibold px-2 py-0.5 bg-muted rounded-full">
                  {sortedCards.length} Cards
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* View Switcher: Circles vs Grid vs Deck */}
                <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/40 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('circles')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5",
                      viewMode === 'circles'
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <CircleDot className="w-3.5 h-3.5 text-primary" />
                    <span>Circles</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5",
                      viewMode === 'grid'
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Grid3x3 className="w-3.5 h-3.5" />
                    <span>Card Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('carousel')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5",
                      viewMode === 'carousel'
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Deck</span>
                  </button>
                </div>

                {/* Sort Options */}
                <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/40 text-xs">
                  <button
                    onClick={() => setCardSortBy('billingDate')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5",
                      cardSortBy === 'billingDate'
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Order by billing date / due date"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due Date</span>
                  </button>
                  <button
                    onClick={() => setCardSortBy('bankName')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5",
                      cardSortBy === 'bankName'
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Group by bank names together"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>By Bank</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {sortedCards.length === 0 ? (
              <Card className="p-8 md:p-12 text-center shadow-card border-border/50 rounded-2xl md:rounded-3xl bg-gradient-to-br from-card to-secondary/30 animate-scale-in">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2">No cards added yet</h3>
                <p className="text-muted-foreground mb-4 md:mb-6 text-sm md:text-base">
                  Start tracking your credit card bills by adding your first card
                </p>
                <Button onClick={() => setDialogOpen(true)} className="rounded-xl px-5 md:px-6 text-sm md:text-base">
                  <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Add Your First Card
                </Button>
              </Card>
            ) : viewMode === 'circles' ? (
              /* CIRCLES VIEW (DEFAULT) */
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-6 justify-items-center pt-2">
                {sortedCards.map((card, index) => (
                  <CardCircle
                    key={card.id}
                    card={card}
                    onClick={handleCardClick}
                    index={index}
                  />
                ))}
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW: 3D Physical Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 pt-2">
                {sortedCards.map((card) => (
                  <CreditCardItem
                    key={card.id}
                    card={card}
                    onEdit={handleEditCard}
                    onDelete={handleDeleteCard}
                    onAddExpense={handleQuickExpenseFromCard}
                  />
                ))}
              </div>
            ) : (
              /* CAROUSEL DECK VIEW */
              <div className="relative pt-2">
                <Carousel 
                  opts={{
                    align: "center",
                    loop: false,
                  }}
                  orientation="vertical"
                  className="w-full max-w-xl mx-auto"
                >
                  <CarouselContent className="-mt-4 h-[620px]">
                    {sortedCards.map((card, index) => (
                      <CarouselItem key={card.id} className="pt-4">
                        <div className="p-1 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                          <div className="mb-3 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs">
                              Card {index + 1} of {cards.length}
                            </span>
                          </div>
                          <CreditCardItem
                            card={card}
                            onEdit={handleEditCard}
                            onDelete={handleDeleteCard}
                            onAddExpense={handleQuickExpenseFromCard}
                          />
                          {card.currentBill > 0 && (
                            <Button
                              onClick={() => handleSendWhatsAppReminder(card)}
                              variant="outline"
                              size="sm"
                              className="w-full mt-2 rounded-xl border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Send WhatsApp Reminder
                            </Button>
                          )}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="top-0" />
                  <CarouselNext className="bottom-0" />
                </Carousel>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="animate-fade-in">
            <TransactionHistory expenses={expenses} onDeleteExpense={handleDeleteExpense} />
          </TabsContent>

          <TabsContent value="lending" className="animate-fade-in">
            {/* Sub-tabs for Pending/History */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={lendingTab === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLendingTab('pending')}
                className="rounded-xl transition-all"
              >
                <Users className="w-4 h-4 mr-2" />
                Pending
              </Button>
              <Button
                variant={lendingTab === 'history' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLendingTab('history')}
                className="rounded-xl transition-all"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            </div>
            
            {lendingTab === 'pending' ? (
              <LendingList lendings={lendings} onMarkReturned={handleMarkReturned} onDelete={handleDeleteLending} onEdit={handleEditLending} />
            ) : (
              <LendingHistory lendings={lendings} onDelete={handleDeleteLending} />
            )}
          </TabsContent>

          <TabsContent value="todo" className="animate-fade-in">
            <TodoApp embedMode={true} />
          </TabsContent>
        </Tabs>
      </main>

      <CardDetailsDialog
        card={selectedCard}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={handleEditCard}
        onDelete={handleDeleteCard}
        onAddExpense={handleQuickExpenseFromCard}
      />

      <AddCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleAddCard}
        editCard={editingCard}
      />

      <AddExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSave={handleAddExpense}
        bankAccounts={bankAccounts}
        creditCards={cards}
      />

      <LendingDialog
        open={lendingDialogOpen}
        onOpenChange={(open) => {
          setLendingDialogOpen(open);
          if (!open) setEditingLending(null);
        }}
        onSave={handleAddLending}
        editingLending={editingLending}
      />

      <EditBankDialog
        open={bankEditDialogOpen}
        onOpenChange={setBankEditDialogOpen}
        bankAccounts={bankAccounts}
        onUpdateBalance={handleUpdateBankBalance}
      />

      <AddBankDialog
        open={bankAddDialogOpen}
        onOpenChange={setBankAddDialogOpen}
        onAddBank={handleAddBank}
        onDeleteBank={handleDeleteBank}
        existingBanks={bankAccounts}
      />

      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        userId={user?.id || ''}
        userEmail={user?.email || ''}
      />

      <QuickExpenseDialog
        open={quickExpenseDialogOpen}
        onOpenChange={setQuickExpenseDialogOpen}
        onSave={handleAddExpense}
        paymentSource={quickExpenseSource}
      />

      <VoicePaymentDialog
        open={voiceDialogOpen}
        onOpenChange={setVoiceDialogOpen}
        cards={cards}
        bankAccounts={bankAccounts}
        onConfirmVoiceExpense={handleConfirmVoiceExpense}
      />
    </div>
  );
};

export default Index;
