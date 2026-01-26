
import React, { useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { AuditLogItem, User, InterestHistoryLog } from '../types';
import { Shield, UserPlus, FileClock, History, Save, CheckSquare, Square, Lock, Key, Edit, X, Download, Building2, Trash2 } from 'lucide-react';
import { formatCurrency, exportAuditLogsToExcel, formatNumberWithComma, parseNumberFromComma, toVNTime, VN_TIMEZONE } from '../utils/helpers';
import { format as formatTz } from 'date-fns-tz';

interface AdminProps {
  auditLogs: AuditLogItem[];
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  interestRate: number;
  onUpdateInterestRate: (newRate: number) => void;
  bankInterestRate: number;
  onUpdateBankInterestRate: (newRate: number) => void;
  interestHistory: InterestHistoryLog[];
  currentUser: User;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogItem[]>>;
  setInterestHistory: React.Dispatch<React.SetStateAction<InterestHistoryLog[]>>;
}

export const Admin: React.FC<AdminProps> = ({
  auditLogs,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  interestRate,
  onUpdateInterestRate,
  bankInterestRate,
  onUpdateBankInterestRate,
  interestHistory,
  currentUser,
  setAuditLogs,
  setInterestHistory
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'users' | 'interest'>('audit');

  // State for adding new user
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    role: 'User2',
    permissions: ['dashboard', 'projects', 'transactions', 'interestCalc'], // Default perms (kèm tính lãi dự kiến)
    password: '',
    organization: undefined
  });

  // State for Editing User
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [tempInterestRate, setTempInterestRate] = useState(interestRate);
  const [interestRateInput, setInterestRateInput] = useState(formatNumberWithComma(interestRate));

  const [tempBankInterestRate, setTempBankInterestRate] = useState(bankInterestRate);
  const [bankInterestRateInput, setBankInterestRateInput] = useState(formatNumberWithComma(bankInterestRate));

  const availablePermissions = [
    { id: 'dashboard', label: 'Tổng quan (Dashboard)' },
    { id: 'projects', label: 'Quản lý Dự án' },
    { id: 'transactions', label: 'Giao dịch & Chi tiết' },
    { id: 'balance', label: 'Số dư' },
    { id: 'interestCalc', label: 'Tính lãi dự kiến' },
    { id: 'admin', label: 'Admin' },
  ];

  const handleCreateUser = () => {
    if (!newUser.name) return alert("Vui lòng nhập tên user");
    if (!newUser.password) return alert("Vui lòng nhập mật khẩu");

    const now = new Date();
    const userToAdd: User = {
      id: `u-${Date.now()}`,
      name: newUser.name!,
      role: newUser.role as any,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name!)}&background=random`,
      permissions: newUser.permissions || [],
      password: newUser.password,
      organization: newUser.organization
    };
    onAddUser(userToAdd);
    alert(`Đã tạo tài khoản "${userToAdd.name}" thành công!`);

    // Log audit
    setAuditLogs(prev => [...prev, {
      id: `audit-${Date.now()}`,
      timestamp: now.toISOString(),
      actor: currentUser.name,
      role: currentUser.role,
      action: 'Tạo tài khoản mới',
      target: `User ${userToAdd.name}`,
      details: `Tạo tài khoản mới: ${userToAdd.name} (${userToAdd.role})${userToAdd.organization ? ` - ${userToAdd.organization}` : ''}`
    }]);

    setNewUser({ name: '', role: 'User2', permissions: ['dashboard', 'projects', 'transactions', 'interestCalc'], password: '', organization: undefined });
  };

  const togglePermission = (permId: string, isEditing = false) => {
    if (isEditing && editingUser) {
      const currentPerms = editingUser.permissions || [];
      const updatedPerms = currentPerms.includes(permId)
        ? currentPerms.filter(p => p !== permId)
        : [...currentPerms, permId];
      setEditingUser({ ...editingUser, permissions: updatedPerms });
    } else {
      const currentPerms = newUser.permissions || [];
      if (currentPerms.includes(permId)) {
        setNewUser({ ...newUser, permissions: currentPerms.filter(p => p !== permId) });
      } else {
        setNewUser({ ...newUser, permissions: [...currentPerms, permId] });
      }
    }
  };

  React.useEffect(() => {
    setTempInterestRate(interestRate);
    setInterestRateInput(formatNumberWithComma(interestRate));
  }, [interestRate]);

  React.useEffect(() => {
    setTempBankInterestRate(bankInterestRate);
    setBankInterestRateInput(formatNumberWithComma(bankInterestRate));
  }, [bankInterestRate]);

  const handleInterestRateChange = (value: string) => {
    setInterestRateInput(value);
    const parsed = parseNumberFromComma(value);
    setTempInterestRate(parsed);
  };
  const handleSaveInterest = () => {
    const parsed = parseNumberFromComma(interestRateInput);
    if (parsed !== interestRate && parsed > 0) {
      const now = new Date();
      const oldRate = interestRate;
      onUpdateInterestRate(parsed);

      // Lưu lịch sử thay đổi lãi suất
      setInterestHistory(prev => [...prev, {
        timestamp: now.toISOString(),
        oldRate,
        newRate: parsed,
        actor: currentUser.name
      }]);

      // Log audit
      setAuditLogs(prev => [...prev, {
        id: `audit-${Date.now()}`,
        timestamp: now.toISOString(),
        actor: currentUser.name,
        role: currentUser.role,
        action: 'Cấu hình lãi suất',
        target: 'Hệ thống',
        details: `Thay đổi lãi suất từ ${oldRate}% sang ${parsed}%`
      }]);
    }
  };

  const handleBankInterestRateChange = (value: string) => {
    setBankInterestRateInput(value);
    const parsed = parseNumberFromComma(value);
    setTempBankInterestRate(parsed);
  };

  const handleSaveBankInterest = () => {
    const parsed = parseNumberFromComma(bankInterestRateInput);
    if (parsed !== bankInterestRate && parsed >= 0) {
      onUpdateBankInterestRate(parsed);
      alert("Đã cập nhật lãi suất ngân hàng thành công!");

      // Log audit
      setAuditLogs(prev => [...prev, {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: currentUser.name,
        role: currentUser.role,
        action: 'Cấu hình lãi suất NH',
        target: 'Hệ thống',
        details: `Thay đổi lãi suất ngân hàng từ ${bankInterestRate}% sang ${parsed}%`
      }]);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser({ ...user });
    setNewPassword(''); // Reset password field
  };

  const handleSaveUserUpdate = () => {
    if (editingUser) {
      const now = new Date();
      const updated = { ...editingUser };
      if (newPassword) {
        updated.password = newPassword;
      }
      onUpdateUser(updated);
      alert(`Đã cập nhật tài khoản "${updated.name}" thành công!`);

      // Log audit
      setAuditLogs(prev => [...prev, {
        id: `audit-${Date.now()}`,
        timestamp: now.toISOString(),
        actor: currentUser.name,
        role: currentUser.role,
        action: 'Cập nhật tài khoản',
        target: `User ${updated.name}`,
        details: `Cập nhật thông tin tài khoản: ${updated.name}${newPassword ? ' (đã đổi mật khẩu)' : ''}`
      }]);

      setEditingUser(null);
    }
  };

  const handleDownloadAuditLog = () => {
    exportAuditLogsToExcel(auditLogs);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex justify-between items-end pb-2">
        <div>
          <h2 className="text-2xl font-medium text-black tracking-tight">Quản trị hệ thống</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Audit log, phân quyền & cấu hình</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeSubTab === 'audit' ? 'bg-white text-blue-700 border-x border-t border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><FileClock size={16} /> Audit Log</div>
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeSubTab === 'users' ? 'bg-white text-blue-700 border-x border-t border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><UserPlus size={16} /> Quản lý User</div>
        </button>
        <button
          onClick={() => setActiveSubTab('interest')}
          className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeSubTab === 'interest' ? 'bg-white text-blue-700 border-x border-t border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><Shield size={16} /> Cấu hình Lãi</div>
        </button>
      </div>

      {/* Content Area */}

      {/* --- AUDIT LOG TAB --- */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleDownloadAuditLog}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Download size={14} /> Tải xuống Excel
            </button>
          </div>
          <GlassCard className="p-0 overflow-hidden border-slate-300">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-[10px] text-slate-600 uppercase font-bold sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">Thời gian</th>
                    <th className="px-6 py-3 border-b border-slate-200">Người thực hiện</th>
                    <th className="px-6 py-3 border-b border-slate-200">Hành động</th>
                    <th className="px-6 py-3 border-b border-slate-200">Đối tượng</th>
                    <th className="px-6 py-3 border-b border-slate-200">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditLogs.slice().reverse().map((log) => (
                    <tr key={log.id} className="hover:bg-blue-50/50">
                      <td className="px-6 py-3 whitespace-nowrap text-xs font-mono text-slate-500">
                        {formatTz(toVNTime(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { timeZone: VN_TIMEZONE })}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-bold text-slate-900">{log.actor}</span>
                        <span className="block text-[10px] text-slate-500">{log.role}</span>
                      </td>
                      <td className="px-6 py-3 text-xs font-bold text-blue-700">{log.action}</td>
                      <td className="px-6 py-3 text-xs font-medium text-slate-700">{log.target}</td>
                      <td className="px-6 py-3 text-xs text-slate-600">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* --- USER MANAGEMENT TAB --- */}
      {activeSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-2 space-y-4">
            <GlassCard className="p-0 overflow-hidden border-slate-300 shadow-sm">
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-[10px] text-slate-600 uppercase font-bold sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 border-b border-slate-200">Người dùng</th>
                      <th className="px-6 py-3 border-b border-slate-200">Vai trò</th>
                      <th className="px-6 py-3 border-b border-slate-200">Organization</th>
                      <th className="px-6 py-3 border-b border-slate-200">Phân quyền</th>
                      <th className="px-6 py-3 border-b border-slate-200 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-10 h-10 rounded-full border border-slate-200 shadow-sm"
                            />
                            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.organization ? (
                            <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 w-fit">
                              <Building2 size={12} className="opacity-70" />
                              <span className="text-[11px] font-bold uppercase tracking-tight">{user.organization}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap">
                            {user.permissions.map((p) => (
                              <span
                                key={p}
                                className="px-2 py-0.5 bg-white text-[10px] font-bold rounded border border-slate-200 text-slate-500 shadow-xs"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditClick(user)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <Edit size={14} /> <span>Sửa</span>
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.name}"?`)) {
                                  onDeleteUser(user.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <Trash2 size={14} /> <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          {/* Add User Form */}
          <GlassCard className="p-6 border-slate-300 h-fit">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase flex items-center gap-2">
              <UserPlus size={16} /> Tạo tài khoản mới
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Tên hiển thị</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Mật khẩu</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded pl-9 pr-3 py-2 text-sm focus:border-blue-500 outline-none"
                    placeholder="Nhập mật khẩu..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Vai trò</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                >
                  <option value="User1">User1 (Kế toán)</option>
                  <option value="User2">User2 (NV Nghiệp vụ)</option>
                  <option value="PMB">PMB (Ban QLDA)</option>
                  <option value="Admin">Admin (Quản trị Org)</option>
                  <option value="SuperAdmin">SuperAdmin (Toàn hệ thống)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Building2 size={12} /> Organization
                </label>
                <select
                  value={newUser.organization || ''}
                  onChange={(e) => setNewUser({ ...newUser, organization: e.target.value as any || undefined })}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                >
                  <option value="">-- Chọn Organization --</option>
                  <option value="Đông Anh">Đông Anh</option>
                  <option value="Phúc Thịnh">Phúc Thịnh</option>
                  <option value="Thiên Lộc">Thiên Lộc</option>
                  <option value="Thư Lâm">Thư Lâm</option>
              <option value="Vĩnh Thanh">Vĩnh Thanh</option>
              <option value="Nam World">Nam World (Xem tất cả org)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2">Phân quyền truy cập tab</label>
                <div className="space-y-2">
                  {availablePermissions.map(perm => (
                    <div
                      key={perm.id}
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => togglePermission(perm.id)}
                    >
                      {newUser.permissions?.includes(perm.id)
                        ? <CheckSquare size={16} className="text-blue-600" />
                        : <Square size={16} className="text-slate-300" />
                      }
                      <span className="text-xs font-medium text-slate-700">{perm.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateUser}
                className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-black transition-colors shadow-lg"
              >
                Tạo người dùng
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <GlassCard className="w-[450px] bg-white p-6 shadow-2xl border-slate-300">
            <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit size={18} className="text-blue-600" />
                  Cập nhật tài khoản
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Chỉnh sửa thông tin & đổi mật khẩu</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Tên hiển thị</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Vai trò</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="User1">User1 (Kế toán)</option>
                    <option value="User2">User2 (NV Nghiệp vụ)</option>
                    <option value="PMB">PMB (Ban QLDA)</option>
                    <option value="Admin">Admin (Quản trị Org)</option>
                    <option value="SuperAdmin">SuperAdmin (Toàn hệ thống)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 flex items-center gap-1">
                  <Building2 size={12} /> Organization
                </label>
                <select
                  value={editingUser.organization || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, organization: e.target.value as any || undefined })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Chọn Organization --</option>
                  <option value="Đông Anh">Đông Anh</option>
                  <option value="Phúc Thịnh">Phúc Thịnh</option>
                  <option value="Thiên Lộc">Thiên Lộc</option>
                  <option value="Thư Lâm">Thư Lâm</option>
                  <option value="Vĩnh Thanh">Vĩnh Thanh</option>
                </select>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <label className="block text-[11px] font-bold text-amber-800 uppercase mb-2 flex items-center gap-2">
                  <Key size={14} /> Đổi mật khẩu
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-amber-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
                  placeholder="Nhập mật khẩu mới (để trống nếu không đổi)"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">Phân quyền</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {availablePermissions.map(perm => (
                    <div
                      key={perm.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded"
                      onClick={() => togglePermission(perm.id, true)}
                    >
                      {editingUser.permissions?.includes(perm.id)
                        ? <CheckSquare size={16} className="text-blue-600" />
                        : <Square size={16} className="text-slate-300" />
                      }
                      <span className="text-xs font-medium text-slate-700">{perm.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveUserUpdate}
                className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
              >
                <Save size={14} /> Lưu thay đổi
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* --- INTEREST SETTINGS TAB --- */}
      {activeSubTab === 'interest' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <GlassCard className="border-slate-300 shadow-md p-8">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Lãi suất năm (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={interestRateInput}
                  onChange={(e) => handleInterestRateChange(e.target.value)}
                  onBlur={(e) => {
                    const parsed = parseNumberFromComma(e.target.value);
                    setInterestRateInput(formatNumberWithComma(parsed));
                  }}
                  placeholder="Nhập lãi suất (ví dụ: 6,5 hoặc 6.5)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-lg font-bold text-black focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-inner transition-all"
                />
                <button
                  onClick={handleSaveInterest}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                >
                  <Save size={16} /> Lưu
                </button>
              </div>
              <p className="text-[11px] font-medium text-slate-600 mt-3 leading-relaxed">
                * Lưu ý: Lãi suất năm áp dụng cho các dự án và hộ dân.
              </p>
            </GlassCard>

            <GlassCard className="border-slate-300 shadow-md p-8">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Lãi suất gửi tiết kiệm NH (% tháng)</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={bankInterestRateInput}
                  onChange={(e) => handleBankInterestRateChange(e.target.value)}
                  onBlur={(e) => {
                    const parsed = parseNumberFromComma(e.target.value);
                    setBankInterestRateInput(formatNumberWithComma(parsed));
                  }}
                  placeholder="Nhập lãi suất NH (ví dụ: 0,5 hoặc 0.5)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-lg font-bold text-black focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-inner transition-all"
                />
                <button
                  onClick={handleSaveBankInterest}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                >
                  <Save size={16} /> Lưu
                </button>
              </div>
              <p className="text-[11px] font-medium text-slate-600 mt-3 leading-relaxed">
                * Lưu ý: Lãi suất này dùng để tự động cộng lãi tiết kiệm vào mùng 1 hàng tháng.
              </p>
            </GlassCard>


          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
              <History size={16} /> Lịch sử thay đổi lãi suất
            </h3>
            <GlassCard className="p-0 overflow-hidden border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold">
                  <tr>
                    <th className="px-4 py-2">Thời gian</th>
                    <th className="px-4 py-2 text-right">Cũ</th>
                    <th className="px-4 py-2 text-right">Mới</th>
                    <th className="px-4 py-2">Người sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {interestHistory.length > 0 ? (
                    interestHistory.slice().reverse().map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-xs font-mono text-slate-500">
                          {formatTz(toVNTime(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { timeZone: VN_TIMEZONE })}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-slate-400">{log.oldRate}%</td>
                        <td className="px-4 py-2 text-right font-bold text-blue-700">{log.newRate}%</td>
                        <td className="px-4 py-2 text-xs font-bold text-slate-700">{log.actor}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="p-4 text-center text-xs text-slate-400 italic">Chưa có lịch sử thay đổi</td></tr>
                  )}
                </tbody>
              </table>
            </GlassCard>
          </div>
        </div>
      )}

    </div>
  );
};
