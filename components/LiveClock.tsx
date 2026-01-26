import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getVNNow, VN_TIMEZONE } from '../utils/helpers';
import { format as formatTz } from 'date-fns-tz';
import { vi } from 'date-fns/locale';

export const LiveClock: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(getVNNow());

  useEffect(() => {
    // Update every second
    const timer = setInterval(() => {
      setCurrentTime(getVNNow());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date): string => {
    const day = formatTz(date, 'EEEE, dd MMMM yyyy', { 
      timeZone: VN_TIMEZONE,
      locale: vi
    });
    const time = formatTz(date, 'HH:mm:ss', { 
      timeZone: VN_TIMEZONE
    });
    return `${day} - ${time}`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
      <Clock size={16} className="text-blue-600" />
      <div className="text-sm font-medium text-slate-700">
        <div className="font-semibold text-slate-900">{formatDateTime(currentTime)}</div>
      </div>
    </div>
  );
};
