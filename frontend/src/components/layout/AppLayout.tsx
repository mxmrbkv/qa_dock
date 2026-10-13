import React, { useState } from 'react';
import {
  FileCheck2,
  ListTodo,
  PlaySquare,
  Webhook,
  Plus,
  ChevronDown,
  LogOut,
  Layers,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore, Project } from '../../store/useAppStore';
import { ThemeToggle } from './ThemeToggle';

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
    <div className="flex h-screen bg-slate-50 dark:bg-[#070a11] text-slate-800 dark:text-slate-100 overflow-hidden select-none transition-colors duration-150">
      {/* Linear Minimalist Sidebar */}
      <aside className="w-64 border-r border-slate-200/90 dark:border-slate-800/80 bg-white/95 dark:bg-[#0c101c] flex flex-col justify-between shrink-0 transition-colors duration-150 shadow-xs">
        <div>
          {/* Brand Header */}
          <div className="h-14 flex items-center px-4 border-b border-slate-200/80 dark:border-slate-800/80 gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7700FF] to-[#FF4F12] flex items-center justify-center shadow-md shadow-[#7700FF]/30 font-bold text-white tracking-wider">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs tracking-wider text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                <span>QA DOCK</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium bg-[#7700FF]/15 text-[#7700FF] dark:bg-[#7700FF]/25 dark:text-[#C084FC] border border-[#7700FF]/30">
                  РТК TMS
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Тест-менеджмент
              </div>
            </div>
          </div>

          {/* Project Selector */}
          <div className="p-3">
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left group transition-all duration-150
                           bg-slate-50 hover:bg-slate-100/90 border-slate-200/90 text-slate-800
                           dark:bg-slate-900/80 dark:hover:bg-slate-900 dark:border-slate-800 dark:text-slate-200 shadow-2xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-5 h-5 rounded font-mono bg-indigo-50 text-indigo-600 border border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentProject?.key || 'PRJ'}
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {currentProject?.name || (isLoadingProjects ? 'Загрузка...' : 'Выберите проект')}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform shrink-0" />
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                  <div className="max-h-48 overflow-y-auto">
                    {projects?.map((prj) => (
                      <button
                        key={prj.id}
                        onClick={() => {
                          setCurrentProject(prj);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                          currentProject?.id === prj.id
                            ? 'bg-indigo-50 text-indigo-600 font-semibold dark:bg-indigo-950/40 dark:text-indigo-400'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <span className="truncate">{prj.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {prj.key}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        onCreateProjectClick();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium transition-colors"
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
          <nav className="px-2 space-y-0.5 mt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-2xs dark:bg-indigo-600/15 dark:text-indigo-400 dark:border-indigo-500/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#090d16]/70">
          <div className="flex items-center justify-between">
            <div
              onClick={openAuthModal}
              title="Нажмите для смены аккаунта"
              className="flex items-center gap-2.5 overflow-hidden cursor-pointer hover:opacity-85 transition-opacity"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs">
                {user?.name ? user.name[0].toUpperCase() : 'QA'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name || 'Инженер QA'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.role === 'ADMIN' ? 'Администратор' : user?.role || 'Тестировщик'}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Выйти из системы"
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100/40 dark:bg-[#070a11]">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c101c]/80 backdrop-blur px-6 flex items-center justify-between shrink-0 transition-colors duration-150">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">{currentProject?.name || 'Рабочее пространство'}</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{getActiveTabTitle(activeTab)}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dark / Light / System Theme Switcher */}
            <ThemeToggle />

            <button
              onClick={openAuthModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                         bg-white hover:bg-slate-50 text-slate-700 border-slate-300
                         dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/80 shadow-2xs"
              title="Управление авторизацией и аккаунтом"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span className="hidden md:inline">Сменить пользователя</span>
            </button>

            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border
                            bg-emerald-50 text-emerald-700 border-emerald-200/80
                            dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="hidden sm:inline">В сети</span>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </main>
    </div>
  );
};
