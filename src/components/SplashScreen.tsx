import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide splash screen after 0.4 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 400);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 animate-fade-in">
      {/* Logo */}
      <div className="mb-8 animate-bounce">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          className="w-32 h-32 drop-shadow-lg"
        >
          {/* Background */}
          <rect width="512" height="512" fill="#1e3a5f" rx="64" />

          {/* Shield with arrow and dollar */}
          <g transform="translate(128, 128)">
            {/* Shield */}
            <path
              d="M 128 20 L 40 80 L 40 200 Q 128 280 128 280 Q 128 280 216 200 L 216 80 Z"
              fill="#7ee787"
              stroke="#7ee787"
              strokeWidth="8"
            />

            {/* Arrow */}
            <path
              d="M 100 180 L 156 100 L 200 150"
              fill="none"
              stroke="#7ee787"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dollar circle */}
            <circle cx="120" cy="180" r="28" fill="#fbbf24" stroke="white" strokeWidth="4" />
            <text
              x="120"
              y="188"
              fontSize="32"
              fontWeight="bold"
              fill="#1e3a5f"
              textAnchor="middle"
            >
              $
            </text>

            {/* Magnifying glass */}
            <circle cx="160" cy="180" r="20" fill="none" stroke="white" strokeWidth="4" />
            <line
              x1="174"
              y1="194"
              x2="190"
              y2="210"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      {/* Branding text */}
      <h1 className="text-4xl font-bold text-white text-center mb-2 tracking-tight">
        FinanceTrackerBy
      </h1>
      <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-green-400 bg-clip-text text-transparent">
        Codemanishh
      </h2>
    </div>
  );
};

export default SplashScreen;
