import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getBankByName, getBankLogoUrl, getBankColorByName } from '@/lib/bankData';

interface BankLogoProps {
  bankName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const textSizeClasses = {
  sm: 'text-[8px]',
  md: 'text-[10px]',
  lg: 'text-xs',
};

export const BankLogo = ({ bankName, size = 'md', className }: BankLogoProps) => {
  const [imageError, setImageError] = useState(false);
  const bank = getBankByName(bankName);
  const hasLogo = bank?.slug && !imageError;
  
  // Get initials from bank name
  const getInitials = (name: string): string => {
    const words = name.split(' ').filter(w => !['Bank', 'Limited', 'Ltd', 'of', 'and', 'The'].includes(w));
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
  };

  const bgColor = bank?.color || '#6366f1';

  if (hasLogo) {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center overflow-hidden bg-white p-1 border border-border/30',
          sizeClasses[size],
          className
        )}
      >
        <img
          src={getBankLogoUrl(bank.slug)}
          alt={bankName}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white',
        sizeClasses[size],
        textSizeClasses[size],
        className
      )}
      style={{ backgroundColor: bgColor }}
    >
      {getInitials(bankName)}
    </div>
  );
};

export const getBankColor = (bankName: string): string => {
  return getBankColorByName(bankName);
};
