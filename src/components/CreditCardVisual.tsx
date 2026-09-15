import { useState } from 'react';
import { CreditCard as CreditCardType, getCardBillStatus, getCardLimitAndUtilization } from '@/types/creditCard';
import { Expense } from '@/types/expense';
import { BankLogo, getBankColor } from '@/components/BankLogo';
import { Badge } from '@/components/ui/badge';
import { Wifi, AlertTriangle, CheckCircle2, Eye, EyeOff, Copy, Check, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreditCardVisualProps {
  card: CreditCardType;
  allCards?: CreditCardType[];
  onClick?: () => void;
  showDetails?: boolean;
  className?: string;
  expenses?: Expense[];
}

// Map bank names to luxury background gradients
const getBankGradient = (bankName: string, color: string): string => {
  const norm = (bankName || '').toLowerCase();
  
  if (norm.includes('hdfc')) {
    return 'from-[#002855] via-[#004C8F] to-[#001433] text-white border-blue-400/30';
  }
  if (norm.includes('icici')) {
    return 'from-[#800C12] via-[#B02A30] to-[#E65100] text-white border-orange-400/30';
  }
  if (norm.includes('axis')) {
    return 'from-[#500028] via-[#97144D] to-[#300018] text-white border-pink-400/30';
  }
  if (norm.includes('sbi')) {
    return 'from-[#102A6B] via-[#21409A] to-[#0B1B47] text-white border-indigo-400/30';
  }
  if (norm.includes('kotak')) {
    return 'from-[#8B0000] via-[#ED1C24] to-[#4A0000] text-white border-red-400/30';
  }
  if (norm.includes('onecard') || norm.includes('one card')) {
    return 'from-[#111111] via-[#1A1A1A] to-[#050505] text-white border-amber-500/40 shadow-amber-500/10';
  }
  if (norm.includes('amex') || norm.includes('american express')) {
    return 'from-[#1E3A8A] via-[#3B82F6] to-[#1E293B] text-white border-blue-300/40';
  }
  if (norm.includes('indusind')) {
    return 'from-[#4A0E17] via-[#98272A] to-[#2B080D] text-white border-rose-400/30';
  }
  if (norm.includes('idfc')) {
    return 'from-[#58111A] via-[#9C1D26] to-[#2D090E] text-white border-red-400/30';
  }
  if (norm.includes('rbl')) {
    return 'from-[#102A6B] via-[#21409A] to-[#0B1B47] text-white border-indigo-400/30';
  }
  if (norm.includes('bob') || norm.includes('baroda')) {
    return 'from-[#8C2B0E] via-[#F15A29] to-[#4D1707] text-white border-orange-400/30';
  }

  // Default fallback gradient using bank color
  return 'from-slate-900 via-indigo-950 to-slate-950 text-white border-indigo-500/30';
};

export const CreditCardVisual = ({ card, allCards = [], onClick, showDetails = true, className, expenses }: CreditCardVisualProps) => {
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const status = getCardBillStatus(card, expenses);
  const limitInfo = getCardLimitAndUtilization(card, allCards, expenses);
  const bankColor = getBankColor(card.bankName);
  const gradientClass = getBankGradient(card.bankName, bankColor);

  const availableCredit = limitInfo.availableLimit;
  const utilizationPercent = limitInfo.utilizationPercent;

  // Format real or dummy card number
  const fullCardNumber = card.cardNumber?.trim() || `4532 8912 3409 ${((card.id.charCodeAt(0) || 4) * 1111).toString().slice(-4)}`;
  const maskedCardNumber = showFullNumber 
    ? fullCardNumber 
    : `•••• •••• •••• ${fullCardNumber.slice(-4)}`;

  const handleCopyNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanNum = fullCardNumber.replace(/\s+/g, '');
    navigator.clipboard.writeText(cleanNum);
    setCopied(true);
    toast({ title: 'Card Number Copied!', description: cleanNum });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative rounded-3xl p-5 md:p-6 transition-all duration-300 select-none overflow-hidden border shadow-2xl cursor-pointer group",
        "bg-gradient-to-br backdrop-blur-xl",
        gradientClass,
        card.status === 'blocked' && "opacity-60 saturate-50",
        className
      )}
    >
      {/* Decorative Metallic Sheen Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
      <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-black/20 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header: Logo & Status Badge */}
      <div className="flex items-center justify-between relative z-10 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg border border-white/20">
            <BankLogo bankName={card.bankName} size="md" />
          </div>
          <div>
            <h4 className="font-bold text-base md:text-lg text-white leading-tight drop-shadow-sm truncate max-w-[170px] md:max-w-[210px]">
              {card.cardName.replace(/^R_/, '').replace(/_/g, ' ')}
            </h4>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-white/80 font-medium">{card.bankName}</p>
              {limitInfo.isShared && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/20 text-white flex items-center gap-0.5">
                  <Share2 className="w-2.5 h-2.5" /> Shared
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Billing Status Badge */}
          <Badge 
            variant={status.isOverdue && status.overdueAmount > 0 ? 'destructive' : 'secondary'}
            className={cn(
              "text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-md",
              status.isOverdue && status.overdueAmount > 0 
                ? "bg-red-500 text-white animate-pulse" 
                : status.daysLeft === 0 
                  ? "bg-amber-500 text-white" 
                  : "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
            )}
          >
            {status.statusLabel}
          </Badge>

          {/* Blocked / Active status badge */}
          {card.status === 'blocked' && (
            <Badge variant="destructive" className="text-[10px] uppercase font-bold">
              Blocked
            </Badge>
          )}
        </div>
      </div>

      {/* Card Middle: EMV Chip & Contactless Symbol */}
      <div className="flex items-center justify-between relative z-10 mb-3 md:mb-4">
        {/* Realistic EMV Metallic Gold Chip */}
        <div className="w-11 h-8 md:w-12 md:h-9 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 border border-amber-300/60 shadow-inner flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-[2px] border border-amber-900/30 rounded-[3px] grid grid-cols-2 gap-1 p-0.5 opacity-60">
            <div className="border-r border-b border-amber-900/30" />
            <div className="border-b border-amber-900/30" />
            <div className="border-r border-amber-900/30" />
            <div />
          </div>
        </div>

        {/* Contactless Wifi Icon */}
        <div className="flex items-center gap-2 text-white/70">
          <Wifi className="w-5 h-5 md:w-6 md:h-6 rotate-90" />
        </div>
      </div>

      {/* Card Number Mask, Expiry & Copy Action */}
      <div className="flex items-center justify-between relative z-10 mb-4">
        <div>
          <p className="font-mono text-base md:text-lg font-bold tracking-widest text-white/95 drop-shadow-sm">
            {maskedCardNumber}
          </p>
          {card.expiryDate && (
            <p className="text-[10px] text-white/70 font-mono mt-0.5">EXP: {card.expiryDate}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyNumber}
            className="p-1.5 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/15"
            title="Copy Card Number"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowFullNumber(!showFullNumber);
            }}
            className="p-1.5 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/15"
            title={showFullNumber ? "Hide Card Number" : "Show Card Number"}
          >
            {showFullNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Card Footer Details */}
      {showDetails && (
        <div className="pt-3 border-t border-white/15 relative z-10 space-y-2">
          {/* Bill & Limit Info */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] md:text-xs uppercase tracking-wider font-semibold text-white/70">
                {status.isOverdue && status.overdueAmount > 0 && status.currentAmount > 0 
                  ? "Total Due (Overdue + Curr)" 
                  : status.isOverdue && status.overdueAmount > 0 
                    ? "Overdue Bill" 
                    : "Current Bill"}
              </p>
              <p className={cn(
                "text-lg md:text-xl font-extrabold font-mono leading-tight",
                status.isOverdue && status.overdueAmount > 0 ? "text-red-300 font-bold" : status.currentAmount > 0 ? "text-amber-300" : "text-emerald-300"
              )}>
                ₹{status.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] md:text-xs uppercase tracking-wider font-semibold text-white/70">
                {limitInfo.isShared ? "Limit (Shared)" : "Limit"}
              </p>
              <p className="text-xs md:text-sm font-bold font-mono text-white/90">
                ₹{limitInfo.limit.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Limit Utilization Progress Bar */}
          {limitInfo.limit > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] font-semibold text-white/70">
                <span>Available: ₹{availableCredit.toLocaleString('en-IN')}</span>
                <span>{utilizationPercent}% Used</span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    utilizationPercent > 80 ? "bg-red-400" : utilizationPercent > 50 ? "bg-amber-300" : "bg-emerald-300"
                  )}
                  style={{ width: `${utilizationPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
