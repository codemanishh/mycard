import { cn } from '@/lib/utils';

interface BankLogoProps {
  bankName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BANK_STYLES: Record<string, { bg: string; text: string; initials: string }> = {
  'ICICI Bank': { bg: 'bg-[#B02A30]', text: 'text-white', initials: 'ICICI' },
  'HDFC Bank': { bg: 'bg-[#004C8F]', text: 'text-white', initials: 'HDFC' },
  'Axis Bank': { bg: 'bg-[#97144D]', text: 'text-white', initials: 'AXIS' },
  'BharatPe': { bg: 'bg-[#00A651]', text: 'text-white', initials: 'BP' },
  'SBI': { bg: 'bg-[#1A4C9E]', text: 'text-white', initials: 'SBI' },
  'Kotak': { bg: 'bg-[#ED1C24]', text: 'text-white', initials: 'KMB' },
  'Kotak Bank': { bg: 'bg-[#ED1C24]', text: 'text-white', initials: 'KMB' },
  'American Express': { bg: 'bg-[#006FCF]', text: 'text-white', initials: 'AMEX' },
  'Yes Bank': { bg: 'bg-[#00518F]', text: 'text-white', initials: 'YES' },
  'IndusInd Bank': { bg: 'bg-[#98272A]', text: 'text-white', initials: 'IIB' },
  'RBL Bank': { bg: 'bg-[#21409A]', text: 'text-white', initials: 'RBL' },
  'IDFC First Bank': { bg: 'bg-[#9C1D26]', text: 'text-white', initials: 'IDFC' },
  'Federal Bank': { bg: 'bg-[#F7941E]', text: 'text-white', initials: 'FED' },
  'AU Small Finance Bank': { bg: 'bg-[#EC1C24]', text: 'text-white', initials: 'AU' },
  'OneCard': { bg: 'bg-[#000000]', text: 'text-white', initials: '1' },
};

const sizeClasses = {
  sm: 'w-8 h-8 text-[8px]',
  md: 'w-12 h-12 text-[10px]',
  lg: 'w-16 h-16 text-xs',
};

export const BankLogo = ({ bankName, size = 'md', className }: BankLogoProps) => {
  const style = BANK_STYLES[bankName] || { bg: 'bg-primary', text: 'text-primary-foreground', initials: bankName.substring(0, 2).toUpperCase() };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold',
        style.bg,
        style.text,
        sizeClasses[size],
        className
      )}
    >
      {style.initials}
    </div>
  );
};

export const getBankColor = (bankName: string): string => {
  const colors: Record<string, string> = {
    'ICICI Bank': '#B02A30',
    'HDFC Bank': '#004C8F',
    'Axis Bank': '#97144D',
    'BharatPe': '#00A651',
    'SBI': '#1A4C9E',
    'Kotak': '#ED1C24',
    'Kotak Bank': '#ED1C24',
    'American Express': '#006FCF',
    'Yes Bank': '#00518F',
    'IndusInd Bank': '#98272A',
    'RBL Bank': '#21409A',
    'IDFC First Bank': '#9C1D26',
    'Federal Bank': '#F7941E',
    'AU Small Finance Bank': '#EC1C24',
    'OneCard': '#000000',
  };
  return colors[bankName] || '#6366f1';
};
