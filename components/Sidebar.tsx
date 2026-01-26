
import React from 'react';
import { LayoutDashboard, FolderKanban, Settings, Users, LogOut, ShieldCheck, Landmark, Calculator } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
    { id: 'projects', icon: FolderKanban, label: 'Dự án' },
    { id: 'balance', icon: Landmark, label: 'Số dư' },
    { id: 'transactions', icon: Users, label: 'Giao dịch' },
    { id: 'interestCalc', icon: Calculator, label: 'Tính lãi dự kiến' },
    { id: 'admin', icon: ShieldCheck, label: 'Admin' },
  ];

  // Filter menu items based on user permissions
  const availableItems = menuItems.filter(item => {
    const isElevated = currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin';
    if (isElevated) return true;
    // Allow interestCalc if user có quyền giao dịch hoặc số dư
    if (item.id === 'interestCalc') {
      return currentUser.permissions.includes('transactions') || currentUser.permissions.includes('balance') || currentUser.permissions.includes(item.id);
    }
    return currentUser.permissions.includes(item.id);
  });

  return (
    <div className="w-64 h-screen fixed left-0 top-0 flex flex-col bg-white backdrop-blur-2xl border-r border-slate-200 z-40">
      <div className="p-8">
        <img 
          src="https://www.agribank.com.vn/wp-content/themes/agribank/images/logo.png" 
          alt="Agribank Logo" 
          className="h-12 w-auto object-contain"
          onError={(e) => {
            // Fallback nếu logo không load được
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'text-2xl font-medium tracking-tight text-black';
            fallback.textContent = 'Agribank';
            target.parentElement?.appendChild(fallback);
          }}
        />
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {availableItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-300
              ${activeTab === item.id 
                ? 'bg-blue-50 shadow-sm border border-blue-200 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
            `}
          >
            <item.icon size={18} strokeWidth={2} className={activeTab === item.id ? 'text-blue-600' : 'text-slate-500'} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-300 mx-4 mb-4">
        <div 
          onClick={onLogout}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
        >
          <img src={currentUser.avatar} alt="User" className="w-9 h-9 rounded-full object-cover border border-white shadow-sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
            <p className="text-[10px] font-medium text-slate-500 truncate">{currentUser.role}</p>
          </div>
          <LogOut size={16} className="text-slate-400 group-hover:text-red-500 transition-colors" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};
