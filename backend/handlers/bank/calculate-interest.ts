import { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../../lib/mongodb';
import { Transaction, Project, BankTransaction, Settings, User } from '../../../lib/models';
import { authMiddleware } from '../../../lib/auth';
import { toZonedTime } from 'date-fns-tz';

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

// Helper: Convert date to VN timezone and get start of day
const getVNStartOfDay = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const vnDate = toZonedTime(d, VN_TIMEZONE);
  vnDate.setHours(0, 0, 0, 0);
  return vnDate;
};

// Calculate interest helper
function calculateInterest(
    principal: number,
    annualRate: number,
    startDate: Date | string | undefined,
    endDate: Date
): number {
    if (!startDate) return 0;
    // Use VN timezone for date calculations
    const start = getVNStartOfDay(startDate);
    const end = getVNStartOfDay(endDate);

    const timeDiff = end.getTime() - start.getTime();
    const days = Math.floor(timeDiff / (1000 * 3600 * 24));
    if (days <= 0) return 0;
    const dailyRate = annualRate / 100 / 365;
    return Math.round(principal * dailyRate * days);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const payload = await authMiddleware(req, res);
        if (!payload) return;

        await connectDB();

        // Get user's organization for filtering
        const currentUser = await User.findById(payload.userId);
        if (!currentUser) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Build organization filter
        const isAdmin = payload.role === 'Admin' || payload.role === 'SuperAdmin' || currentUser.organization === 'Nam World';
        const userOrg = currentUser.organization;
        const projectFilter: any = {};
        if (!isAdmin && userOrg) {
            projectFilter.organization = userOrg;
        }

        // Get settings
        const settings = await Settings.findOne({ key: 'global' }) || { interestRate: 6.5 };
        const interestRate = settings.interestRate;

        // GET - Calculate and return interest summary
        if (req.method === 'GET') {
            // Get all projects for this org
            const projects = await Project.find(projectFilter);
            const projectIds = projects.map(p => p._id);

            // Get all transactions for these projects
            const transactions = await Transaction.find({ projectId: { $in: projectIds } });

            const now = new Date();

            let pendingPrincipal = 0; // Tổng gốc chưa giải ngân
            let pendingInterest = 0;  // Lãi tạm tính (chưa giải ngân)
            let lockedInterest = 0;   // Lãi đã chốt (đã giải ngân)
            let supplementary = 0;    // Tiền bổ sung

            transactions.forEach(t => {
                const project = projects.find(p => p._id.toString() === t.projectId.toString());
                const baseDate = t.effectiveInterestDate || project?.interestStartDate;

                if (t.status === 'Đã giải ngân' && t.disbursementDate) {
                    // Lãi đã chốt - tính đến ngày giải ngân
                    lockedInterest += calculateInterest(
                        t.compensation.totalApproved,
                        interestRate,
                        baseDate,
                        new Date(t.disbursementDate)
                    );
                } else {
                    // Chưa giải ngân - gốc + lãi tạm tính
                    pendingPrincipal += t.compensation.totalApproved;
                    pendingInterest += calculateInterest(
                        t.compensation.totalApproved,
                        interestRate,
                        baseDate,
                        now
                    );
                    supplementary += t.supplementaryAmount || 0;
                }
            });

            // Get bank balance for this org
            const bankFilter: any = {};
            if (!isAdmin && userOrg) {
                bankFilter.organization = userOrg;
            }
            const lastBankTx = await BankTransaction.findOne(bankFilter).sort({ date: -1 });
            const bankBalance = lastBankTx?.runningBalance || 0;

            return res.status(200).json({
                success: true,
                data: {
                    organization: userOrg,
                    interestRate,
                    pendingPrincipal: Math.round(pendingPrincipal),
                    pendingInterest: Math.round(pendingInterest),
                    lockedInterest: Math.round(lockedInterest),
                    supplementary: Math.round(supplementary),
                    totalPending: Math.round(pendingPrincipal + pendingInterest + supplementary),
                    bankBalance: Math.round(bankBalance),
                    calculatedAt: now.toISOString()
                }
            });
        }

        // POST - Capitalize monthly interest (manual trigger or cron)
        if (req.method === 'POST') {
            if (payload.role !== 'Admin' && payload.role !== 'SuperAdmin') {
                return res.status(403).json({ error: 'Admin only' });
            }

            const { month, year } = req.body;
            const targetMonth = month || new Date().getMonth();
            const targetYear = year || new Date().getFullYear();

            // Calculate monthly interest for each org
            const orgs = ['Đông Anh', 'Phúc Thịnh', 'Thiên Lộc', 'Thư Lâm', 'Vĩnh Thanh'];
            const results: any[] = [];

            for (const org of orgs) {
                const orgProjects = await Project.find({ organization: org });
                const projectIds = orgProjects.map(p => p._id);

                const orgTransactions = await Transaction.find({
                    projectId: { $in: projectIds },
                    status: { $ne: 'Đã giải ngân' }
                });

                // Start/end of month
                const monthStart = new Date(targetYear, targetMonth, 1);
                const monthEnd = new Date(targetYear, targetMonth + 1, 0);

                let monthlyInterest = 0;
                orgTransactions.forEach(t => {
                    const project = orgProjects.find(p => p._id.toString() === t.projectId.toString());
                    const baseDate = t.effectiveInterestDate || project?.interestStartDate;

                    // Calculate interest for this month only
                    const effectiveStart = baseDate && new Date(baseDate) > monthStart ? new Date(baseDate) : monthStart;
                    monthlyInterest += calculateInterest(
                        t.compensation.totalApproved,
                        interestRate,
                        effectiveStart,
                        monthEnd
                    );
                });

                if (monthlyInterest > 0) {
                    // Get current bank balance for this org
                    const lastTx = await BankTransaction.findOne({ organization: org }).sort({ date: -1 });
                    const currentBalance = lastTx?.runningBalance || 0;

                    // Create interest deposit transaction
                    await BankTransaction.create({
                        type: 'Nạp tiền',
                        amount: Math.round(monthlyInterest),
                        date: new Date(),
                        note: `Tự động kết chuyển lãi tháng ${targetMonth + 1}/${targetYear}`,
                        createdBy: 'Hệ thống',
                        runningBalance: currentBalance + Math.round(monthlyInterest),
                        organization: org,
                        updatedAt: new Date()
                    });

                    results.push({
                        organization: org,
                        monthlyInterest: Math.round(monthlyInterest),
                        newBalance: currentBalance + Math.round(monthlyInterest)
                    });
                }
            }

            return res.status(200).json({
                success: true,
                message: `Đã kết chuyển lãi tháng ${targetMonth + 1}/${targetYear}`,
                data: results
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error: any) {
        console.error('Interest calculation error:', error);
        return res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
}

