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

interface AppState {
  user: User | null;
  token: string | null;
  currentProject: Project | null;
  activeTab: 'test-cases' | 'test-plans' | 'test-runs' | 'automation' | 'settings';
  isEditorOpen: boolean;
  editingTestCaseId: string | null;
  activeTestRunId: string | null;
  isAuthModalOpen: boolean;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setCurrentProject: (project: Project | null) => void;
  setActiveTab: (tab: 'test-cases' | 'test-plans' | 'test-runs' | 'automation' | 'settings') => void;
  openEditor: (testCaseId?: string | null) => void;
  closeEditor: () => void;
  setActiveTestRunId: (runId: string | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem('qa_dock_token'),
  currentProject: null,
  activeTab: 'test-cases',
  isEditorOpen: false,
  editingTestCaseId: null,
  activeTestRunId: null,
  isAuthModalOpen: false,

  setAuth: (user, token) => {
    localStorage.setItem('qa_dock_token', token);
    set({ user, token, isAuthModalOpen: false });
  },
  logout: () => {
    localStorage.removeItem('qa_dock_token');
    set({ user: null, token: null, currentProject: null, isAuthModalOpen: true });
  },
  setCurrentProject: (project) => set({ currentProject: project }),
  setActiveTab: (activeTab) => set({ activeTab, activeTestRunId: null }),
  openEditor: (testCaseId = null) => set({ isEditorOpen: true, editingTestCaseId: testCaseId }),
  closeEditor: () => set({ isEditorOpen: false, editingTestCaseId: null }),
  setActiveTestRunId: (activeTestRunId) => set({ activeTestRunId, activeTab: 'test-runs' }),
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
