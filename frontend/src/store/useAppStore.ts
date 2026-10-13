import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
  _count?: {
    testCases: number;
    testPlans: number;
    testRuns: number;
  };
}

export type ThemeMode = 'dark' | 'light' | 'system';

export const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const initialTheme: ThemeMode = (typeof localStorage !== 'undefined' && (localStorage.getItem('qa_dock_theme') as ThemeMode)) || 'dark';
applyThemeToDocument(initialTheme);

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = (localStorage.getItem('qa_dock_theme') as ThemeMode) || 'dark';
    if (currentTheme === 'system') {
      applyThemeToDocument('system');
    }
  });
}

interface AppState {
  user: User | null;
  token: string | null;
  theme: ThemeMode;
  currentProject: Project | null;
  activeTab: 'test-cases' | 'test-plans' | 'test-runs' | 'automation' | 'settings';
  isEditorOpen: boolean;
  editingTestCaseId: string | null;
  activeTestRunId: string | null;
  isAuthModalOpen: boolean;

  setTheme: (theme: ThemeMode) => void;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setCurrentProject: (project: Project | null) => void;
  setActiveTab: (tab: 'test-cases' | 'test-plans' | 'test-runs' | 'automation' | 'settings') => void;
  selectedSuiteId: string | null;
  setSelectedSuiteId: (suiteId: string | null) => void;
  openEditor: (testCaseId?: string | null) => void;
  closeEditor: () => void;
  setActiveTestRunId: (runId: string | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('qa_dock_token') : null,
  theme: initialTheme,
  currentProject: null,
  activeTab: 'test-cases',
  selectedSuiteId: null,
  isEditorOpen: false,
  editingTestCaseId: null,
  activeTestRunId: null,
  isAuthModalOpen: false,

  setTheme: (theme) => {
    localStorage.setItem('qa_dock_theme', theme);
    applyThemeToDocument(theme);
    set({ theme });
  },
  setAuth: (user, token) => {
    localStorage.setItem('qa_dock_token', token);
    set({ user, token, isAuthModalOpen: false });
  },
  logout: () => {
    localStorage.removeItem('qa_dock_token');
    set({ user: null, token: null, currentProject: null, selectedSuiteId: null, isAuthModalOpen: true });
  },
  setCurrentProject: (project) => set({ currentProject: project, selectedSuiteId: null }),
  setActiveTab: (activeTab) => set({ activeTab, activeTestRunId: null }),
  setSelectedSuiteId: (selectedSuiteId) => set({ selectedSuiteId }),
  openEditor: (testCaseId = null) => set({ isEditorOpen: true, editingTestCaseId: testCaseId }),
  closeEditor: () => set({ isEditorOpen: false, editingTestCaseId: null }),
  setActiveTestRunId: (activeTestRunId) => set({ activeTestRunId, activeTab: 'test-runs' }),
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
