// Comprehensive Indian banks data with logos from GitHub CDN
// Logo source: https://github.com/praveenpuglia/indian-banks

export interface BankInfo {
  name: string;
  slug: string;
  category: 'public' | 'private' | 'small-finance' | 'payments' | 'foreign' | 'other';
  color: string;
}

const LOGO_BASE_URL = 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos';

export const getBankLogoUrl = (slug: string): string => {
  return `${LOGO_BASE_URL}/${slug}/symbol.svg`;
};

export const INDIAN_BANKS: BankInfo[] = [
  // Public Sector Banks
  { name: 'State Bank of India', slug: 'sbin', category: 'public', color: '#1A4C9E' },
  { name: 'Bank of Baroda', slug: 'barb', category: 'public', color: '#F15A29' },
  { name: 'Punjab National Bank', slug: 'punb', category: 'public', color: '#ED1C24' },
  { name: 'Canara Bank', slug: 'cnrb', category: 'public', color: '#FFCD00' },
  { name: 'Union Bank of India', slug: 'ubin', category: 'public', color: '#E31837' },
  { name: 'Bank of India', slug: 'bkid', category: 'public', color: '#F15A29' },
  { name: 'Indian Bank', slug: 'idib', category: 'public', color: '#0066B3' },
  { name: 'Central Bank Of India', slug: 'cbin', category: 'public', color: '#ED1C24' },
  { name: 'Indian Overseas Bank', slug: 'ioba', category: 'public', color: '#005BAC' },
  { name: 'UCO Bank', slug: 'ucba', category: 'public', color: '#7C2529' },
  { name: 'Bank of Maharashtra', slug: 'mahb', category: 'public', color: '#E42313' },
  { name: 'Punjab and Sind Bank', slug: 'psib', category: 'public', color: '#1A1A6C' },
  
  // Private Sector Banks
  { name: 'HDFC Bank', slug: 'hdfc', category: 'private', color: '#004C8F' },
  { name: 'ICICI Bank', slug: 'icic', category: 'private', color: '#B02A30' },
  { name: 'Axis Bank', slug: 'utib', category: 'private', color: '#97144D' },
  { name: 'Kotak Mahindra Bank', slug: 'kkbk', category: 'private', color: '#ED1C24' },
  { name: 'IndusInd Bank', slug: 'indb', category: 'private', color: '#98272A' },
  { name: 'Yes Bank', slug: 'yesb', category: 'private', color: '#00518F' },
  { name: 'IDBI Bank', slug: 'ibkl', category: 'private', color: '#007749' },
  { name: 'Federal Bank', slug: 'fdrl', category: 'private', color: '#F7941E' },
  { name: 'IDFC First Bank', slug: 'idfb', category: 'private', color: '#9C1D26' },
  { name: 'RBL Bank', slug: 'ratn', category: 'private', color: '#21409A' },
  { name: 'Bandhan Bank', slug: 'bdbl', category: 'private', color: '#F15A29' },
  { name: 'South Indian Bank', slug: 'sibl', category: 'private', color: '#1C4587' },
  { name: 'Karnataka Bank', slug: 'karb', category: 'private', color: '#E42313' },
  { name: 'Karur Vysya Bank', slug: 'kvbl', category: 'private', color: '#6B2C91' },
  { name: 'City Union Bank', slug: 'ciub', category: 'private', color: '#00529B' },
  { name: 'Tamilnad Mercantile Bank', slug: 'tmbl', category: 'private', color: '#1A5276' },
  { name: 'CSB Bank', slug: 'csbk', category: 'private', color: '#003366' },
  { name: 'DCB Bank', slug: 'dcbl', category: 'private', color: '#E21B22' },
  { name: 'Dhanalakshmi Bank', slug: 'dlxb', category: 'private', color: '#AA1F2E' },
  { name: 'Jammu and Kashmir Bank', slug: 'jaka', category: 'private', color: '#005BAC' },
  { name: 'The Nainital Bank', slug: 'ntbl', category: 'private', color: '#003366' },
  
  // Small Finance Banks
  { name: 'AU Small Finance Bank', slug: 'aubl', category: 'small-finance', color: '#EC1C24' },
  { name: 'Ujjivan Small Finance Bank', slug: 'ujvn', category: 'small-finance', color: '#E84E0F' },
  { name: 'Equitas Small Finance Bank', slug: '', category: 'small-finance', color: '#F7941E' },
  { name: 'Jana Small Finance Bank', slug: '', category: 'small-finance', color: '#E42313' },
  { name: 'ESAF Small Finance Bank', slug: '', category: 'small-finance', color: '#1A5276' },
  { name: 'Fincare Small Finance Bank', slug: '', category: 'small-finance', color: '#003366' },
  { name: 'Capital Small Finance Bank', slug: '', category: 'small-finance', color: '#6B2C91' },
  { name: 'Suryoday Small Finance Bank', slug: '', category: 'small-finance', color: '#F15A29' },
  { name: 'Unity Small Finance Bank', slug: '', category: 'small-finance', color: '#21409A' },
  { name: 'North East Small Finance Bank', slug: '', category: 'small-finance', color: '#005BAC' },
  { name: 'Shivalik Small Finance Bank', slug: '', category: 'small-finance', color: '#1A4C9E' },
  
  // Payments Banks
  { name: 'Paytm Payments Bank', slug: 'pytm', category: 'payments', color: '#002E6E' },
  { name: 'Airtel Payments Bank', slug: 'airp', category: 'payments', color: '#ED1C24' },
  { name: 'Jio Payments Bank', slug: 'jiop', category: 'payments', color: '#0A3A82' },
  { name: 'India Post Payments Bank', slug: '', category: 'payments', color: '#F7941E' },
  { name: 'Fino Payments Bank', slug: '', category: 'payments', color: '#003366' },
  { name: 'NSDL Payments Bank', slug: '', category: 'payments', color: '#0066B3' },
  
  // Foreign Banks
  { name: 'Standard Chartered Bank', slug: 'scbl', category: 'foreign', color: '#0E6747' },
  { name: 'Citibank', slug: '', category: 'foreign', color: '#003B70' },
  { name: 'HSBC', slug: '', category: 'foreign', color: '#DB0011' },
  { name: 'Deutsche Bank', slug: '', category: 'foreign', color: '#0018A8' },
  { name: 'Barclays Bank', slug: '', category: 'foreign', color: '#00AEEF' },
  { name: 'DBS Bank', slug: '', category: 'foreign', color: '#E31836' },
  { name: 'American Express', slug: '', category: 'foreign', color: '#006FCF' },
  
  // Other/Fintech
  { name: 'BharatPe', slug: '', category: 'other', color: '#00A651' },
  { name: 'OneCard', slug: '', category: 'other', color: '#000000' },
  { name: 'Fi Money', slug: '', category: 'other', color: '#7C3AED' },
  { name: 'Jupiter', slug: '', category: 'other', color: '#5A2DCE' },
  { name: 'Niyo', slug: '', category: 'other', color: '#1A73E8' },
  { name: 'Slice', slug: '', category: 'other', color: '#FFD700' },
  { name: 'CRED', slug: '', category: 'other', color: '#1A1A1A' },
];

// Get bank info by name (partial match)
export const getBankByName = (name: string): BankInfo | undefined => {
  const normalizedName = name.toLowerCase().trim();
  return INDIAN_BANKS.find(bank => 
    bank.name.toLowerCase().includes(normalizedName) || 
    normalizedName.includes(bank.name.toLowerCase()) ||
    bank.name.toLowerCase().replace(/\s+/g, '') === normalizedName.replace(/\s+/g, '')
  );
};

// Get all bank names for selection
export const getAllBankNames = (): string[] => {
  return INDIAN_BANKS.map(bank => bank.name);
};

// Get banks by category
export const getBanksByCategory = (category: BankInfo['category']): BankInfo[] => {
  return INDIAN_BANKS.filter(bank => bank.category === category);
};

// Get bank color by name
export const getBankColorByName = (name: string): string => {
  const bank = getBankByName(name);
  return bank?.color || '#6366f1';
};
