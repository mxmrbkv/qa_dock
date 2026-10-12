import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  Clock,
  User,
  Plus,
  ArrowRight,
  Flame,
  ListChecks,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { cn, getPriorityColor, getStatusColor, getPriorityLabel, getStatusLabel, formatDuration } from '../../lib/utils';

export const TestRunView: React.FC = () => {
  const { currentProject, setActiveTab } = useAppStore();
  const queryClient = useQueryClient();

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
      setIsCreatingRun(false);
      setRunError(null);
      setNewRunTitle('');
      setActiveRunId(data.id);
    },
    onError: (err: any) => {
      console.error('Failed to create test run', err);
      const msg = err.response?.data?.message || err.message;
      if (Array.isArray(msg)) {
        setRunError(msg.join(', '));
      } else {
        setRunError(msg || 'Не удалось создать запуск. Проверьте данные и подключение к серверу.');
      }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-run', currentProject?.id, activeRunId] });
      queryClient.invalidateQueries({ queryKey: ['test-runs', currentProject?.id] });

      // Auto advance to next blocked test case
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
  });

  // Handle active selection
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
      <div className="space-y-4">
        {/* Header & Progress Bar */}
        <div className="bg-[#0d121f] p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <button
                onClick={() => setActiveRunId(null)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 mb-1"
              >
                &larr; Назад ко всем запускам
              </button>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2.5">
                <span>{runDetails.title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {runDetails.environment || 'Production'}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{stats.passed} Пройдено</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <XCircle className="w-4 h-4" />
                <span>{stats.failed} Провалено</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                <Clock className="w-4 h-4" />
                <span>{stats.blocked} В ожидании</span>
              </div>
              <div className="text-slate-300 font-bold px-3 py-1 bg-slate-800 rounded-lg">
                Успешность: {stats.passRate}
              </div>
            </div>
          </div>

          {/* Dynamic Visual Progress Bar */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Test Cases List */}
          <div className="lg:col-span-5 bg-[#0d121f] rounded-2xl border border-slate-800 p-3 space-y-2 max-h-[75vh] overflow-y-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              Тест-кейсы ({runDetails.testResults?.length || 0})
            </div>

            <div className="space-y-1.5">
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
                      'w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 group',
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700',
                    )}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-[11px] font-mono text-slate-500 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-blue-400">
                          {res.testCase?.title}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Шагов: {res.testCase?.steps?.length || 0}
                        </div>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider shrink-0',
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
            <div className="lg:col-span-7 bg-[#0d121f] rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
              {/* Active Test Case Header */}
              <div className="space-y-2 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider',
                      getPriorityColor(selectedResult.testCase?.priority),
                    )}
                  >
                    {getPriorityLabel(selectedResult.testCase?.priority)}
                  </span>
                  {selectedResult.testCase?.isAutomated && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      Автотест
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  {selectedResult.testCase?.title}
                </h3>
                {selectedResult.testCase?.description && (
                  <p className="text-xs text-slate-400">{selectedResult.testCase?.description}</p>
                )}
              </div>

              {/* Preconditions */}
              {selectedResult.testCase?.preConditions && (
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                  <span className="font-semibold text-slate-300 block mb-1">Предусловия:</span>
                  <span className="text-slate-400">{selectedResult.testCase?.preConditions}</span>
                </div>
              )}

              {/* Ordered Step Checklist */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-blue-400" />
                  <span>Шаги выполнения</span>
                </div>

                <div className="space-y-2">
                  {selectedResult.testCase?.steps?.map((step: any, idx: number) => {
                    const isSharedStep = !!step.sharedTestCaseId || !!step.sharedTestCase;
                    const subSteps = step.sharedTestCase?.steps || [];

                    return (
                      <div
                        key={step.id || idx}
                        className={cn(
                          'p-3 rounded-xl border space-y-2 transition-all',
                          isSharedStep
                            ? 'bg-gradient-to-r from-indigo-950/30 to-slate-900 border-indigo-500/40'
                            : 'bg-slate-900 border border-slate-800',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              'w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5',
                              isSharedStep
                                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                                : 'bg-blue-600/20 text-blue-400',
                            )}
                          >
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            {isSharedStep && (
                              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Модуль общих шагов</span>
                                {step.sharedTestCase?.title && (
                                  <span className="text-slate-400 font-normal">({step.sharedTestCase.title})</span>
                                )}
                              </div>
                            )}
                            <div className="text-xs text-slate-200 font-medium">
                              <span className="text-slate-500 mr-1.5">Действие:</span>
                              {step.action}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              <span className="text-emerald-500/80 mr-1.5 font-medium">Ожидаемый результат:</span>
                              {step.expectedResult}
                            </div>
                          </div>
                        </div>

                        {/* Nested sub-steps inside shared module */}
                        {isSharedStep && subSteps.length > 0 && (
                          <div className="ml-7 p-2.5 rounded-lg bg-slate-950/70 border border-indigo-900/40 space-y-1.5 mt-2">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                              Вложенные шаги модуля ({subSteps.length}):
                            </div>
                            {subSteps.map((sub: any, sIdx: number) => (
                              <div key={sub.id || sIdx} className="text-[11px] text-slate-300 flex items-start gap-2 py-0.5">
                                <span className="text-slate-500 font-mono text-[10px]">{sIdx + 1}.</span>
                                <div>
                                  <span className="text-slate-200 font-medium">{sub.action}</span>
                                  <span className="text-slate-500 mx-1">&rarr;</span>
                                  <span className="text-slate-400">{sub.expectedResult}</span>
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
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Фактический результат / Заметки
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Введите наблюдения тестировщика или замечания..."
                    value={actualResultNote}
                    onChange={(e) => setActualResultNote(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Логи ошибок / Описание дефекта (в случае провала)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Стек-трейс, ссылка на баг в трекере задач..."
                    value={errorLogs}
                    onChange={(e) => setErrorLogs(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono resize-none"
                  />
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSetStatus('PASSED')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Успешно
                  </button>

                  <button
                    onClick={() => handleSetStatus('FAILED')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Провален
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSetStatus('BLOCKED')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Заблокирован
                  </button>

                  <button
                    onClick={() => handleSetStatus('SKIPPED')}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Пропустить
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-7 bg-[#0d121f] rounded-2xl border border-slate-800 p-12 text-center text-slate-500">
              Выберите тест-кейс из списка слева для выполнения
            </div>
          )}
        </div>
      </div>
    );
  }

  // Runs List View (Default)
  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex items-center justify-between bg-[#0d121f] p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100">Тестовые запуски (Тест-раны)</h2>
          <p className="text-xs text-slate-400">
            Проведение ручного тестирования и мониторинг автоматических прогонов CI/CD.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Начать новый запуск
        </button>
      </div>

      {/* Modal: Create Test Run */}
      {isCreatingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-slate-100">Начать новый запуск</h3>

            {runError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{runError}</span>
              </div>
            )}

            {allTestCases.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
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
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-xs font-medium transition-colors"
                >
                  Перейти к созданию тест-кейсов &rarr;
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Название запуска <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="например, Регрессия Спринта 24"
                  value={newRunTitle}
                  onChange={(e) => setNewRunTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Среда окружения
                  </label>
                  <select
                    value={newRunEnv}
                    onChange={(e) => setNewRunEnv(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="staging">Staging (Стейджинг)</option>
                    <option value="production">Production (Прод)</option>
                    <option value="qa-env-1">QA Env 1 (Тест)</option>
                    <option value="dev">Development (Dev)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Тест-план (опционально)
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold">
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
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      {selectedCaseIds.length === allTestCases.length ? 'Снять выбор' : 'Выбрать все'}
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-900 rounded-xl border border-slate-800">
                    {allTestCases.map((tc: any) => {
                      const isChecked = selectedCaseIds.includes(tc.id);
                      return (
                        <div
                          key={tc.id}
                          onClick={() => toggleSelectCase(tc.id)}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-blue-600/20 text-blue-300' : 'text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span className="truncate">{tc.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreatingRun(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleStartRun}
                disabled={createRunMutation.isPending || (allTestCases.length === 0 && !selectedPlanId)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30"
              >
                {createRunMutation.isPending ? 'Запуск...' : 'Запустить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Runs Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoadingRuns ? (
          <div className="col-span-3 p-12 text-center text-slate-500">Загрузка тестовых запусков...</div>
        ) : runs.length === 0 ? (
          <div className="col-span-3 p-12 text-center text-slate-500 bg-[#0d121f] rounded-2xl border border-slate-800">
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
                className="bg-[#0d121f] rounded-2xl border border-slate-800 p-5 hover:border-slate-700 transition-all cursor-pointer group shadow-lg flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      {run.environment || 'Default'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                    {run.title}
                  </h3>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Успешность</span>
                    <span className="text-slate-200 font-bold">{stats.passRate}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
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
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-semibold">{stats.passed} Усп.</span>
                    <span className="text-rose-400 font-semibold">{stats.failed} Пров.</span>
                    <span className="text-slate-400">{stats.blocked} В ож.</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
