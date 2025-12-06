import { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export const SwipeableItem = ({ children, onDelete }: SwipeableItemProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    
    if (diff > 0) {
      setTranslateX(Math.min(diff, 80));
    } else {
      setTranslateX(0);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateX > 60) {
      setTranslateX(80);
    } else {
      setTranslateX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    currentX.current = e.clientX;
    const diff = startX.current - currentX.current;
    
    if (diff > 0) {
      setTranslateX(Math.min(diff, 80));
    } else {
      setTranslateX(0);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (translateX > 60) {
      setTranslateX(80);
    } else {
      setTranslateX(0);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setTranslateX(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete button background */}
      <div 
        className="absolute inset-y-0 right-0 w-20 bg-destructive flex items-center justify-center cursor-pointer"
        onClick={onDelete}
      >
        <Trash2 className="w-5 h-5 text-white" />
      </div>
      
      {/* Swipeable content */}
      <div
        className="relative bg-card transition-transform duration-200 ease-out"
        style={{ transform: `translateX(-${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </div>
  );
};
