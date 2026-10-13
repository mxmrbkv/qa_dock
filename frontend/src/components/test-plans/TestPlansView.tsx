import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  CheckCircle2,
  Play,
  Clock,
  ChevronRight,
  X,
  Folder,
  AlertCircle,
  Copy,
  Check,
  Filter,
  Layers,
  ListChecks,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Bot,
  UserCheck,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { cn, getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel } from '../../lib/utils';
import { TableSkeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';

export const TestPlansView: React.FC = () => {
  const { currentProject, setActiveTab, setActiveTestRunId } = useAppStore();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Run state inside Drawer
  const [launchEnv, setLaunchEnv] = useState('staging');
  const [isLaunching, setIsLaunching] = useState(false);

  // Creation modal state
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  // Fetch Test Plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['test-plans', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const res = await api.get(`/projects/${currentProject.id}/test-plans`);
      return res.data;
    },
    enabled: !!currentProject?.id,
  });

  // Fetch Single Plan Details when Drawer is open
  const { data: selectedPlan, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['test-plan-detail', currentProject?.id, selectedPlanId],
    queryFn: async () => {
      if (!currentProject?.id || !selectedPlanId) return null;
      const res = await api.get(`/projects/${currentProject.id}/test-plans/${selectedPlanId}`);
      return res.data;
    },
    enabled: !!currentProject?.id && !!selectedPlanId,
  });

  // Fetch Available Test Cases to attach when creating a plan
  const { data: testCases = [] } = useQuery({
    queryKey: ['test-cases-all', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const res = await api.get(`/projects/${currentProject.id}/test-cases?limit=150`);
      return res.data.items || [];
    },
    enabled: isCreating && !!currentProject?.id,
  });

  // Create Plan Mutation
  const createPlanMutation = useMutation({
    mutationFn: async () => {
      if (!currentProject?.id) {
        throw new Error('Проект не выбран. Пожалуйста, выберите проект.');
      }
      if (!title.trim()) {
        throw new Error('Пожалуйста, введите название тест-плана.');
      }
      const res = await api.post(`/projects/${currentProject.id}/test-plans`, {
        title: title.trim(),
        description: description.trim() || undefined,
        testCaseIds: selectedCaseIds.length > 0 ? selectedCaseIds : undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-plans', currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Тест-план сохранён', `«${title.trim()}» успешно создан`);
      setIsCreating(false);
      setTitle('');
      setDescription('');
      setSelectedCaseIds([]);
      setPlanError(null);
      setSelectedPlanId(data.id); // auto-open in drawer
    },
    onError: (err: any) => {
      console.error('Failed to create test plan', err);
      const msg = err.response?.data?.message || err.message;
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Не удалось сохранить тест-план.');
      setPlanError(errorMsg);
      toast.error('Ошибка сохранения плана', errorMsg);
    },
  });

  // Quick Run Launch Mutation
  const handleLaunchPlan = async (plan: any) => {
    if (!currentProject?.id || !plan) return;
    setIsLaunching(true);
    try {
      const res = await api.post(`/projects/${currentProject.id}/test-runs`, {
        title: `${plan.title} (Запуск #${(plan._count?.testRuns || plan.testRuns?.length || 0) + 1})`,
        environment: launchEnv,
        testPlanId: plan.id,
      });
      toast.success('Тестовый запуск начат', `План «${plan.title}» запущен в среде ${launchEnv}`);
      queryClient.invalidateQueries({ queryKey: ['test-runs', currentProject.id] });
      queryClient.invalidateQueries({ queryKey: ['test-plans', currentProject.id] });
      setActiveTestRunId(res.data.id);
    } catch (err: any) {
      toast.error('Ошибка запуска прогона', err.response?.data?.message || 'Не удалось запустить тест-план');
    } finally {
      setIsLaunching(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Скопировано в буфер', 'Идентификатор тест-плана скопирован');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelectCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleOpenModal = () => {
    setIsCreating(true);
    setPlanError(null);
    setTitle('');
    setDescription('');
    setSelectedCaseIds(testCases.map((c: any) => c.id));
  };

  // Filtered plans
  const filteredPlans = plans.filter((plan: any) => {
    const matchesSearch =
      !search ||
      plan.title?.toLowerCase().includes(search.toLowerCase()) ||
      plan.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group suites for Drawer breakdown
  const planSuitesMap: { [suiteName: string]: number } = {};
  if (selectedPlan?.testCases) {
    selectedPlan.testCases.forEach((tc: any) => {
      const suiteName = tc.suite?.name || 'Без папки (Корень)';
      planSuitesMap[suiteName] = (planSuitesMap[suiteName] || 0) + 1;
    });
  }

  return (
    <div className="space-y-4">
      {/* Header Bar: Linear Minimalist with Rostelecom Corporate Accent */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#0c101c] p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7700FF] to-[#FF4F12] flex items-center justify-center text-white shadow-md shadow-[#7700FF]/25 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Тест-планы и спецификации
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold bg-[#7700FF]/10 text-[#7700FF] dark:bg-[#7700FF]/20 dark:text-[#C084FC] border border-[#7700FF]/20">
                РТК Quality Gate
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Комплексные наборы тест-кейсов для регрессионных и релизных циклов
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#7700FF] transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#7700FF]"
          >
            <option value="">Все статусы</option>
            <option value="PLANNED">Запланирован</option>
            <option value="IN_PROGRESS">В процессе</option>
            <option value="COMPLETED">Завершён</option>
          </select>

          {/* Create Button with Rostelecom Gradient */}
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#7700FF] to-[#FF4F12] hover:opacity-95 text-white rounded-lg text-xs font-semibold shadow-rt transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Создать тест-план
          </button>
        </div>
      </div>

      {/* Linear Ultra-Dense Table View */}
      <div className="bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 overflow-hidden shadow-xs transition-colors">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0e1424] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
              <th className="p-3 w-28 font-mono">Код / ID</th>
              <th className="p-3">Название и область действия</th>
              <th className="p-3 w-36">Релиз / Спринт</th>
              <th className="p-3 w-36">Прогресс готовности</th>
              <th className="p-3 w-24 text-center">Кейсов</th>
              <th className="p-3 w-24 text-center">Запусков</th>
              <th className="p-3 w-28">Статус</th>
              <th className="p-3 w-32 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-0">
                  <TableSkeleton rows={6} />
                </td>
              </tr>
            ) : filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {search || statusFilter ? 'Тест-планы по заданным фильтрам не найдены' : 'В проекте пока нет тест-планов'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Объединяйте тест-кейсы в структурированные регрессионные или спринтовые наборы для совместного запуска.
                    </p>
                    <button
                      onClick={handleOpenModal}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#7700FF] to-[#FF4F12] text-white rounded-lg text-xs font-semibold shadow-rt hover:opacity-95 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Создать первый тест-план
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPlans.map((plan: any, idx: number) => {
                const totalCases = plan._count?.testCases || 0;
                const totalRuns = plan._count?.testRuns || 0;
                const isSelected = selectedPlanId === plan.id;

                // Estimate or format execution readiness
                const progressPct = totalCases > 0 ? Math.min(100, Math.round((totalRuns > 0 ? 100 : 40))) : 0;

                return (
                  <tr
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer',
                      isSelected && 'bg-[#7700FF]/5 dark:bg-[#7700FF]/15 border-l-2 border-l-[#7700FF]',
                    )}
                  >
                    {/* Key Badge */}
                    <td className="p-3 font-mono font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-[#7700FF] dark:text-[#C084FC] font-semibold">
                        {currentProject?.key || 'TP'}-PL{idx + 1}
                      </span>
                    </td>

                    {/* Title & Description */}
                    <td className="p-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-[#7700FF] dark:group-hover:text-[#C084FC] transition-colors flex items-center gap-2">
                        <span>{plan.title}</span>
                      </div>
                      {plan.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                          {plan.description}
                        </div>
                      )}
                    </td>

                    {/* Sprint / Release Pill */}
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#7700FF]/10 text-[#7700FF] border border-[#7700FF]/25 dark:bg-[#7700FF]/20 dark:text-[#C084FC] dark:border-[#7700FF]/40">
                        <Sparkles className="w-2.5 h-2.5" />
                        Релиз 2.0
                      </span>
                    </td>

                    {/* Progress Bar with Rostelecom Gradient */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-500 dark:text-slate-400">Готовность</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#7700FF] to-[#FF4F12] rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Case Count */}
                    <td className="p-3 text-center">
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {totalCases}
                      </span>
                    </td>

                    {/* Runs Count */}
                    <td className="p-3 text-center">
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {totalRuns}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="p-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                          getStatusColor(plan.status || 'PLANNED'),
                        )}
                      >
                        {getStatusLabel(plan.status || 'PLANNED')}
                      </span>
                    </td>

                    {/* Quick Actions */}
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleLaunchPlan(plan)}
                          title="Быстрый запуск прогона"
                          className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-[#7700FF] to-[#FF4F12] text-white rounded-md text-[11px] font-semibold hover:opacity-95 shadow-xs transition-opacity cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Запуск</span>
                        </button>
                        <button
                          onClick={() => setSelectedPlanId(plan.id)}
                          title="Открыть инспектор плана"
                          className="p-1 rounded text-slate-400 hover:text-[#7700FF] hover:bg-slate-100 dark:hover:text-[#C084FC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Inspector Drawer (Right Panel) */}
      {selectedPlanId && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-2xs transition-opacity"
            onClick={() => setSelectedPlanId(null)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-xl bg-white dark:bg-[#0c101c] border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#0e1424]">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#7700FF]/15 text-[#7700FF] dark:bg-[#7700FF]/25 dark:text-[#C084FC] border border-[#7700FF]/30">
                    РТК ТЕСТ-ПЛАН
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                      getStatusColor(selectedPlan?.status || 'PLANNED'),
                    )}
                  >
                    {getStatusLabel(selectedPlan?.status || 'PLANNED')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPlanId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {selectedPlan?.title || 'Загрузка тест-плана...'}
              </h3>
              {selectedPlan?.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedPlan.description}
                </p>
              )}
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {isLoadingDetail ? (
                <div className="space-y-4">
                  <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                  <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                </div>
              ) : (
                <>
                  {/* KPI Summary Grid */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">
                        Тест-кейсов
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                        {selectedPlan?.testCases?.length || 0}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">
                        Тест-сьютов
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                        {Object.keys(planSuitesMap).length}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">
                        Запусков
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                        {selectedPlan?.testRuns?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Fast Launch Control Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-[#7700FF]/10 via-[#FF4F12]/5 to-transparent border border-[#7700FF]/30 dark:border-[#7700FF]/40 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-[#FF4F12] fill-current" />
                        Быстрый запуск прогона (РТК CI/CD)
                      </span>
                      <span className="text-[10px] text-slate-400">Готов к запуску</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={launchEnv}
                        onChange={(e) => setLaunchEnv(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#7700FF]"
                      >
                        <option value="staging">Среда: Staging</option>
                        <option value="production">Среда: Production</option>
                        <option value="qa-env-1">Среда: QA-Env 1</option>
                        <option value="dev">Среда: Development</option>
                      </select>

                      <button
                        onClick={() => handleLaunchPlan(selectedPlan)}
                        disabled={isLaunching || (selectedPlan?.testCases?.length || 0) === 0}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-[#7700FF] to-[#FF4F12] text-white rounded-lg text-xs font-semibold shadow-rt hover:opacity-95 disabled:opacity-40 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isLaunching ? 'Создание запуска...' : 'Запустить тестирование'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Test Suites Breakdown */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-[#7700FF]" />
                        Включенные тест-сьюты ({Object.keys(planSuitesMap).length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {Object.keys(planSuitesMap).length === 0 ? (
                        <div className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          В этот тест-план пока не добавлены кейсы.
                        </div>
                      ) : (
                        Object.entries(planSuitesMap).map(([suiteName, count]) => {
                          const pct = Math.round((count / (selectedPlan?.testCases?.length || 1)) * 100);
                          return (
                            <div
                              key={suiteName}
                              className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-lg space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <Folder className="w-3 h-3 text-[#FF4F12]" />
                                  {suiteName}
                                </span>
                                <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                                  {count} кейсов ({pct}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#7700FF] to-[#FF4F12] rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Included Test Cases List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="w-3.5 h-3.5 text-indigo-500" />
                        Тест-кейсы ({selectedPlan?.testCases?.length || 0})
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/40">
                      {selectedPlan?.testCases?.map((tc: any, i: number) => (
                        <div
                          key={tc.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#0c101c] border border-slate-200/70 dark:border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-mono text-[10px] text-slate-400 font-semibold shrink-0">
                              #{i + 1}
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {tc.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {tc.isAutomated ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                                <Bot className="w-2.5 h-2.5" />
                                Авто
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Ручной
                              </span>
                            )}
                            <span
                              className={cn(
                                'px-1.5 py-0.2 rounded-full text-[9px] font-semibold uppercase border',
                                getPriorityColor(tc.priority),
                              )}
                            >
                              {getPriorityLabel(tc.priority)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Previous Test Runs History */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        История тестовых прогонов ({selectedPlan?.testRuns?.length || 0})
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedPlan?.testRuns?.length === 0 ? (
                        <div className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          Этот тест-план ещё ни разу не запускался. Нажмите «Запустить тестирование» выше.
                        </div>
                      ) : (
                        selectedPlan?.testRuns?.slice(0, 5).map((run: any) => (
                          <div
                            key={run.id}
                            onClick={() => setActiveTestRunId(run.id)}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-[#7700FF]/50 transition-colors cursor-pointer group"
                          >
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#7700FF] dark:group-hover:text-[#C084FC] transition-colors">
                                {run.title}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                                <span>Среда: {run.environment || 'Default'}</span>
                                <span>•</span>
                                <span>{new Date(run.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-medium text-[#7700FF] dark:text-[#C084FC]">
                              <span>Перейти</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0e1424] flex items-center justify-between text-xs">
              <button
                onClick={() => copyToClipboard(selectedPlan?.id || '', selectedPlan?.id || '')}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                {copiedId === selectedPlan?.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === selectedPlan?.id ? 'ID скопирован' : 'Копировать ID плана'}</span>
              </button>

              <button
                onClick={() => setSelectedPlanId(null)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Закрыть инспектор
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Test Plan with Rostelecom Corporate Style */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7700FF] to-[#FF4F12] flex items-center justify-center text-white shadow-xs">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Новый тест-план
                  </h3>
                  <span className="text-[10px] text-slate-400">Ростелеком TMS Регресс-Менеджер</span>
                </div>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {planError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{planError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Название тест-плана <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="например, Регрессионное тестирование Релиза 2.4 - РТК Core"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#7700FF] transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Описание и скоуп тестирования
                </label>
                <textarea
                  rows={2}
                  placeholder="Цели тестирования, модули и критерии завершения..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#7700FF] resize-none transition-colors"
                />
              </div>

              {/* Case Picker with Search */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Выбрать тест-кейсы ({selectedCaseIds.length} из {testCases.length})</span>
                  {testCases.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseIds(testCases.map((c: any) => c.id))}
                        className="text-[#7700FF] dark:text-[#C084FC] hover:underline"
                      >
                        Выбрать все
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCaseIds([])}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline"
                      >
                        Снять все
                      </button>
                    </div>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1 bg-slate-50 dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800/40">
                  {testCases.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      В этом проекте ещё нет тест-кейсов. Создайте кейсы перед формированием плана.
                    </div>
                  ) : (
                    testCases.map((tc: any) => {
                      const isChecked = selectedCaseIds.includes(tc.id);
                      return (
                        <div
                          key={tc.id}
                          onClick={() => toggleSelectCase(tc.id)}
                          className="flex items-center gap-2.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded cursor-pointer transition-colors"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#7700FF] dark:text-[#C084FC] shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 text-xs">
                            <span className="text-slate-800 dark:text-slate-200 truncate block">
                              {tc.title}
                            </span>
                            {tc.suite && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Folder className="w-2.5 h-2.5" />
                                {tc.suite.name}
                              </span>
                            )}
                          </div>
                          <span
                            className={cn(
                              'px-1.5 py-0.2 rounded text-[9px] font-semibold border uppercase shrink-0',
                              getPriorityColor(tc.priority),
                            )}
                          >
                            {getPriorityLabel(tc.priority)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => createPlanMutation.mutate()}
                disabled={!title.trim() || createPlanMutation.isPending}
                className="px-4 py-1.5 bg-gradient-to-r from-[#7700FF] to-[#FF4F12] hover:opacity-95 text-white rounded-lg text-xs font-semibold shadow-rt disabled:opacity-50 transition-all cursor-pointer"
              >
                {createPlanMutation.isPending ? 'Сохранение...' : 'Создать тест-план'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
