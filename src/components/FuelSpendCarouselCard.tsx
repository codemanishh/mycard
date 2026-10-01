import React, { useState, useEffect } from 'react';
import { Fuel, Calendar, TrendingUp, Plus, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

export interface FuelSpendStats {
  monthSpend: number;
  yearSpend: number;
  ytdSpend: number;
  countThisMonth: number;
  countThisYear: number;
  totalCount: number;
}

interface FuelSpendCarouselCardProps {
  stats: FuelSpendStats;
  onAddFuelSpend?: () => void;
  className?: string;
}

export const FuelSpendCarouselCard: React.FC<FuelSpendCarouselCardProps> = ({
  stats,
  onAddFuelSpend,
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

  const currentYear = new Date().getFullYear();

  const slides = [
    {
      id: 'month',
      label: 'Fuel • Month',
      amount: stats.monthSpend,
      color: 'text-amber-200',
      badgeBg: 'from-amber-500 to-orange-600',
      icon: Fuel,
      sub: `${stats.countThisMonth} refills`,
    },
    {
      id: 'year',
      label: `Fuel • ${currentYear}`,
      amount: stats.yearSpend,
      color: 'text-orange-200',
      badgeBg: 'from-orange-500 to-amber-600',
      icon: Calendar,
      sub: `${stats.countThisYear} refills`,
    },
    {
      id: 'ytd',
      label: 'Fuel • YTD',
      amount: stats.ytdSpend,
      color: 'text-yellow-200',
      badgeBg: 'from-yellow-500 to-orange-600',
      icon: TrendingUp,
      sub: `${stats.totalCount} total`,
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
        "bg-white/10 backdrop-blur-md rounded-lg md:rounded-xl p-2 md:p-3 border border-amber-400/30 flex items-center hover:bg-white/15 transition-all text-left relative overflow-hidden select-none active:scale-95 group",
        className
      )}
    >
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent className="-ml-0">
          {slides.map((slide, index) => {
            const IconComp = slide.icon;
            return (
              <CarouselItem key={slide.id} className="pl-0">
                <div 
                  className="flex items-center gap-2 md:gap-3 w-full cursor-pointer"
                  onClick={handleNextSlide}
                  title="Swipe or click to cycle Fuel stats (This Month / Year / YTD)"
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
                      <div className="flex items-center gap-0.5 shrink-0">
                        <span className="text-[8px] font-mono text-white/50">
                          {index + 1}/3
                        </span>
                        <ChevronRight className="w-3 h-3 text-white/40" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-1">
                      <p className="text-xs md:text-sm font-bold font-mono text-white truncate leading-none">
                        ₹{slide.amount.toLocaleString('en-IN')}
                      </p>

                      {onAddFuelSpend && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddFuelSpend();
                          }}
                          className="p-0.5 rounded-md bg-amber-500/30 hover:bg-amber-500/60 text-amber-100 border border-amber-400/40 transition-all active:scale-90 shrink-0"
                          title="Add Petrol / Fuel Spend"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Swipe Dots Indicator at bottom center */}
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
        {slides.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              current === idx ? "w-2.5 bg-amber-400" : "w-1 bg-white/20"
            )}
          />
        ))}
      </div>
    </div>
  );
};
