import React, { useState } from 'react';
import {
  FolderKanban,
  FileCheck2,
  ListTodo,
  PlaySquare,
  Webhook,
  Plus,
  ChevronDown,
  LogOut,
  Layers,
  Sparkles,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useAppStore, Project } from '../../store/useAppStore';

interface AppLayoutProps {
  children: React.ReactNode;
  projects: Project[];
  isLoadingProjects: boolean;
  onCreateProjectClick: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  projects,
  isLoadingProjects,
  onCreateProjectClick,
}) => {
  const {
    currentProject,
    setCurrentProject,
    activeTab,
    setActiveTab,
    user,
    logout,
    openAuthModal,
  } = useAppStore();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  // Auto-select first project if none selected
  React.useEffect(() => {
    if (!currentProject && projects && projects.length > 0) {
      setCurrentProject(projects[0]);
    }
  }, [currentProject, projects, setCurrentProject]);

  const navItems = [
    {
      id: 'test-cases' as const,
      label: 'Тест-кейсы',
      icon: FileCheck2,
      count: currentProject?._count?.testCases,
    },
    {
      id: 'test-plans' as const,
      label: 'Тест-планы',
      icon: ListTodo,
      count: currentProject?._count?.testPlans,
    },
    {
      id: 'test-runs' as const,
      label: 'Тест-раны',
      icon: PlaySquare,
      count: currentProject?._count?.testRuns,
    },
    {
      id: 'automation' as const,
      label: 'CI/CD Автоматизация',
      icon: Webhook,
    },
  ];

  const getActiveTabTitle = (tab: string) => {
    switch (tab) {
      case 'test-cases':
        return 'Тест-кейсы';
      case 'test-plans':
        return 'Тест-планы';
      case 'test-runs':
        return 'Тест-раны';
      case 'automation':
        return 'CI/CD Автоматизация';
      default:
        return 'Раздел';
    }
  };

  return (
    <div className="flex h-screen bg-[#080b12] text-slate-100 overflow-hidden select-none">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-[#0d121f] flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 font-bold text-white tracking-wider">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                QA DOCK
              </div>
              <div className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">
                Система TMS
              </div>
            </div>
          </div>

          {/* Project Selector */}
          <div className="p-3">
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-6 h-6 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                    {currentProject?.key || 'PRJ'}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {currentProject?.name || (isLoadingProjects ? 'Загрузка...' : 'Выберите проект')}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform shrink-0" />
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                  <div className="max-h-48 overflow-y-auto">
                    {projects?.map((prj) => (
                      <button
                        key={prj.id}
                        onClick={() => {
                          setCurrentProject(prj);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-800/80 transition-colors ${
                          currentProject?.id === prj.id ? 'bg-blue-600/10 text-blue-400 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <span className="truncate">{prj.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {prj.key}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-800 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        onCreateProjectClick();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-400 hover:bg-blue-600/10 font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Создать новый проект
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0b0f19]">
          <div className="flex items-center justify-between">
            <div
              onClick={openAuthModal}
              title="Нажмите для смены аккаунта или входа через Keycloak"
              className="flex items-center gap-2.5 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md">
                {user?.name ? user.name[0].toUpperCase() : 'QA'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-medium text-slate-200 truncate">{user?.name || 'Инженер по тестированию'}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.role === 'ADMIN' ? 'Администратор' : user?.role || 'Тестировщик'}</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Выйти из системы"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 bg-[#0d121f]/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>{currentProject?.name || 'Рабочее пространство'}</span>
              <span className="text-slate-500 font-normal">/</span>
              <span className="text-blue-400">{getActiveTabTitle(activeTab)}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openAuthModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all"
              title="Управление авторизацией и аккаунтом"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Сменить пользователя
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Синхронизировано
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
