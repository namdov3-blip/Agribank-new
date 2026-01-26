// Hybrid data hook - Uses API when available, falls back to localStorage

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface UseDataOptions<T> {
    initialData: T;
    storageKey: string;
    fetchFn?: () => Promise<{ data: T }>;
    enabled?: boolean;
}

export function useData<T>({ initialData, storageKey, fetchFn, enabled = true }: UseDataOptions<T>) {
    const [data, setData] = useState<T>(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : initialData;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isApiMode, setIsApiMode] = useState(false);

    // Fetch from API
    const refresh = useCallback(async () => {
        if (!fetchFn || !enabled) return;

        setLoading(true);
        setError(null);

        try {
            const result = await fetchFn();
            setData(result.data);
            setIsApiMode(true);
            // Also save to localStorage as backup
            localStorage.setItem(storageKey, JSON.stringify(result.data));
        } catch (err: any) {
            console.log(`API unavailable for ${storageKey}, using localStorage`);
            setIsApiMode(false);
            // Keep using localStorage data
        } finally {
            setLoading(false);
        }
    }, [fetchFn, storageKey, enabled]);

    // Initial fetch
    useEffect(() => {
        if (fetchFn && enabled) {
            refresh();
        }
    }, [refresh]);

    // Save to localStorage whenever data changes (if not in API mode)
    useEffect(() => {
        if (!isApiMode) {
            localStorage.setItem(storageKey, JSON.stringify(data));
        }
    }, [data, storageKey, isApiMode]);

    return {
        data,
        setData,
        loading,
        error,
        refresh,
        isApiMode
    };
}

// Pre-configured hooks for each entity type
export const useProjects = () => useData({
    initialData: [],
    storageKey: 'namwspace_projects',
    fetchFn: () => api.projects.list()
});

export const useTransactions = () => useData({
    initialData: [],
    storageKey: 'namwspace_transactions',
    fetchFn: () => api.transactions.list()
});

export const useBankTransactions = () => useData({
    initialData: [],
    storageKey: 'namwspace_bank_transactions',
    fetchFn: () => api.bank.listTransactions()
});

export const useUsers = () => useData({
    initialData: [],
    storageKey: 'namwspace_users',
    fetchFn: () => api.users.list()
});

export const useAuditLogs = () => useData({
    initialData: [],
    storageKey: 'namwspace_audit_logs',
    fetchFn: () => api.audit.list()
});

export const useInterestRate = () => {
    const [rate, setRate] = useState(() =>
        Number(localStorage.getItem('namwspace_interest_rate') || '6.5')
    );

    useEffect(() => {
        // Try to fetch from API
        api.settings.getInterestRate()
            .then(res => setRate(res.data.interestRate))
            .catch(() => console.log('Using local interest rate'));
    }, []);

    useEffect(() => {
        localStorage.setItem('namwspace_interest_rate', rate.toString());
    }, [rate]);

    return { rate, setRate };
};
