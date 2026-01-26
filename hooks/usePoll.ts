import { useState, useEffect, useCallback, useRef } from 'react';

interface PollChanges {
    timestamp: string;
    transactions?: any[];
    bank?: any[];
    projects?: any[];
}

interface UsePollOptions {
    interval?: number; // ms
    types?: string;
    enabled?: boolean;
    onChanges?: (changes: PollChanges) => void;
}

export const usePoll = (options: UsePollOptions = {}) => {
    const {
        interval = 5000,
        types = 'transactions,bank,projects',
        enabled = true,
        onChanges
    } = options;

    const [lastPoll, setLastPoll] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use refs for values that shouldn't trigger effect re-runs
    const lastPollRef = useRef<string | null>(null);
    const isPollingRef = useRef(false);
    const onChangesRef = useRef(onChanges);

    // Update ref when onChanges changes
    useEffect(() => {
        onChangesRef.current = onChanges;
    }, [onChanges]);

    const poll = useCallback(async () => {
        if (isPollingRef.current) return;

        try {
            isPollingRef.current = true;
            setError(null);

            const since = lastPollRef.current || new Date(Date.now() - 60000).toISOString();
            const token = localStorage.getItem('auth_token');
            
            // Add timeout and better error handling for connection errors
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            let response: Response;
            try {
                response = await fetch(`/api/events/poll?since=${encodeURIComponent(since)}&types=${types}`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
            } catch (fetchErr: any) {
                clearTimeout(timeoutId);
                // Check if it's a connection error
                const isConnectionError = fetchErr.message?.includes('Failed to fetch') ||
                                         fetchErr.message?.includes('ERR_CONNECTION_REFUSED') ||
                                         fetchErr.name === 'TypeError' ||
                                         fetchErr.name === 'AbortError';
                
                if (isConnectionError) {
                    // Silently handle connection errors - backend might not be running
                    return; // Exit early without setting error
                }
                throw fetchErr; // Re-throw non-connection errors
            }

            if (!response.ok) {
                // If token expired/invalid, stop spam + force re-login
                if (response.status === 401) {
                    localStorage.removeItem('auth_token');
                    // App uses HashRouter
                    window.location.href = '/#/login';
                    throw new Error('Unauthorized - Invalid token');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Poll failed');
            }

            const data = await response.json();

            if (data.success) {
                const newTimestamp = data.data?.timestamp || new Date().toISOString();
                lastPollRef.current = newTimestamp;
                setLastPoll(newTimestamp);

                if (data.hasChanges) {
                    setHasChanges(true);
                    onChangesRef.current?.(data.data);

                    // Reset hasChanges after a short delay
                    setTimeout(() => setHasChanges(false), 1000);
                }
            }
        } catch (err: any) {
            // Only log non-connection errors to avoid console spam
            // Connection errors (ECONNREFUSED, Failed to fetch) are expected when backend is not running
            const isConnectionError = err.message?.includes('ECONNREFUSED') || 
                                     err.message?.includes('Failed to fetch') ||
                                     err.message?.includes('NetworkError') ||
                                     err.message?.includes('Request timeout') ||
                                     err.name === 'TypeError' && err.message?.includes('fetch');
            
            if (!isConnectionError) {
                setError(err.message);
                console.error('Polling error:', err);
            } else {
                // Silently handle connection errors - backend might not be running
                // Don't set error state or log to console to avoid spam
                setError(null);
            }
        } finally {
            isPollingRef.current = false;
        }
    }, [types]);

    useEffect(() => {
        if (!enabled) return;

        // Set up interval
        const intervalId = setInterval(poll, interval);

        return () => clearInterval(intervalId);
    }, [enabled, interval, poll]);

    return {
        lastPoll,
        hasChanges,
        isPolling: isPollingRef.current,
        error,
        poll // Manual trigger
    };
};

// Simple hook for dashboard auto-refresh
export const useDashboardPoll = (
    onRefresh: () => void,
    enabled: boolean = true
) => {
    return usePoll({
        interval: 5000,
        types: 'transactions,bank',
        enabled,
        onChanges: (changes) => {
            // If there are transaction or bank changes, trigger refresh
            if (changes.transactions?.length || changes.bank?.length) {
                console.log('📡 Changes detected, refreshing...');
                onRefresh();
            }
        }
    });
};
