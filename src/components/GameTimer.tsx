import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface GameTimerProps {
  duration: number;
  onTimeout: () => void;
  isActive: boolean;
}

export default function GameTimer({ duration, onTimeout, isActive }: GameTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(duration);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, duration, onTimeout]);

  const progress = (timeLeft / duration) * 100;
  const isLowTime = timeLeft <= 5;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Время на ответ:</span>
        <span className={`text-2xl font-bold ${isLowTime ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {timeLeft}с
        </span>
      </div>
      <Progress 
        value={progress} 
        className={`h-2 ${isLowTime ? 'animate-pulse' : ''}`}
      />
    </div>
  );
}
