import mongoose, { Schema, Document } from 'mongoose';

export const ORGANIZATIONS = ['Đông Anh', 'Phúc Thịnh', 'Thiên Lộc', 'Thư Lâm', 'Vĩnh Thanh', 'Nam World'] as const;
export type OrganizationType = typeof ORGANIZATIONS[number];

export interface IUser extends Document {
    name: string;
    password: string;
    role: 'SuperAdmin' | 'Admin' | 'User1' | 'User2' | 'PMB';
    avatar: string;
    permissions: string[];
    organization: OrganizationType;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['SuperAdmin', 'Admin', 'User1', 'User2', 'PMB'],
        default: 'User2'
    },
    avatar: { type: String, default: '' },
    permissions: {
        type: [String],
        default: ['dashboard', 'projects', 'transactions']
    },
    organization: {
        type: String,
        enum: ORGANIZATIONS,
        required: true
    }
}, { timestamps: true });

UserSchema.index({ organization: 1 });

// Ensure virtual fields (like id) are serialized and _id is removed
UserSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        if (ret._id) {
            ret.id = ret._id.toString();
            delete ret._id;
        }
        delete ret.password; // Security: always hide password in JSON
        return ret;
    }
});

UserSchema.set('toObject', {
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

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User as mongoose.Model<IUser>;
