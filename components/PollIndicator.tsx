import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toVNTime, VN_TIMEZONE } from '../utils/helpers';
import { format as formatTz } from 'date-fns-tz';

interface PollIndicatorProps {
    isPolling: boolean;
    hasChanges: boolean;
    error: string | null;
    lastPoll: string | null;
}

export const PollIndicator: React.FC<PollIndicatorProps> = ({
    isPolling,
    hasChanges,
    error,
    lastPoll
}) => {
    const getStatusColor = () => {
        if (error) return 'text-red-500';
        if (hasChanges) return 'text-green-500';
        if (isPolling) return 'text-blue-500';
        return 'text-slate-400';
    };

    const getIcon = () => {
        if (error) return <WifiOff size={12} className="text-red-500" />;
        if (isPolling) return <RefreshCw size={12} className="animate-spin" />;
        return <Wifi size={12} />;
    };

    return (
        <div
            className={`flex items-center gap-1.5 text-[10px] font-medium ${getStatusColor()}`}
            title={lastPoll ? `Cập nhật lúc: ${formatTz(toVNTime(lastPoll), 'HH:mm:ss', { timeZone: VN_TIMEZONE })}` : 'Đang chờ...'}
        >
            {getIcon()}
            <span className="hidden sm:inline">
                {error ? 'Mất kết nối' : hasChanges ? 'Có cập nhật!' : isPolling ? 'Đang đồng bộ...' : 'Live'}
            </span>
        </div>
    );
};
