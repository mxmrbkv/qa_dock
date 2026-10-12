import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { api } from './lib/api';
import { AppLayout } from './components/layout/AppLayout';
import { TestCaseGrid } from './components/test-cases/TestCaseGrid';
import { TestCaseEditor } from './components/test-cases/TestCaseEditor';
import { TestRunView } from './components/test-runs/TestRunView';
import { TestPlansView } from './components/test-plans/TestPlansView';
import { AutomationWebhookGuide } from './components/automation/AutomationWebhookGuide';
import { CreateProjectModal } from './components/projects/CreateProjectModal';
import { AuthModal } from './components/auth/AuthModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

const MainDashboard: React.FC = () => {
  const {
    token,
    setAuth,
    currentProject,
    setCurrentProject,
    activeTab,
    isEditorOpen,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
  } = useAppStore();

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isKeycloakLoading, setIsKeycloakLoading] = useState(false);

  // Check for Keycloak redirect authorization code in URL params
  useEffect(() => {
    const handleKeycloakRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        // Clean URL to prevent re-using code on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsKeycloakLoading(true);

        try {
          const res = await api.post('/auth/keycloak/callback', {
            code,
            redirectUri: window.location.origin,
          });

          setAuth(res.data.user, res.data.accessToken);
          setIsInitializing(false);
        } catch (err: any) {
          console.error('Keycloak authentication failed', err);
          alert('Ошибка авторизации через Keycloak: ' + (err.response?.data?.message || err.message));
          openAuthModal();
        } finally {
          setIsKeycloakLoading(false);
        }
        return;
      }

      // If no Keycloak code, check stored token or auto-authenticate
      const storedToken = localStorage.getItem('qa_dock_token');
      if (storedToken) {
        try {
          const meRes = await api.get('/auth/me');
          setAuth(meRes.data, storedToken);
        } catch {
          localStorage.removeItem('qa_dock_token');
          openAuthModal();
        } finally {
          setIsInitializing(false);
        }
        return;
      }

      try {
        const loginRes = await api.post('/auth/login', {
          email: 'admin@qadock.dev',
          password: 'Password123!',
        });
        setAuth(loginRes.data.user, loginRes.data.accessToken);
      } catch (err) {
        try {
          const regRes = await api.post('/auth/register', {
            email: 'admin@qadock.dev',
            password: 'Password123!',
            name: 'Admin QA Dock',
          });
          setAuth(regRes.data.user, regRes.data.accessToken);
        } catch (regErr) {
          console.warn('Auto-auth fallback failed, opening Auth Modal', regErr);
          openAuthModal();
        }
      } finally {
        setIsInitializing(false);
      }
    };

    handleKeycloakRedirect();
  }, [setAuth, openAuthModal]);

  // Fetch all user projects from PostgreSQL backend
  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects', token],
    queryFn: async () => {
      if (!token && !localStorage.getItem('qa_dock_token')) {
        return [];
      }
      try {
        const res = await api.get('/projects');
        let projectList = res.data;

        // If user has zero projects, automatically bootstrap initial demo project
        if (Array.isArray(projectList) && projectList.length === 0) {
          try {
            const createRes = await api.post('/projects', {
              name: 'Demo E2E Suite',
              key: 'DEMO',
              description: 'Основное рабочее пространство QA Dock',
            });
            projectList = [createRes.data];
          } catch (createErr) {
            console.error('Failed to auto-create default project', createErr);
          }
        }

        return projectList;
      } catch (err: any) {
        if (err.response?.status === 401) {
          openAuthModal();
        }
        return [];
      }
    },
    enabled: !isInitializing && !isKeycloakLoading,
  });

  if (isKeycloakLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080b12] text-slate-100 flex-col gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30 animate-pulse">
          <KeyRound className="w-7 h-7 text-white animate-spin" />
        </div>
        <div className="text-sm font-bold tracking-wide">Авторизация через Keycloak SSO...</div>
        <div className="text-xs text-slate-500">Синхронизация профиля и ролей с QA Dock</div>
      </div>
    );
  }

  return (
    <>
      <AppLayout
        projects={projects}
        isLoadingProjects={isLoading || isInitializing}
        onCreateProjectClick={() => setIsCreateProjectOpen(true)}
      >
        {/* Active Tab View Switcher */}
        {activeTab === 'test-cases' && <TestCaseGrid />}
        {activeTab === 'test-plans' && <TestPlansView />}
        {activeTab === 'test-runs' && <TestRunView />}
        {activeTab === 'automation' && <AutomationWebhookGuide />}

        {/* Test Case Editor Drawer/Modal */}
        {isEditorOpen && (
          <TestCaseEditor
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['test-cases'] });
              queryClient.invalidateQueries({ queryKey: ['projects'] });
              queryClient.invalidateQueries({ queryKey: ['test-cases-all'] });
            }}
          />
        )}

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          onProjectCreated={(newProj) => {
            refetch();
            setCurrentProject(newProj);
          }}
        />
      </AppLayout>

      {/* Auth Modal for Login / Registration / Switch Account */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={token ? closeAuthModal : undefined}
        onSuccess={() => {
          closeAuthModal();
          refetch();
        }}
      />
    </>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainDashboard />
    </QueryClientProvider>
  );
}

export default App;
