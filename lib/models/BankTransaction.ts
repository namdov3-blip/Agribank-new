import mongoose, { Schema, Document, Types } from 'mongoose';
import { ORGANIZATIONS, OrganizationType } from './User';

export interface IBankTransaction extends Document {
    type: 'Nạp tiền' | 'Rút tiền' | 'Điều chỉnh';
    amount: number;
    date: Date;
    note: string;
    createdBy: string;
    runningBalance: number;
    organization: OrganizationType;
    projectId?: Types.ObjectId;
    updatedAt: Date;
}

const BankTransactionSchema = new Schema<IBankTransaction>({
    type: {
        type: String,
        enum: ['Nạp tiền', 'Rút tiền', 'Điều chỉnh'],
        required: true
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    createdBy: { type: String, default: 'Hệ thống' },
    runningBalance: { type: Number, required: true },
    organization: {
        type: String,
        enum: ORGANIZATIONS,
        required: true
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' }
}, { timestamps: true });

BankTransactionSchema.index({ date: 1 });
BankTransactionSchema.index({ organization: 1 });
BankTransactionSchema.index({ updatedAt: -1 });

// Ensure virtual fields (like id) are serialized and _id is removed
BankTransactionSchema.set('toJSON', {
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

BankTransactionSchema.set('toObject', {
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

const BankTransaction = mongoose.models.BankTransaction || mongoose.model<IBankTransaction>('BankTransaction', BankTransactionSchema);
export default BankTransaction as mongoose.Model<IBankTransaction>;
