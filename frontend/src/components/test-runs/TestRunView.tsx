import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  SkipForward,
  ListChecks,
  ChevronRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckSquare,
  Square,
  ArrowLeft,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { cn, getPriorityColor, getStatusColor, getPriorityLabel, getStatusLabel } from '../../lib/utils';
import { CardsSkeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';

export const TestRunView: React.FC = () => {
  const { currentProject, setActiveTab } = useAppStore();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [actualResultNote, setActualResultNote] = useState('');
  const [errorLogs, setErrorLogs] = useState('');
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const [newRunTitle, setNewRunTitle] = useState('');
  const [newRunEnv, setNewRunEnv] = useState('staging');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [runError, setRunError] = useState<string | null>(null);

  // Fetch all runs
  const { data: runs = [], isLoading: isLoadingRuns } = useQuery({
    queryKey: ['test-runs', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const res = await api.get(`/projects/${currentProject.id}/test-runs`);
      return res.data;
    },
    enabled: !!currentProject?.id,
  });

  // Fetch active run details
  const { data: runDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['test-run', currentProject?.id, activeRunId],
    queryFn: async () => {
      if (!currentProject?.id || !activeRunId) return null;
      const res = await api.get(`/projects/${currentProject.id}/test-runs/${activeRunId}`);
      return res.data;
    },
    enabled: !!currentProject?.id && !!activeRunId,
  });

  // Fetch available test cases for creating a run
  const { data: allTestCases = [] } = useQuery({
    queryKey: ['test-cases-for-run', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const res = await api.get(`/projects/${currentProject.id}/test-cases?limit=100`);
      return res.data.items || [];
    },
    enabled: isCreatingRun && !!currentProject?.id,
  });

  // Fetch test plans for run creation
  const { data: allPlans = [] } = useQuery({
    queryKey: ['test-plans-for-run', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const res = await api.get(`/projects/${currentProject.id}/test-plans`);
      return res.data || [];
    },
    enabled: isCreatingRun && !!currentProject?.id,
  });

  // Auto select all cases when loaded
  useEffect(() => {
    if (allTestCases.length > 0 && selectedCaseIds.length === 0) {
      setSelectedCaseIds(allTestCases.map((c: any) => c.id));
    }
  }, [allTestCases]);

  // Create Run Mutation
  const createRunMutation = useMutation({
    mutationFn: async (dto: any) => {
      if (!currentProject?.id) throw new Error('Проект не выбран.');
      const res = await api.post(`/projects/${currentProject.id}/test-runs`, dto);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-runs', currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Тестовый запуск начат', `«${data.title}» готов к выполнению`);
      setIsCreatingRun(false);
      setRunError(null);
      setNewRunTitle('');
      setActiveRunId(data.id);
    },
    onError: (err: any) => {
      console.error('Failed to create test run', err);
      const msg = err.response?.data?.message || err.message;
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Не удалось создать запуск.');
      setRunError(errorMsg);
      toast.error('Ошибка создания запуска', errorMsg);
    },
  });

  // Update Result Status Mutation
  const updateResultMutation = useMutation({
    mutationFn: async ({
      resultId,
      status,
      actualResult,
      errorLogs,
    }: {
      resultId: string;
      status: string;
      actualResult?: string;
      errorLogs?: string;
    }) => {
      if (!currentProject?.id || !activeRunId) return;
      await api.patch(`/projects/${currentProject.id}/test-runs/${activeRunId}/results/${resultId}`, {
        status,
        actualResult,
        errorLogs,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['test-run', currentProject?.id, activeRunId] });
      queryClient.invalidateQueries({ queryKey: ['test-runs', currentProject?.id] });
      const statusNames: Record<string, string> = {
        PASSED: 'Пройден успешно',
        FAILED: 'Провален (Дефект)',
        SKIPPED: 'Пропущен',
        BLOCKED: 'Заблокирован',
      };
      toast.info('Статус сохранён', statusNames[vars.status] || vars.status);

      if (runDetails?.testResults) {
        const nextResult = runDetails.testResults.find(
          (r: any) => r.id !== selectedResultId && r.status === 'BLOCKED',
        );
        if (nextResult) {
          setSelectedResultId(nextResult.id);
          setActualResultNote(nextResult.actualResult || '');
          setErrorLogs(nextResult.errorLogs || '');
        }
      }
    },
    onError: () => {
      toast.error('Ошибка сохранения статуса');
    },
  });

  const selectedResult = runDetails?.testResults?.find((r: any) => r.id === selectedResultId) ||
    runDetails?.testResults?.[0];

  const handleOpenCreateModal = () => {
    setIsCreatingRun(true);
    setRunError(null);
    setNewRunTitle(`Запуск тестирования #${runs.length + 1}`);
    setSelectedCaseIds(allTestCases.map((c: any) => c.id));
    setSelectedPlanId('');
  };

  const handleStartRun = () => {
    setRunError(null);

    if (!newRunTitle.trim()) {
      setRunError('Пожалуйста, введите название тестового запуска.');
      return;
    }

    if (allTestCases.length === 0 && !selectedPlanId) {
      setRunError('В проекте отсутствуют тест-кейсы. Сначала создайте хотя бы один тест-кейс.');
      return;
    }

    if (selectedCaseIds.length === 0 && !selectedPlanId) {
      setRunError('Выберите хотя бы один тест-кейс для включения в этот запуск.');
      return;
    }

    createRunMutation.mutate({
      title: newRunTitle.trim(),
      environment: newRunEnv,
      testPlanId: selectedPlanId || undefined,
      testCaseIds: selectedCaseIds.length > 0 ? selectedCaseIds : undefined,
    });
  };

  const toggleSelectCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSetStatus = (status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED') => {
    if (!selectedResult) return;
    updateResultMutation.mutate({
      resultId: selectedResult.id,
      status,
      actualResult: actualResultNote || undefined,
      errorLogs: errorLogs || undefined,
    });
  };

  // If viewing active run execution screen
  if (activeRunId && runDetails) {
    const stats = runDetails.stats || { total: 0, passed: 0, failed: 0, blocked: 0, skipped: 0 };
    const passedPct = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    const failedPct = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;
    const skippedPct = stats.total > 0 ? (stats.skipped / stats.total) * 100 : 0;

    return (
      <div className="space-y-3.5">
        {/* Header & Linear Progress Bar */}
        <div className="bg-white dark:bg-[#0c101c] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs space-y-3 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <button
                onClick={() => setActiveRunId(null)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-1 mb-0.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Все запуски
              </button>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{runDetails.title}</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                  {runDetails.environment || 'Production'}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{stats.passed} Усп.</span>
              </div>
              <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                <XCircle className="w-3.5 h-3.5" />
                <span>{stats.failed} Пров.</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{stats.blocked} В ож.</span>
              </div>
              <div className="text-slate-800 dark:text-slate-200 font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                Успешность: {stats.passRate}
              </div>
            </div>
          </div>

          {/* Dynamic Visual Progress Bar */}
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${passedPct}%` }}
              title={`Пройдено: ${stats.passed}`}
            />
            <div
              className="bg-rose-500 transition-all duration-300"
              style={{ width: `${failedPct}%` }}
              title={`Провалено: ${stats.failed}`}
            />
            <div
              className="bg-amber-500 transition-all duration-300"
              style={{ width: `${skippedPct}%` }}
              title={`Пропущено: ${stats.skipped}`}
            />
          </div>
        </div>

        {/* Two-Column Execution Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Left Column: Test Cases List */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-2.5 space-y-1.5 max-h-[75vh] overflow-y-auto shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-0.5">
              Тест-кейсы ({runDetails.testResults?.length || 0})
            </div>

            <div className="space-y-1">
              {runDetails.testResults?.map((res: any, idx: number) => {
                const isSelected = selectedResult?.id === res.id;
                return (
                  <button
                    key={res.id}
                    onClick={() => {
                      setSelectedResultId(res.id);
                      setActualResultNote(res.actualResult || '');
                      setErrorLogs(res.errorLogs || '');
                    }}
                    className={cn(
                      'w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2.5 group',
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-700/60 shadow-2xs'
                        : 'bg-white dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40',
                    )}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {res.testCase?.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Шагов: {res.testCase?.steps?.length || 0}
                        </div>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-semibold border uppercase tracking-wider shrink-0',
                        getStatusColor(res.status),
                      )}
                    >
                      {getStatusLabel(res.status)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Execution View & Step Checklist */}
          {selectedResult ? (
            <div className="lg:col-span-7 bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-5 space-y-4 shadow-xs">
              {/* Active Test Case Header */}
              <div className="space-y-1.5 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-semibold border uppercase tracking-wider',
                      getPriorityColor(selectedResult.testCase?.priority),
                    )}
                  >
                    {getPriorityLabel(selectedResult.testCase?.priority)}
                  </span>
                  {selectedResult.testCase?.isAutomated && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30">
                      Автотест
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedResult.testCase?.title}
                </h3>
                {selectedResult.testCase?.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedResult.testCase?.description}</p>
                )}
              </div>

              {/* Preconditions */}
              {selectedResult.testCase?.preConditions && (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Предусловия:</span>
                  <span className="text-slate-600 dark:text-slate-400">{selectedResult.testCase?.preConditions}</span>
                </div>
              )}

              {/* Ordered Step Checklist */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Шаги выполнения</span>
                </div>

                <div className="space-y-1.5">
                  {selectedResult.testCase?.steps?.map((step: any, idx: number) => {
                    const isSharedStep = !!step.sharedTestCaseId || !!step.sharedTestCase;
                    const subSteps = step.sharedTestCase?.steps || [];

                    return (
                      <div
                        key={step.id || idx}
                        className={cn(
                          'p-2.5 rounded-xl border space-y-1.5 transition-all',
                          isSharedStep
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/50'
                            : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              'w-4 h-4 rounded-full font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5',
                              isSharedStep
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
                            )}
                          >
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            {isSharedStep && (
                              <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Модуль общих шагов</span>
                                {step.sharedTestCase?.title && (
                                  <span className="text-slate-500 font-normal">({step.sharedTestCase.title})</span>
                                )}
                              </div>
                            )}
                            <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                              <span className="text-slate-400 mr-1.5">Действие:</span>
                              {step.action}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="text-emerald-600 dark:text-emerald-400 mr-1 font-medium">Результат:</span>
                              {step.expectedResult}
                            </div>
                          </div>
                        </div>

                        {/* Nested sub-steps */}
                        {isSharedStep && subSteps.length > 0 && (
                          <div className="ml-6 p-2 rounded-lg bg-white dark:bg-slate-950/70 border border-indigo-100 dark:border-indigo-900/40 space-y-1 mt-1">
                            <div className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                              Вложенные шаги ({subSteps.length}):
                            </div>
                            {subSteps.map((sub: any, sIdx: number) => (
                              <div key={sub.id || sIdx} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5 py-0.5">
                                <span className="text-slate-400 font-mono text-[10px]">{sIdx + 1}.</span>
                                <div>
                                  <span className="font-medium">{sub.action}</span>
                                  <span className="text-slate-400 mx-1">&rarr;</span>
                                  <span className="text-slate-500 dark:text-slate-400">{sub.expectedResult}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actual Results & Failure Logs Form */}
              <div className="space-y-2 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Фактический результат / Заметки
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Введите наблюдения тестировщика или замечания..."
                    value={actualResultNote}
                    onChange={(e) => setActualResultNote(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Логи ошибок / Описание дефекта (в случае провала)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Стек-трейс, ссылка на баг в трекере задач..."
                    value={errorLogs}
                    onChange={(e) => setErrorLogs(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSetStatus('PASSED')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Успешно
                  </button>

                  <button
                    onClick={() => handleSetStatus('FAILED')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Провален
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSetStatus('BLOCKED')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Заблокирован
                  </button>

                  <button
                    onClick={() => handleSetStatus('SKIPPED')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Пропустить
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-7 bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-10 text-center text-slate-400 text-xs">
              Выберите тест-кейс из списка слева для выполнения
            </div>
          )}
        </div>
      </div>
    );
  }

  // Runs List View (Default)
  return (
    <div className="space-y-3.5">
      {/* Action Header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#0c101c] p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs transition-colors">
        <div>
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Тестовые запуски (Тест-раны)</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Проведение ручного тестирования и мониторинг автоматических прогонов CI/CD.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Начать новый запуск
        </button>
      </div>

      {/* Modal: Create Test Run */}
      {isCreatingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-3.5 shadow-2xl">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Начать новый запуск</h3>

            {runError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{runError}</span>
              </div>
            )}

            {allTestCases.length === 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>В проекте пока нет тест-кейсов</span>
                </div>
                <p>
                  Для проведения тестового цикла необходимо создать хотя бы один тест-кейс.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingRun(false);
                    setActiveTab('test-cases');
                  }}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 rounded text-xs font-medium transition-colors"
                >
                  Перейти к созданию тест-кейсов &rarr;
                </button>
              </div>
            )}

            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Название запуска <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="например, Регрессия Спринта 24"
                  value={newRunTitle}
                  onChange={(e) => setNewRunTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Среда окружения
                  </label>
                  <select
                    value={newRunEnv}
                    onChange={(e) => setNewRunEnv(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="staging">Staging (Стейджинг)</option>
                    <option value="production">Production (Прод)</option>
                    <option value="qa-env-1">QA Env 1 (Тест)</option>
                    <option value="dev">Development (Dev)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Тест-план (опционально)
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Все кейсы проекта</option>
                    {allPlans.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Case picker checklist */}
              {!selectedPlanId && allTestCases.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-medium">
                      Включённые кейсы ({selectedCaseIds.length} из {allTestCases.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCaseIds.length === allTestCases.length) {
                          setSelectedCaseIds([]);
                        } else {
                          setSelectedCaseIds(allTestCases.map((c: any) => c.id));
                        }
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
                    >
                      {selectedCaseIds.length === allTestCases.length ? 'Снять выбор' : 'Выбрать все'}
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    {allTestCases.map((tc: any) => {
                      const isChecked = selectedCaseIds.includes(tc.id);
                      return (
                        <div
                          key={tc.id}
                          onClick={() => toggleSelectCase(tc.id)}
                          className={`flex items-center gap-2 p-1 rounded-lg text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{tc.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreatingRun(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleStartRun}
                disabled={createRunMutation.isPending || (allTestCases.length === 0 && !selectedPlanId)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs"
              >
                {createRunMutation.isPending ? 'Запуск...' : 'Запустить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Runs Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {isLoadingRuns ? (
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <CardsSkeleton count={6} />
          </div>
        ) : runs.length === 0 ? (
          <div className="col-span-3 p-10 text-center text-slate-400 bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 text-xs">
            Запусков пока нет. Нажмите «Начать новый запуск» или загрузите результаты автотестов через вебхук.
          </div>
        ) : (
          runs.map((run: any) => {
            const stats = run.stats || { total: 0, passed: 0, failed: 0, blocked: 0, skipped: 0 };
            const passPct = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;

            return (
              <div
                key={run.id}
                onClick={() => setActiveRunId(run.id)}
                className="bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-4 hover:border-indigo-300 dark:hover:border-slate-700 transition-all cursor-pointer group shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                      {run.environment || 'Default'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                    {run.title}
                  </h3>
                </div>

                {/* Linear Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Успешность</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold font-mono">{stats.passRate}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${passPct}%` }} />
                    <div
                      className="bg-rose-500"
                      style={{
                        width: `${stats.total > 0 ? (stats.failed / stats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Stats Breakdown */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{stats.passed} Усп.</span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">{stats.failed} Пров.</span>
                    <span>{stats.blocked} В ож.</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
