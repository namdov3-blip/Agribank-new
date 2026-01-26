import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/helpers';
import { CheckCircle, AlertCircle, Loader2, XCircle, User, FileText, DollarSign, Building2 } from 'lucide-react';

import { Transaction, User as UserType } from '../types';
import { api } from '../services/api';

interface ConfirmPageProps {
    transactionId: string;
    currentUser: UserType | null;
}

interface TransactionInfo {
    transactionId: string;
    household: string;
    cccd: string;
    projectCode: string;
    projectName: string;
    status: string;
    principal: number;
    interest: number;
    supplementary: number;
    totalAmount: number;
    canConfirm: boolean;
}

// Helper function to decode JWT expiration
function decodeJwtExpMs(token: string): number | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson) as { exp?: number };
        if (!payload?.exp) return null;
        return payload.exp * 1000;
    } catch {
        return null;
    }
}

// Helper function to check if token is valid (not expired)
function isTokenValid(token: string): boolean {
    const expMs = decodeJwtExpMs(token);
    if (!expMs) return false;
    
    const now = Date.now();
    // Token is valid if expiration is in the future
    return expMs > now;
}

export const ConfirmPage: React.FC<ConfirmPageProps> = ({ transactionId, currentUser }) => {
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [txInfo, setTxInfo] = useState<TransactionInfo | null>(null);
    const [confirmedBy, setConfirmedBy] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(true);
    const [localUser, setLocalUser] = useState<UserType | null>(currentUser);

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            // TEMPORARY: Skip authentication for QR scanning
            // Allow access without login when scanning QR code
            setIsAuthenticating(false);
            return;

            // If currentUser is already provided from App.tsx, use it
            if (currentUser) {
                setLocalUser(currentUser);
                setIsAuthenticating(false);
                return;
            }

            const token = localStorage.getItem('auth_token');
            
            // Helper function to redirect to login with return URL
            const redirectToLogin = () => {
                // Get current URL (preserve both hash and pathname)
                const currentUrl = window.location.href;
                const returnUrl = encodeURIComponent(currentUrl);
                // Use hash-based routing to match App.tsx routing
                window.location.hash = `#/login?return=${returnUrl}`;
            };
            
            // No token - redirect to login
            if (!token) {
                redirectToLogin();
                return;
            }

            // Check if token is valid (not expired)
            if (!isTokenValid(token)) {
                // Token expired or invalid - redirect to login
                localStorage.removeItem('auth_token');
                redirectToLogin();
                return;
            }

            // Verify token with backend
            try {
                const res = await api.auth.me();
                if (res.data && res.data.id) {
                    setLocalUser(res.data);
                    setIsAuthenticating(false);
                } else {
                    // Invalid token - redirect to login
                    localStorage.removeItem('auth_token');
                    redirectToLogin();
                }
            } catch (err) {
                // Token expired or invalid - redirect to login
                localStorage.removeItem('auth_token');
                redirectToLogin();
            }
        };

        checkAuth();
    }, [currentUser]);

    useEffect(() => {
        // Set default value to current user's name if available
        if (localUser?.name) {
            setConfirmedBy(localUser.name);
        }
    }, [localUser]);

    useEffect(() => {
        // Fetch transaction info from API
        const fetchInfo = async () => {
            try {
                setLoading(true);
                setError(null);

                // Use standardized API service
                const response = await api.transactions.getConfirmInfo(transactionId);
                setTxInfo(response.data);
            } catch (err: any) {
                setError(err.message || 'Đã xảy ra lỗi');
            } finally {
                setLoading(false);
            }
        };

        if (transactionId && !isAuthenticating) {
            fetchInfo();
        }
    }, [transactionId, isAuthenticating]);

    const handleConfirm = async () => {
        const nameToUse = confirmedBy.trim();
        if (!nameToUse) {
            setError('Vui lòng nhập tên người xác nhận');
            return;
        }

        try {
            setConfirming(true);
            setError(null);

            // Use standardized API service
            await api.transactions.confirm(transactionId, nameToUse);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi');
        } finally {
            setConfirming(false);
        }
    };

    // Show loading while authenticating
    if (isAuthenticating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Đang xác thực...</p>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && !txInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 to-red-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <XCircle size={64} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-red-700 mb-2">Không thể xác nhận</h1>
                    <p className="text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={48} className="text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-green-700 mb-2">Xác nhận thành công!</h1>
                    <p className="text-slate-600 mb-4">
                        Giao dịch cho hộ <span className="font-bold">{txInfo?.household}</span> đã được giải ngân.
                    </p>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-green-800 font-bold text-lg">{formatCurrency(txInfo?.totalAmount || 0)}</p>
                        <p className="text-green-600 text-sm">Đã xác nhận chi trả</p>
                    </div>
                </div>
            </div>
        );
    }

    // Already disbursed
    if (txInfo && !txInfo.canConfirm) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 to-amber-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <AlertCircle size={64} className="text-amber-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-amber-700 mb-2">Đã giải ngân trước đó</h1>
                    <p className="text-slate-600 mb-4">
                        Giao dịch cho hộ <span className="font-bold">{txInfo.household}</span> đã được giải ngân trước đó.
                    </p>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <p className="text-amber-800 font-medium">Dự án: {txInfo.projectName}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Confirm form
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white text-center">
                    <FileText size={40} className="mx-auto mb-2" />
                    <h1 className="text-xl font-bold">Xác nhận chi trả</h1>
                    <p className="text-blue-200 text-sm">Quét QR từ phiếu chi</p>
                    {localUser && (
                        <p className="text-blue-100 text-xs mt-2">
                            Người xác nhận: <span className="font-semibold">{localUser.name}</span>
                        </p>
                    )}
                </div>

                {/* Info Section */}
                <div className="p-6 space-y-4">

                    {/* Household */}
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <User size={20} className="text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-medium">Hộ dân</p>
                            <p className="font-bold text-slate-900">{txInfo?.household}</p>
                            {txInfo?.cccd && <p className="text-xs text-slate-500">CCCD: {txInfo.cccd}</p>}
                        </div>
                    </div>

                    {/* Project */}
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <Building2 size={20} className="text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-medium">Dự án</p>
                            <p className="font-bold text-slate-900">{txInfo?.projectName}</p>
                            <p className="text-xs text-slate-500">Mã: {txInfo?.projectCode}</p>
                        </div>
                    </div>

                    {/* Amount Breakdown */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign size={18} className="text-blue-600" />
                            <p className="text-sm font-bold text-blue-800 uppercase">Chi tiết số tiền</p>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Tiền gốc:</span>
                                <span className="font-bold">{formatCurrency(txInfo?.principal || 0)}</span>
                            </div>
                            {(txInfo?.interest || 0) > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Lãi phát sinh:</span>
                                    <span className="font-bold text-rose-600">+{formatCurrency(txInfo?.interest || 0)}</span>
                                </div>
                            )}
                            {(txInfo?.supplementary || 0) > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Tiền bổ sung:</span>
                                    <span className="font-bold text-emerald-600">+{formatCurrency(txInfo?.supplementary || 0)}</span>
                                </div>
                            )}
                            <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                                <span className="font-bold text-blue-800">TỔNG CHI TRẢ:</span>
                                <span className="font-bold text-blue-700 text-lg">{formatCurrency(txInfo?.totalAmount || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Confirmer Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Người xác nhận chi trả
                        </label>
                        <input
                            type="text"
                            value={confirmedBy}
                            onChange={(e) => setConfirmedBy(e.target.value)}
                            placeholder={localUser?.name || "Nhập tên người xác nhận..."}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    {/* Confirm Button */}
                    <button
                        onClick={handleConfirm}
                        disabled={confirming || !confirmedBy.trim()}
                        className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {confirming ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Đang xác nhận...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={20} />
                                Xác nhận giải ngân
                            </>
                        )}
                    </button>

                    <p className="text-xs text-center text-slate-400">
                        Nhấn xác nhận để hoàn tất chi trả cho hộ dân
                    </p>
                </div>
            </div>
        </div>
    );
};
