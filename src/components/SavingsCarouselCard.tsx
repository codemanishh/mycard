import React, { useState, useEffect } from 'react';
import { PiggyBank, Wallet, TrendingUp, CandlestickChart, Plus, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { SavingsItem, calculateSavingsStats } from '@/types/savings';

interface SavingsCarouselCardProps {
  savings: SavingsItem[];
  onAddSavings: () => void;
  onManageSavings: () => void;
  className?: string;
}

export const SavingsCarouselCard: React.FC<SavingsCarouselCardProps> = ({
  savings,
  onAddSavings,
  onManageSavings,
  className,
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const stats = calculateSavingsStats(savings);

  const slides = [
    {
      id: 'total',
      label: 'Savings • Total',
      currentVal: stats.totalCurrentValue,
      realVal: stats.totalRealValue,
      gain: stats.totalGain,
      gainPercent: stats.totalGainPercent,
      color: 'text-emerald-200',
      badgeBg: 'from-emerald-500 to-teal-600',
      icon: PiggyBank,
      hasRealVsCurrent: savings.some(s => s.type !== 'cash'),
      count: savings.length,
    },
    {
      id: 'cash',
      label: 'Savings • Cash',
      currentVal: stats.cashTotal,
      realVal: stats.cashTotal,
      gain: 0,
      gainPercent: 0,
      color: 'text-green-200',
      badgeBg: 'from-green-500 to-emerald-600',
      icon: Wallet,
      hasRealVsCurrent: false,
      count: stats.cashCount,
    },
    {
      id: 'sip',
      label: 'Savings • SIP',
      currentVal: stats.sipCurrentValue,
      realVal: stats.sipRealValue,
      gain: stats.sipGain,
      gainPercent: stats.sipGainPercent,
      color: 'text-cyan-200',
      badgeBg: 'from-cyan-500 to-blue-600',
      icon: TrendingUp,
      hasRealVsCurrent: true,
      count: stats.sipCount,
    },
    {
      id: 'stock',
      label: 'Savings • Stock',
      currentVal: stats.stockCurrentValue,
      realVal: stats.stockRealValue,
      gain: stats.stockGain,
      gainPercent: stats.stockGainPercent,
      color: 'text-indigo-200',
      badgeBg: 'from-indigo-500 to-purple-600',
      icon: CandlestickChart,
      hasRealVsCurrent: true,
      count: stats.stockCount,
    },
  ];

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (api) {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }
  };

  return (
    <div
      className={cn(
        "bg-white/10 backdrop-blur-md rounded-lg md:rounded-xl p-2 md:p-3 border border-emerald-400/30 flex items-center hover:bg-white/15 transition-all text-left relative overflow-hidden select-none active:scale-95 group",
        className
      )}
    >
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent className="-ml-0">
          {slides.map((slide, index) => {
            const IconComp = slide.icon;
            const isPositive = slide.gain >= 0;
            return (
              <CarouselItem key={slide.id} className="pl-0">
                <div 
                  className="flex items-center gap-2 md:gap-3 w-full cursor-pointer pr-5"
                  onClick={onManageSavings}
                  title="Click to manage savings or cycle slides"
                >
                  {/* Left Circle Icon matching BankLogo size (w-8 h-8) */}
                  <div className={cn(
                    "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white shrink-0 border border-white/20 shadow-xs",
                    slide.badgeBg
                  )}>
                    <IconComp className="w-4 h-4 text-white" />
                  </div>

                  {/* Right Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn("text-[10px] md:text-xs font-semibold truncate leading-none", slide.color)}>
                        {slide.label}
                      </p>
                      <div className="flex items-center gap-0.5 shrink-0" onClick={handleNextSlide}>
                        <span className="text-[8px] font-mono text-white/50">
                          {index + 1}/4
                        </span>
                        <ChevronRight className="w-3 h-3 text-white/40" />
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-1 mt-1">
                      <div className="min-w-0 truncate">
                        <p className="text-xs md:text-sm font-bold font-mono text-white truncate leading-none">
                          ₹{slide.currentVal.toLocaleString('en-IN')}
                        </p>
                        {slide.hasRealVsCurrent && (
                          <div className="flex items-center gap-1 mt-0.5 text-[9px] md:text-[10px] text-white/70">
                            <span className="truncate">Real: ₹{slide.realVal.toLocaleString('en-IN')}</span>
                            {slide.realVal > 0 && (
                              <span className={cn(
                                "font-semibold font-mono text-[8px] px-1 rounded",
                                isPositive ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                              )}>
                                {isPositive ? '+' : ''}{slide.gainPercent.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Top-Right Quick Add (+) Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddSavings();
        }}
        title="Add Savings"
        className="absolute top-2 right-2 p-1 rounded-md bg-emerald-500/30 hover:bg-emerald-500/80 text-emerald-100 hover:text-white border border-emerald-400/40 transition-all shadow-xs active:scale-90"
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Swipe Dots Indicator at bottom center */}
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
        {slides.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              current === idx ? "w-2.5 bg-emerald-400" : "w-1 bg-white/20"
            )}
          />
        ))}
      </div>
    </div>
  );
};
