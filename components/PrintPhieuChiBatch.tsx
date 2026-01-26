import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Transaction, Project, User } from '../types';
import { formatCurrency, formatDateForPrint, formatCurrencyToWords, calculateInterest, formatDate } from '../utils/helpers';
import { Printer, Loader2, X } from 'lucide-react';
import { api } from '../services/api';

interface PrintPhieuChiBatchProps {
    transactions: Transaction[];
    projects: Project[];
    interestRate: number;
    currentUser: User;
    onClose: () => void;
}

export const PrintPhieuChiBatch: React.FC<PrintPhieuChiBatchProps> = ({
    transactions,
    projects,
    interestRate,
    currentUser,
    onClose
}) => {
    const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
    const [isGenerating, setIsGenerating] = useState(true);

    useEffect(() => {
        // Fetch QR codes for all transactions
        const fetchAllQRs = async () => {
            setIsGenerating(true);
            const qrMap: Record<string, string> = {};
            
            try {
                await Promise.all(
                    transactions.map(async (t) => {
                        if (!t.id) return;
                        try {
                            const res = await api.transactions.getQR(t.id);
                            qrMap[t.id] = res.qrDataUrl;
                        } catch (err) {
                            console.error(`QR fetch error for ${t.id}:`, err);
                        }
                    })
                );
                setQrDataUrls(qrMap);
            } catch (err) {
                console.error('Batch QR fetch error:', err);
            } finally {
                setIsGenerating(false);
            }
        };

        fetchAllQRs();
    }, [transactions]);

    const handlePrint = () => {
        window.print();
    };

    // Get organization info based on user
    const getOrgHeader = () => {
        const org = currentUser.organization || 'Đông Anh';
        const headers: Record<string, { name: string; address: string }> = {
            'Đông Anh': { name: 'UBND xã Đông Anh', address: 'Số 68 đường Cao Lỗ, xã Đông Anh, Hà Nội' },
            'Phúc Thịnh': { name: 'UBND xã Phúc Thịnh', address: 'Xã Phúc Thịnh, Hà Nội' },
            'Thiên Lộc': { name: 'UBND xã Thiên Lộc', address: 'Xã Thiên Lộc, Hà Nội' },
            'Thư Lâm': { name: 'UBND xã Thư Lâm', address: 'Xã Thư Lâm, Hà Nội' },
            'Vĩnh Thanh': { name: 'UBND xã Vĩnh Thanh', address: ' Xã Vĩnh Thanh, Hà Nội' }
        };
        return headers[org] || headers['Đông Anh'];
    };

    const orgInfo = getOrgHeader();

    const PhieuChiTemplate = ({ transaction, project }: { transaction: Transaction; project: Project | undefined }) => {
        const baseDate = transaction.effectiveInterestDate || project?.interestStartDate;
        const effectiveDisbursementDateISO =
            transaction.disbursementDate ||
            (baseDate ? new Date(baseDate).toISOString() : new Date().toISOString());
        const interestEndDate = effectiveDisbursementDateISO ? new Date(effectiveDisbursementDateISO) : new Date();
        const interest = calculateInterest(transaction.compensation.totalApproved, interestRate, baseDate, interestEndDate);
        const supplementary = transaction.supplementaryAmount || 0;
        const totalAmount = transaction.compensation.totalApproved + interest + supplementary;

        const approvedFormatted = formatCurrency(transaction.compensation.totalApproved);
        const interestFormatted = formatCurrency(interest);
        const supplementaryFormatted = formatCurrency(supplementary);
        const totalFormatted = formatCurrency(totalAmount);
        const amountWords = formatCurrencyToWords(totalAmount);
        const printDate = effectiveDisbursementDateISO || new Date().toISOString();
        const qrDataUrl = qrDataUrls[transaction.id] || '';

        return (
            <div className="print-phieu-chi p-8 bg-white" style={{ fontFamily: 'Times New Roman, serif' }}>
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="border-2 border-black p-3" style={{ maxWidth: '280px' }}>
                        <p className="font-bold text-sm underline">{orgInfo.name}</p>
                        <p className="font-bold text-sm">Ban quản lý Dự án đầu tư – hạ tầng</p>
                        <p className="text-sm underline">{orgInfo.address}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-sm">Mẫu số C41 - BB</p>
                    </div>
                </div>

                {/* Title */}
                <div className="flex mb-6">
                    <div className="flex-1 border-2 border-black p-4 text-center">
                        <h1 className="text-2xl font-bold mb-2">PHIẾU CHI</h1>
                        <p className="italic text-sm">{formatDateForPrint(printDate)}</p>
                        <p className="text-sm">Số: {transaction.stt ?? '……'}</p>
                    </div>
                    <div className="border-2 border-black border-l-0 p-4 min-w-[220px]">
                        <div className="space-y-1 mt-2">
                            <div className="flex justify-between text-xs">
                                <span>- Tiền phê duyệt:</span>
                                <span className="font-bold">{approvedFormatted}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>- Lãi:</span>
                                <span className="font-bold">{interestFormatted}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>- Tiền bổ sung:</span>
                                <span className="font-bold">{supplementaryFormatted}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-black pt-1 mt-1">
                                <span className="font-bold">TỔNG CỘNG:</span>
                                <span className="font-bold text-red-600">{totalFormatted}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recipient Info */}
                <div className="mb-4 space-y-2">
                    <p className="text-sm">
                        Họ và tên người nhận tiền: <span className="font-bold">{transaction.household.name}</span>
                        <span className="ml-4">
                            Ngày GN: <span className="font-bold">{formatDateForPrint(printDate)}</span>
                        </span>
                    </p>
                    <p className="text-sm">
                        Địa chỉ: <span className="border-b border-dotted border-black inline-block min-w-[400px]">
                            {transaction.household.address || ''}
                        </span>
                    </p>
                </div>

                {/* Content */}
                <div className="mb-4 space-y-2">
                    <p className="text-sm">
                        Nội dung: Chi trả tiền {transaction.paymentType || 'bồi thường, hỗ trợ GPMB'} theo quyết định số {transaction.household.decisionNumber} ngày {formatDate(transaction.household.decisionDate)}
                    </p>
                    <p className="text-sm">
                        thuộc dự án: {project?.name || 'N/A'} (Mã dự án: {project?.code || transaction.projectId})
                    </p>
                </div>

                {/* Amount */}
                <div className="mb-4 space-y-1">
                    <p className="text-sm">
                        Số tiền: <span className="font-bold">{totalFormatted}</span> đồng
                    </p>
                    <p className="text-sm italic">
                        (Viết bằng chữ): <span className="capitalize">{amountWords.toLowerCase()} ./.</span>
                    </p>
                    <p className="text-sm">Kèm theo: Chứng từ liên quan</p>
                </div>

                {/* Confirmation Section */}
                <div className="mb-6 border-t border-black pt-4">
                    <p className="font-bold mb-2">Đã nhận đủ số tiền</p>
                    <p className="text-sm mb-1">- Bằng số: <span className="font-bold">{totalFormatted}</span> đồng</p>
                    <p className="text-sm">- Bằng chữ: <span className="capitalize">{amountWords.toLowerCase()}</span></p>
                </div>

                {/* Signatures with QR */}
                <div className="flex border-t-2 border-black pt-4">
                    {/* Left signatures */}
                    <div className="flex-1 grid grid-cols-3 gap-8">
                        <div className="text-center">
                            <p className="font-bold text-sm">Người lập biểu</p>
                            <p className="text-xs italic">(Ký, họ tên)</p>
                            <div className="h-16"></div>
                            <p className="text-sm font-semibold">{currentUser.name}</p>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-sm">Thủ quỹ</p>
                            <p className="text-xs italic">(Ký, họ tên)</p>
                            <div className="h-16"></div>
                            <p className="text-sm font-semibold">Nguyễn Hương Ly</p>
                        </div>
                        <div className="text-center">
                            <p className="italic text-xs mb-1">{formatDateForPrint(printDate)}</p>
                            <p className="font-bold text-sm">Người nhận tiền</p>
                            <p className="text-xs italic">(Ký, họ tên)</p>
                            <div className="h-16"></div>
                        </div>
                    </div>

                    {/* QR Code - Right side */}
                    <div className="ml-4 flex flex-col items-center justify-center border-l border-slate-300 pl-4">
                        {qrDataUrl ? (
                            <img src={qrDataUrl} alt="QR Code" className="w-[150px] h-[150px]" />
                        ) : (
                            <div className="w-[150px] h-[150px] flex items-center justify-center bg-slate-100 text-xs text-slate-400">
                                Không tạo được QR
                            </div>
                        )}
                        <p className="text-[10px] text-center mt-1 text-slate-500">Quét để xác nhận</p>
                    </div>
                </div>
            </div>
        );
    };

    const printRoot = document.getElementById('print-root');

    return (
        <>
            {/* Modal Overlay (Preview) */}
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                        <h3 className="text-lg font-bold">Xem trước In hàng loạt ({transactions.length} phiếu)</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrint}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                                In tất cả ({transactions.length} phiếu)
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-slate-100 p-8">
                        <div className="space-y-8">
                            {transactions.map((t, idx) => {
                                const project = projects.find(p => p.id === t.projectId);
                                return (
                                    <div key={t.id} className="w-[210mm] min-h-[297mm] bg-white shadow-lg p-[15mm] transform origin-top scale-90">
                                        <PhieuChiTemplate transaction={t} project={project} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Content (Portal) */}
            {printRoot && createPortal(
                <>
                    <style>{`
                        @media print {
                            @page {
                                size: A4 portrait;
                                margin: 0;
                            }
                            
                            /* Hide everything in #root */
                            #root {
                                display: none !important;
                            }

                            /* Show print container */
                            html, body, #print-root {
                                display: block !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                background: white !important;
                                height: auto !important;
                                overflow: visible !important;
                            }

                            .print-phieu-chi {
                                display: block !important;
                                position: relative !important;
                                width: 210mm !important;
                                min-height: 297mm !important;
                                padding: 15mm !important;
                                margin: 0 !important;
                                background: white !important;
                                box-sizing: border-box !important;
                                font-size: 13pt !important;
                                page-break-after: always !important;
                            }

                            .print-phieu-chi:last-child {
                                page-break-after: auto !important;
                            }

                            .print-phieu-chi .flex { display: flex !important; }
                            .print-phieu-chi .justify-between { justify-content: space-between !important; }
                            .print-phieu-chi .items-start { align-items: flex-start !important; }
                            .print-phieu-chi .grid { display: grid !important; }
                            .print-phieu-chi .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
                            .print-phieu-chi .text-center { text-align: center !important; }
                            .print-phieu-chi .font-bold { font-weight: bold !important; }
                        }

                        @media screen {
                            .print-phieu-chi {
                                width: 100%;
                                background: white;
                            }
                        }
                    `}</style>
                    {transactions.map((t) => {
                        const project = projects.find(p => p.id === t.projectId);
                        return <PhieuChiTemplate key={t.id} transaction={t} project={project} />;
                    })}
                </>,
                printRoot
            )}
        </>
    );
};
