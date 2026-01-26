import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITransactionLog {
    timestamp: Date;
    action: string;
    details: string;
    totalAmount?: number;
    actor?: string;
}

export interface IHousehold {
    id: string;
    name: string;
    cccd: string;
    address: string;
    landOrigin: string;
    landArea: number;
    decisionNumber: string;
    decisionDate: Date;
}

export interface ICompensation {
    landAmount: number;
    assetAmount: number;
    houseAmount: number;
    supportAmount: number;
    totalApproved: number;
}

export interface ITransaction extends Document {
    projectId: Types.ObjectId;
    household: IHousehold;
    compensation: ICompensation;
    paymentType?: string;
    status: 'Chưa giải ngân' | 'Đã giải ngân' | 'Tồn đọng/Giữ hộ';
    disbursementDate?: Date;
    effectiveInterestDate?: Date;
    supplementaryAmount?: number;
    disbursedTotal?: number; // Exact amount disbursed (principal + interest + supplementary)
    notes?: string;
    history: ITransactionLog[];
    updatedAt: Date;
    stt?: string | number;
}

const TransactionLogSchema = new Schema<ITransactionLog>({
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    details: { type: String, required: true },
    totalAmount: { type: Number },
    actor: { type: String }
}, { _id: false });

const HouseholdSchema = new Schema<IHousehold>({
    id: { type: String, required: true },
    name: { type: String, default: '' },
    cccd: { type: String, default: '' },
    address: { type: String, default: '' },
    landOrigin: { type: String, default: '' },
    landArea: { type: Number, default: 0 },
    decisionNumber: { type: String, default: '' },
    decisionDate: { type: Date }
}, { _id: false });

const CompensationSchema = new Schema<ICompensation>({
    landAmount: { type: Number, default: 0 },
    assetAmount: { type: Number, default: 0 },
    houseAmount: { type: Number, default: 0 },
    supportAmount: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 }
}, { _id: false });

const TransactionSchema = new Schema<ITransaction>({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    household: { type: HouseholdSchema, required: true },
    compensation: { type: CompensationSchema, required: true },
    paymentType: { type: String, default: '' },
    status: {
        type: String,
        enum: ['Chưa giải ngân', 'Đã giải ngân', 'Tồn đọng/Giữ hộ'],
        default: 'Chưa giải ngân'
    },
    disbursementDate: { type: Date },
    effectiveInterestDate: { type: Date },
    supplementaryAmount: { type: Number, default: 0 },
    disbursedTotal: { type: Number }, // Stores exact amount disbursed for accurate refunds
    notes: { type: String },
    history: { type: [TransactionLogSchema], default: [] },
    stt: { type: String }
}, { timestamps: true });

// Index for faster queries
TransactionSchema.index({ projectId: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ stt: 1, 'household.name': 1 });
TransactionSchema.index({ updatedAt: -1 });

// Ensure virtual fields (like id) are serialized and _id is removed
TransactionSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        if (ret._id) {
            ret.id = ret._id.toString();
            delete ret._id;
        }
        return ret;
    }
});

TransactionSchema.set('toObject', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        if (ret._id) {
            ret.id = ret._id.toString();
            delete ret._id;
        }
        return ret;
    }
});

const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
export default Transaction as mongoose.Model<ITransaction>;
