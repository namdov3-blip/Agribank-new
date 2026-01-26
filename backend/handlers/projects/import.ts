import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { Project, Transaction, AuditLog, BankTransaction, User } from '../../../lib/models';
import { authMiddleware } from '../../../lib/auth';
import * as XLSX from 'xlsx';

// Build fallback household ID when source data doesn't provide one
function sanitizeDecisionNumber(raw?: string): string {
    if (!raw) return '';
    let s = raw.toString().trim();

    // Decode common HTML entities for angle brackets
    s = s.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');

    // Remove HTML-like tags completely
    s = s.replace(/<[^>]*>/g, '');

    // Normalize accents then remove any form of "QĐ-UBND" / "QD-UBND" with optional separators
    const nfd = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip accents
    s = nfd;
    s = s.replace(/Q[DĐ][\s\-\/]*UBND/gi, '');

    // Replace slashes with hyphen for consistency
    s = s.replace(/\//g, '-');

    // Remove all alphabetic characters, keep digits and hyphens
    s = s.replace(/[A-Za-z]+/g, '');

    // Collapse multiple hyphens
    s = s.replace(/-+/g, '-');

    // Trim leading/trailing hyphens
    s = s.replace(/^-+|-+$/g, '');

    return s.trim();
}

function buildHouseholdId(params: { projectCode: string; decisionNumber?: string; decisionDate?: Date; stt?: string | number; fallbackIndex: number }) {
    const projectPart = (params.projectCode || 'DA').toString().trim();
    const qdPart = sanitizeDecisionNumber(params.decisionNumber || 'QD').replace(/\s+/g, '');
    const yearPart = params.decisionDate instanceof Date && !isNaN(params.decisionDate.getTime())
        ? params.decisionDate.getFullYear().toString()
        : '0000';
    const sttRaw = params.stt ?? params.fallbackIndex + 1;
    const sttPart = sttRaw?.toString().trim() || '1';
    // Format: <mã dự án>-<số QĐ>-<năm>-<STT>
    return `${projectPart}-${qdPart}-${yearPart}-${sttPart}`;
}

// Helper to format currency
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Parse Vietnamese currency/number strings
function parseVietnameseNumber(val: any): number {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let s = val.toString().trim();
    // Remove "₫", "VND" and spaces
    s = s.replace(/[₫VND\s]/gi, '');

    // Heuristic for VN/US formats: 
    // If it has both . and , (e.g. 1.234.567,89) -> remove dots, replace comma with dot.
    // If it has only dots and the last dot is 3 chars away -> 1.234.567 -> remove dots.
    // If it has only one dot/comma near the end -> 123.45 -> keep it.

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (hasComma && hasDot) {
        // Assume format like 1.234.567,89 or 1,234,567.89
        const lastDot = s.lastIndexOf('.');
        const lastComma = s.lastIndexOf(',');
        if (lastComma > lastDot) { // VN style: 1.234,56
            return parseFloat(s.replace(/\./g, '').replace(',', '.'));
        } else { // US style: 1,234.56
            return parseFloat(s.replace(/,/g, ''));
        }
    } else if (hasComma) {
        // Only commas. If it's like 1,000,000 -> remove. If 123,45 -> decimal.
        const parts = s.split(',');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
            return parseFloat(s.replace(/,/g, ''));
        }
        return parseFloat(s.replace(',', '.'));
    } else if (hasDot) {
        // Only dots. If it's like 1.000.000 -> remove. If 123.45 -> decimal.
        const parts = s.split('.');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
            return parseFloat(s.replace(/\./g, ''));
        }
        return parseFloat(s);
    }

    return parseFloat(s) || 0;
}

// Parse Excel date and return Date object (for database)
function parseExcelDateToDate(value: any): Date {
    if (!value) return new Date();

    if (typeof value === 'number') {
        // Excel serial date
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + value * 86400000);
    } else if (typeof value === 'string') {
        // Try DD/MM/YYYY format first
        const parts = value.split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(value);
    }

    return new Date();
}

