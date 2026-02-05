import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { getRemainingTime, formatTimeRemaining } from '../lib/timer-utils';

interface Props {
  endTime: Date | string | null;
  phase: string;
  onExpired?: () => void;
}

export default function CountdownTimer({ endTime, phase, onExpired }: Props) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (!endTime) return;

    const updateTimer = () => {
      const { total, isExpired: expired } = getRemainingTime(endTime);
      const formatted = formatTimeRemaining(endTime);
      
      setTimeRemaining(formatted);
      setIsExpired(expired);
      
      // Show warning when less than 5 minutes remaining
      setIsWarning(total > 0 && total <= 5 * 60 * 1000);
      
      if (expired && onExpired) {
        // Call auto-transition API when timer expires
        fetch('/api/epochs/auto-transition', { method: 'POST' })
          .then(() => onExpired())
          .catch((error) => {
            console.error('Auto-transition failed:', error);
            onExpired();
          });
      }
    };

    // Update immediately
    updateTimer();
    
    // Then update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [endTime, onExpired]);

  if (!endTime) return null;

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
      isExpired 
        ? 'bg-red-100 text-red-800 border border-red-200' 
        : isWarning 
        ? 'bg-orange-100 text-orange-800 border border-orange-200'
        : 'bg-blue-100 text-blue-800 border border-blue-200'
    }`}>
      {isExpired ? (
        <AlertCircle className="w-4 h-4" />
      ) : (
        <Clock className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">
        {isExpired 
          ? `${phase} phase ended` 
          : `${phase} phase: ${timeRemaining} remaining`
        }
      </span>
    </div>
  );
}