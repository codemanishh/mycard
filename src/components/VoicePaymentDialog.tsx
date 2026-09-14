import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { CreditCard as CreditCardType } from '@/types/creditCard';
import { BankAccount } from '@/types/expense';
import { Mic, MicOff, Sparkles, Check, CreditCard, Building2, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CreditCardType[];
  bankAccounts: BankAccount[];
  onConfirmVoiceExpense: (expense: {
    sourceType: 'credit_card' | 'bank';
    sourceId: string;
    sourceName: string;
    amount: number;
    category: string;
    note: string;
  }) => Promise<void>;
}

export const VoicePaymentDialog = ({
  open,
  onOpenChange,
  cards,
  bankAccounts,
  onConfirmVoiceExpense,
}: VoicePaymentDialogProps) => {
  const { transcript, isListening, startListening, stopListening, clearTranscript, setTranscript } = useVoiceInput();
  const { toast } = useToast();

  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedSourceType, setSelectedSourceType] = useState<'credit_card' | 'bank'>('credit_card');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Food');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Natural Language Parser
  const parseVoiceText = (text: string) => {
    if (!text.trim()) return;
    const lowerText = text.toLowerCase().trim();

    // 1. Extract Amount (looks for numbers)
    const amountMatch = lowerText.match(/(?:rs\.?|rupees|₹)?\s*(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees|₹)?/i);
    if (amountMatch && amountMatch[1]) {
      setAmount(amountMatch[1]);
    }

    // 2. Match Source (Credit Card vs Bank Account)
    let bestCardMatch: CreditCardType | null = null;
    let maxCardScore = 0;

    cards.forEach((card) => {
      let score = 0;
      const cardNameLower = card.cardName.toLowerCase();
      const bankNameLower = card.bankName.toLowerCase();

      // Check card name keywords
      cardNameLower.split(/\s+/).forEach((word) => {
        if (word.length > 2 && lowerText.includes(word)) score += 3;
      });
      // Check bank name keywords
      bankNameLower.split(/\s+/).forEach((word) => {
        if (word.length > 2 && lowerText.includes(word)) score += 2;
      });

      if (score > maxCardScore) {
        maxCardScore = score;
        bestCardMatch = card;
      }
    });

    let bestBankMatch: BankAccount | null = null;
    let maxBankScore = 0;

    bankAccounts.forEach((bank) => {
      let score = 0;
      const bankNameLower = bank.bankName.toLowerCase();
      bankNameLower.split(/\s+/).forEach((word) => {
        if (word.length > 2 && lowerText.includes(word)) score += 2;
      });
      if (score > maxBankScore) {
        maxBankScore = score;
        bestBankMatch = bank;
      }
    });

    if (maxCardScore >= maxBankScore && bestCardMatch) {
      const matched = bestCardMatch as CreditCardType;
      setSelectedSourceType('credit_card');
      setSelectedSourceId(matched.id);
    } else if (bestBankMatch) {
      const matched = bestBankMatch as BankAccount;
      setSelectedSourceType('bank');
      setSelectedSourceId(matched.id);
    }

    // 3. Match Category
    if (lowerText.includes('food') || lowerText.includes('dinner') || lowerText.includes('lunch') || lowerText.includes('breakfast') || lowerText.includes('swiggy') || lowerText.includes('zomato') || lowerText.includes('tea') || lowerText.includes('coffee') || lowerText.includes('restaurant')) {
      setCategory('Food');
    } else if (lowerText.includes('shopping') || lowerText.includes('clothes') || lowerText.includes('amazon') || lowerText.includes('flipkart') || lowerText.includes('mall')) {
      setCategory('Shopping');
    } else if (lowerText.includes('grocery') || lowerText.includes('groceries') || lowerText.includes('blinkit') || lowerText.includes('zepto') || lowerText.includes('supermarket')) {
      setCategory('Food');
    } else if (lowerText.includes('fuel') || lowerText.includes('petrol') || lowerText.includes('diesel') || lowerText.includes('cab') || lowerText.includes('uber') || lowerText.includes('ola') || lowerText.includes('travel')) {
      setCategory('Transport');
    } else if (lowerText.includes('movie') || lowerText.includes('game') || lowerText.includes('recharge') || lowerText.includes('bill')) {
      setCategory('Bills & Utilities');
    }

    setNote(text.trim());
  };

  // Re-parse whenever transcript updates
  useEffect(() => {
    if (transcript) {
      parseVoiceText(transcript);
    }
  }, [transcript]);

  // Set default source when dialog opens
  useEffect(() => {
    if (open) {
      if (cards.length > 0 && !selectedSourceId) {
        setSelectedSourceType('credit_card');
        setSelectedSourceId(cards[0].id);
      }
    }
  }, [open, cards]);

  const handleStartVoice = () => {
    clearTranscript();
    setAmount('');
    setNote('');
    startListening();
  };

  const handleConfirm = async () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ title: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    if (!selectedSourceId) {
      toast({ title: 'Please select a payment card or bank', variant: 'destructive' });
      return;
    }

    let sourceName = '';
    if (selectedSourceType === 'credit_card') {
      const card = cards.find(c => c.id === selectedSourceId);
      sourceName = card ? `${card.bankName} ${card.cardName}` : 'Credit Card';
    } else {
      const bank = bankAccounts.find(b => b.id === selectedSourceId);
      sourceName = bank ? `${bank.bankName} (${bank.type})` : 'Bank Account';
    }

    setIsSubmitting(true);
    try {
      await onConfirmVoiceExpense({
        sourceType: selectedSourceType,
        sourceId: selectedSourceId,
        sourceName,
        amount: numericAmount,
        category,
        note: note || transcript,
      });

      toast({
        title: '⚡ Bill Updated via Voice!',
        description: `Added ₹${numericAmount} to ${sourceName}`,
      });

      onOpenChange(false);
      clearTranscript();
    } catch (err: any) {
      toast({ title: 'Failed to add expense', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            Voice Payment Logger
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Say something like: <span className="font-semibold text-foreground">"Federal bank 10 rupees food"</span> to auto-update your bill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Voice Microphone Record Button */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5 border border-primary/20 relative overflow-hidden">
            <button
              type="button"
              onClick={isListening ? stopListening : handleStartVoice}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse ring-8 ring-red-500/30 scale-110'
                  : 'bg-primary text-white hover:scale-105 active:scale-95'
              }`}
            >
              {isListening ? <Mic className="w-8 h-8 animate-bounce" /> : <Mic className="w-8 h-8" />}
            </button>

            <p className="text-xs font-semibold mt-3 text-foreground">
              {isListening ? '🎙️ Listening... Speak now!' : 'Tap mic and speak'}
            </p>
            {transcript && (
              <p className="text-xs text-muted-foreground italic mt-1 text-center bg-background/80 px-3 py-1 rounded-full border border-border/40">
                "{transcript.trim()}"
              </p>
            )}
          </div>

          {/* Parsed Live Preview */}
          <div className="space-y-3 p-4 rounded-2xl bg-muted/40 border border-border/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Auto-Parsed Result
            </h4>

            {/* Payment Source Selection */}
            <div>
              <Label className="text-xs">Payment Card / Bank</Label>
              <Select
                value={`${selectedSourceType}:${selectedSourceId}`}
                onValueChange={(val) => {
                  const [type, id] = val.split(':');
                  setSelectedSourceType(type as any);
                  setSelectedSourceId(id);
                }}
              >
                <SelectTrigger className="mt-1 rounded-xl text-xs h-10">
                  <SelectValue placeholder="Select card or bank" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">Credit Cards</div>
                  {cards.map((c) => (
                    <SelectItem key={`credit_card:${c.id}`} value={`credit_card:${c.id}`}>
                      💳 {c.bankName} - {c.cardName} (Bill: ₹{c.currentBill})
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground border-t mt-1 pt-1">Bank Accounts</div>
                  {bankAccounts.map((b) => (
                    <SelectItem key={`bank:${b.id}`} value={`bank:${b.id}`}>
                      🏦 {b.bankName} ({b.type}) - Bal: ₹{b.balance}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount & Category Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 rounded-xl text-xs font-bold text-primary h-10"
                />
              </div>

              <div>
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1 rounded-xl text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Food">🍔 Food</SelectItem>
                    <SelectItem value="Shopping">🛍️ Shopping</SelectItem>
                    <SelectItem value="Transport">🚖 Transport</SelectItem>
                    <SelectItem value="Bills & Utilities">🧾 Bills</SelectItem>
                    <SelectItem value="Entertainment">🎬 Movies/Games</SelectItem>
                    <SelectItem value="Health">💊 Health</SelectItem>
                    <SelectItem value="Other">📦 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Speech Note */}
            <div>
              <Label className="text-xs">Speech / Note</Label>
              <Input
                placeholder="Parsed description..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 rounded-xl text-xs h-9"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl text-xs h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
            className="flex-1 rounded-xl text-xs h-11 bg-primary text-white shadow-md gap-1.5"
          >
            {isSubmitting ? 'Updating...' : 'Confirm & Add to Bill'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
