import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    timestamp: Date;
    actor: string;
    role: string;
    action: string;
    target: string;
    details: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
    timestamp: { type: Date, default: Date.now },
    actor: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    details: { type: String, default: '' }
});

AuditLogSchema.index({ timestamp: -1 });

// Ensure virtual fields (like id) are serialized and _id is removed
AuditLogSchema.set('toJSON', {
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

AuditLogSchema.set('toObject', {
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

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog as mongoose.Model<IAuditLog>;