// Format date as DD/MM/YYYY string (for display)
function formatDateDDMMYYYY(value: any): string {
    if (!value) return '';

    const date = parseExcelDateToDate(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = await authMiddleware(req, res);
        if (!payload) return;

        await connectDB();

        // Get user's organization
        const currentUser = await (User as any).findById(payload.userId);
        if (!currentUser || !currentUser.organization) {
            return res.status(400).json({ error: 'User must belong to an organization' });
        }

        const {
            fileData,
            projectCode,
            projectName,
            location,
            interestStartDate,
            transactions: directTransactions,
            previewOnly, // [NEW] Flag to just return parsed data
            importMode = 'create' // NEW: 'create' or 'merge'
        } = req.body;

        if (!fileData && (!directTransactions || directTransactions.length === 0)) {
            return res.status(400).json({ error: 'Vui lòng upload file Excel hoặc cung cấp dữ liệu' });
        }

        let transactionsData: any[] = [];
        let totalBudget = 0;

        if (directTransactions && directTransactions.length > 0) {
            // Case 1: Use direct JSON data (from simulation/preview)
            transactionsData = directTransactions.map((t: any) => ({
                ...t,
                date: new Date(t.date || t.decisionDate || (t.household?.decisionDate) || new Date())
            }));
            totalBudget = transactionsData.reduce((sum, t) => {
                const amount = t.amount || t.compensation?.totalApproved || 0;
                return sum + amount;
            }, 0);
        } else if (fileData) {
            // Case 2: Parse Excel file from base64
            const base64Data = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;
            const buffer = Buffer.from(base64Data, 'base64');
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            const normalize = (str: any) => {
                if (!str) return '';
                return str.toString().toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]/g, '');
            };

            const findInKeys = (keys: string[], patterns: string[]): string | undefined => {
                const normPatterns = patterns.map(p => normalize(p));
                const normKeys = keys.map(k => normalize(k));
                for (const p of normPatterns) {
                    const idx = normKeys.findIndex(nk => nk === p);
                    if (idx !== -1) return keys[idx];
                }
                for (const p of normPatterns) {
                    const idx = normKeys.findIndex(nk => nk && nk.includes(p));
                    if (idx !== -1) return keys[idx];
                }
                return undefined;
            };

            const namePatterns = ['ho va ten', 'ten chu ho', 'nguoi nhan', 'ten chu su dung dat'];
            const amountPatterns = ['tong tien chi tra', 'tong so tien chi tra', 'so tien duoc duyet', 'tong cong', 'so tien'];
            const cccdPatterns = ['cccd', 'cmnd', 'so the', 'dinh danh'];
            const maHoPatterns = ['ma ho', 'ma so', 'ma hs'];
            const qdPatterns = ['so qd', 'so quyet dinh', 'qd'];
            const datePatterns = ['ngay qd', 'ngay quyet dinh', 'ngay'];
            const pCodePatterns = ['ma du an', 'ma da'];
            const pNamePatterns = ['ten du an', 'du an'];
            const payTypePatterns = ['loai chi tra', 'hinh thuc', 'loai chi'];

            // Process sheets
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                if (rawData.length < 5) continue;

                // Rigid logic: skip first 4 rows (headers), start from index 4
                // Column mapping (0-indexed) from Bản 2:
                // Index 2: Họ và tên chủ sử dụng đất
                // Index 5: Số QĐ
                // Index 6: Ngày
                // Index 9: Loại Chi Trả
                // Index 10: Mã Hộ Dân
                // Index 23: Tổng số tiền bồi thường

                for (let i = 4; i < rawData.length; i++) {
                    const row = rawData[i];
                    if (!row || row.length < 3) continue;

                    const name = row[2]?.toString().trim();
                    if (!name || name === '') continue;

                    const amount = parseVietnameseNumber(row[23]);
                    if (amount <= 0) continue;

                    const rawQD = row[5]?.toString().trim() || '';
                    const normalizedQD = sanitizeDecisionNumber(rawQD);

                    transactionsData.push({
                        name,
                        cccd: '',
                        // Nếu thiếu mã hộ dân, để trống để auto-generate sau
                        maHo: row[10]?.toString().trim() || '',
                        qd: normalizedQD,
                        date: formatDateDDMMYYYY(row[6]), // For display in preview
                        dateObj: parseExcelDateToDate(row[6]), // For database storage
                        projectName: row[7]?.toString().trim() || '', // Column H - Tên dự án
                        projectCode: row[8]?.toString().trim() || '', // Column I - Mã dự án
                        paymentType: row[9]?.toString() || '',
                        amount,
                        stt: row[0]?.toString() || (i - 3).toString()
                    });
                    totalBudget += amount;
                }
                if (transactionsData.length > 0) break; // Found data
            }
        }

        if (transactionsData.length === 0) {
            return res.status(400).json({ error: 'Không tìm thấy dữ liệu hợp lệ trong file' });
        }

        // Get project code and name from first row of Excel data (if available)
        const firstRowProjectCode = transactionsData[0]?.projectCode;
        const firstRowProjectName = transactionsData[0]?.projectName;

        // Priority: Excel file data > Form input > Auto-generate
        const baseProjectCode = firstRowProjectCode || projectCode || `DA${Date.now()}`;
        const baseProjectName = firstRowProjectName || projectName || `Dự án ${baseProjectCode}`;

        const previewResult = {
            project: {
                code: baseProjectCode,
                name: baseProjectName,
                location: location || '',
                totalBudget,
                interestStartDate: interestStartDate ? new Date(interestStartDate) : new Date(),
                status: 'Active'
            },
            transactions: transactionsData.map((row, index) => {
                // If row already has household (it came from directTransactions JSON), preserve it
                if (row.household && row.compensation) {
                    return {
                        ...row,
                        id: row.id || `TEMP-${index}`,
                        status: row.status || 'Chưa giải ngân'
                    };
                }

                // Otherwise, map from flat row data (it came from Excel parsing)
                const generatedHouseholdId = buildHouseholdId({
                    projectCode: row.projectCode || baseProjectCode,
                    decisionNumber: row.qd,
                    decisionDate: row.dateObj,
                    stt: row.stt,
                    fallbackIndex: index
                });

                return {
                    id: `TEMP-${index}`,
                    household: {
                        id: row.maHo || generatedHouseholdId,
                        name: row.name,
                        cccd: row.cccd || '',
                        address: location || '',
                        landOrigin: '',
                        landArea: 0,
                        decisionNumber: row.qd || '',
                        decisionDate: row.dateObj || new Date() // Use Date object for database
                    },
                    compensation: {
                        landAmount: 0,
                        assetAmount: 0,
                        houseAmount: 0,
                        supportAmount: 0,
                        totalApproved: row.amount
                    },
                    paymentType: row.paymentType,
                    projectCode: row.projectCode,
                    projectName: row.projectName,
                    status: 'Chưa giải ngân',
                    stt: row.stt || (index + 1).toString()
                };
            })
        };

        if (previewOnly) {
            return res.status(200).json({ success: true, data: previewResult });
        }

        // --- DB OPERATIONS ---
        const createdProjects: any[] = [];
        const createdBankTxs: any[] = [];
        const duplicateTransactions: any[] = [];

        try {
            let project: any = null;
            let isNewProject = false;

            // Check if project code already exists
            const existingProject = await (Project as any).findOne({ 
                code: baseProjectCode, 
                organization: currentUser.organization 
            });

            if (importMode === 'create') {
                // MODE: CREATE NEW PROJECT
                if (existingProject) {
                    return res.status(409).json({
                        error: `Mã dự án "${baseProjectCode}" đã tồn tại. Vui lòng chọn chế độ "Merge" hoặc sử dụng mã khác.`
                    });
                }

                // Create new project
                project = await (Project as any).create({
                    code: baseProjectCode,
                    name: baseProjectName,
                    location: (location || '').trim(),
                    totalBudget: totalBudget,
                    interestStartDate: previewResult.project.interestStartDate,
                    uploadDate: new Date(),
                    startDate: new Date(),
                    status: 'Active',
                    organization: currentUser.organization,
                    uploadedBy: currentUser._id,
                    updatedAt: new Date()
                });
                createdProjects.push(project);
                isNewProject = true;

            } else {
                // MODE: MERGE INTO EXISTING PROJECT
                if (!existingProject) {
                    return res.status(404).json({
                        error: `Mã dự án "${baseProjectCode}" không tồn tại. Vui lòng chọn chế độ "Tạo mới" hoặc kiểm tra lại mã dự án.`
                    });
                }

                project = existingProject;
                
                // Update project metadata if provided
                if (baseProjectName && project.name !== baseProjectName) {
                    project.name = baseProjectName;
                }
                if (location && project.location !== location.trim()) {
                    project.location = location.trim();
                }
                if (previewResult.project.interestStartDate && !project.interestStartDate) {
                    project.interestStartDate = previewResult.project.interestStartDate;
                }
                await project.save();
            }

            // Check for duplicate transactions BEFORE inserting
            const existingTransactions = await (Transaction as any).find({ 
                projectId: project._id 
            });
            
            const transactionsToInsert: any[] = [];
            
            for (const t of previewResult.transactions) {
                const { id, projectCode, projectName, ...txData } = t;
                
                // Check duplicate: household.id + household.name + compensation.totalApproved
                const isDuplicate = existingTransactions.some((existing: any) => {
                    const sameHouseholdId = existing.household?.id === txData.household?.id;
                    const sameName = existing.household?.name?.trim().toLowerCase() === txData.household?.name?.trim().toLowerCase();
                    const sameAmount = existing.compensation?.totalApproved === txData.compensation?.totalApproved;
                    
                    return sameHouseholdId && sameName && sameAmount;
                });
                
                if (isDuplicate) {
                    duplicateTransactions.push({
                        name: txData.household?.name || 'N/A',
                        maHo: txData.household?.id || 'N/A',
                        amount: txData.compensation?.totalApproved || 0
                    });
                    continue; // Skip this transaction
                }
                
                // Also check within the new batch for duplicates
                const isDuplicateInBatch = transactionsToInsert.some((newTx: any) => {
                    const sameHouseholdId = newTx.household?.id === txData.household?.id;
                    const sameName = newTx.household?.name?.trim().toLowerCase() === txData.household?.name?.trim().toLowerCase();
                    const sameAmount = newTx.compensation?.totalApproved === txData.compensation?.totalApproved;
                    
                    return sameHouseholdId && sameName && sameAmount;
                });
                
                if (isDuplicateInBatch) {
                    duplicateTransactions.push({
                        name: txData.household?.name || 'N/A',
                        maHo: txData.household?.id || 'N/A',
                        amount: txData.compensation?.totalApproved || 0
                    });
                    continue; // Skip this transaction
                }
                
                // Determine effectiveInterestDate for merged transactions
                // When merging, set effectiveInterestDate to prevent interest calculation from old project date
                let effectiveInterestDateForMerge: Date | undefined = undefined;
                if (!isNewProject && importMode === 'merge') {
                    // When merging, use the interestStartDate from preview (user's input)
                    // This ensures new merged transactions don't inherit old project's interest start date
                    if (previewResult.project.interestStartDate) {
                        effectiveInterestDateForMerge = new Date(previewResult.project.interestStartDate);
                    } else {
                        // Fallback to current date if not provided
                        effectiveInterestDateForMerge = new Date();
                    }
                }
                
                transactionsToInsert.push({
                    ...txData,
                    projectId: project._id,
                    // Set effectiveInterestDate for merged transactions to prevent interest calculation from old project date
                    effectiveInterestDate: effectiveInterestDateForMerge || txData.effectiveInterestDate,
                    updatedAt: new Date(),
                    history: [{
                        timestamp: new Date(),
                        action: isNewProject ? 'Import từ Excel' : 'Merge từ Excel',
                        details: isNewProject 
                            ? 'Nhập hồ sơ từ file Excel' 
                            : `Merge thêm hồ sơ vào dự án đã tồn tại. Ngày tính lãi: ${effectiveInterestDateForMerge ? formatDateDDMMYYYY(effectiveInterestDateForMerge) : 'N/A'}`,
                        actor: payload.name
                    }]
                });
            }
            
            if (transactionsToInsert.length === 0) {
                return res.status(400).json({ 
                    error: 'Tất cả giao dịch đều bị trùng lặp',
                    duplicates: duplicateTransactions
                });
            }
            
            // Insert only non-duplicate transactions
            const transactions = await (Transaction as any).insertMany(transactionsToInsert);
            
            // IMPORTANT: Recalculate project totalBudget = sum of ALL transactions (including new ones)
            // This ensures progress percentage is recalculated correctly
            const allProjectTransactions = await (Transaction as any).find({ projectId: project._id });
            const newTotalBudget = allProjectTransactions.reduce((sum: number, t: any) => {
                return sum + (t.compensation?.totalApproved || 0);
            }, 0);
            
            project.totalBudget = newTotalBudget;
            project.updatedAt = new Date();
            await project.save();
            
            // Create bank transaction only for new transactions
            if (transactions.length > 0) {
                const lastBankTx = await (BankTransaction as any).findOne({ 
                    organization: currentUser.organization 
                }).sort({ _id: -1 });
                const currentBalance = lastBankTx?.runningBalance || 0;
                
                const newTransactionsTotal = transactions.reduce((sum: number, t: any) => {
                    return sum + (t.compensation?.totalApproved || 0);
                }, 0);
                
                const bankTx = await (BankTransaction as any).create({
                    type: 'Nạp tiền',
                    amount: newTransactionsTotal,
                    date: new Date(),
                    note: `${isNewProject ? 'Import' : 'Merge'} ${transactions.length} hồ sơ dự án ${baseProjectCode}`,
                    createdBy: payload.name,
                    runningBalance: currentBalance + newTransactionsTotal,
                    organization: currentUser.organization,
                    projectId: project._id,
                    updatedAt: new Date()
                });
                createdBankTxs.push(bankTx);
            }
            
            // Calculate new progress percentage for response
            const disbursedTransactions = allProjectTransactions.filter((t: any) => 
                t.status === 'Đã giải ngân'
            );
            const disbursedTotal = disbursedTransactions.reduce((sum: number, t: any) => {
                if ((t as any).disbursedTotal) {
                    return sum + (t as any).disbursedTotal;
                }
                return sum + (t.compensation?.totalApproved || 0);
            }, 0);
            
            // Calculate actual total (with interest + supplementary) - simplified for backend
            // Frontend will recalculate with proper interest rate
            const actualTotal = allProjectTransactions.reduce((sum: number, t: any) => {
                return sum + (t.compensation?.totalApproved || 0) + (t.supplementaryAmount || 0);
            }, 0);
            
            const newProgressPercent = actualTotal > 0 ? (disbursedTotal / actualTotal) * 100 : 0;
            
            await (AuditLog as any).create({
                actor: payload.name,
                role: payload.role,
                action: isNewProject ? 'Import Excel' : 'Merge Excel',
                target: `Dự án ${baseProjectCode}`,
                details: `${isNewProject ? 'Import' : 'Merge'} ${transactions.length} hồ sơ ${duplicateTransactions.length > 0 ? `(${duplicateTransactions.length} bị trùng đã bỏ qua)` : ''} vào dự án ${baseProjectName}. Tổng ngân sách: ${formatCurrency(newTotalBudget)}. Tiến độ mới: ${newProgressPercent.toFixed(1)}%`
            });
            
            return res.status(201).json({
                success: true,
                data: { 
                    transactionCount: transactions.length, 
                    totalBudget: newTotalBudget,
                    skippedCount: duplicateTransactions.length,
                    duplicates: duplicateTransactions.length > 0 ? duplicateTransactions : undefined,
                    newProgressPercent: parseFloat(newProgressPercent.toFixed(1))
                }
            });

        } catch (dbError: any) {
            console.error('[IMPORT_DB_FAIL] Rolling back...', dbError);
            for (const p of createdProjects) await (Project as any).deleteOne({ _id: p._id });
            for (const btx of createdBankTxs) await (BankTransaction as any).deleteOne({ _id: btx._id });
            return res.status(500).json({ error: 'Lỗi lưu dữ liệu: ' + dbError.message });
        }

    } catch (error: any) {
        console.error('Import error:', error);
        return res.status(500).json({ error: 'Lỗi hệ thống: ' + error.message });
    }
}

