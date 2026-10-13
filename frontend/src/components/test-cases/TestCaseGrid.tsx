import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Trash2,
  Tag as TagIcon,
  Bot,
  UserCheck,
  CheckSquare,
  Square,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Folder,
  FolderTree,
  ArrowRight,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { cn, getPriorityColor, getStatusColor, getPriorityLabel, getStatusLabel } from '../../lib/utils';
import { SuiteTree } from './SuiteTree';
import { TableSkeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';

export const TestCaseGrid: React.FC = () => {
  const { currentProject, openEditor, selectedSuiteId, setSelectedSuiteId } = useAppStore();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Suite Tree state
  const [selectedSuiteName, setSelectedSuiteName] = useState('Все тест-кейсы');
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [automationFilter, setAutomationFilter] = useState('');
  const [sharedFilter, setSharedFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkSuiteId, setBulkSuiteId] = useState('');

  // Fetch Tags for filter dropdown
  const { data: tags = [] } = useQuery({
    queryKey: ['tags', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const res = await api.get(`/projects/${currentProject.id}/tags`);
      return res.data;
    },
    enabled: !!currentProject?.id,
  });

  // Fetch Suites for Bulk Move dropdown
  const { data: suitesData } = useQuery({
    queryKey: ['test-suites', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return { suites: [] };
      const res = await api.get(`/projects/${currentProject.id}/suites`);
      return res.data;
    },
    enabled: !!currentProject?.id,
  });
  const availableSuites = suitesData?.suites || [];

  // Fetch Test Cases
  const { data, isLoading } = useQuery({
    queryKey: [
      'test-cases',
      currentProject?.id,
      selectedSuiteId,
      search,
      priorityFilter,
      statusFilter,
      automationFilter,
      sharedFilter,
      tagFilter,
      page,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      if (!currentProject?.id) return { items: [], pagination: { total: 0, totalPages: 1 } };
      const params = new URLSearchParams();
      if (selectedSuiteId) {
        params.append('suiteId', selectedSuiteId);
      }
      if (search) params.append('search', search);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (automationFilter) params.append('isAutomated', automationFilter);
      if (sharedFilter) params.append('isShared', sharedFilter);
      if (tagFilter) params.append('tagId', tagFilter);
      params.append('page', page.toString());
      params.append('limit', '15');
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const res = await api.get(`/projects/${currentProject.id}/test-cases?${params.toString()}`);
      return res.data;
    },
    enabled: !!currentProject?.id,
  });

  // Bulk Action Mutation
  const bulkMutation = useMutation({
    mutationFn: async (payload: { action: string; priority?: string; status?: string; tagId?: string; suiteId?: string | null }) => {
      if (!currentProject?.id) return;
      await api.post(`/projects/${currentProject.id}/test-cases/bulk`, {
        caseIds: selectedIds,
        ...payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['test-suites', currentProject?.id] });
      toast.success('Групповое действие выполнено', `Успешно обновлено тест-кейсов: ${selectedIds.length}`);
      setSelectedIds([]);
    },
    onError: (err: any) => {
      toast.error('Ошибка группового действия', err.response?.data?.message || 'Не удалось применить действие');
    },
  });

  // Single Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!currentProject?.id) return;
      await api.delete(`/projects/${currentProject.id}/test-cases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['test-suites', currentProject?.id] });
      toast.success('Тест-кейс удалён', 'Кейс был успешно удалён из проекта');
    },
    onError: (err: any) => {
      toast.error('Ошибка удаления', err.response?.data?.message || 'Не удалось удалить тест-кейс');
    },
  });

  // Toggle selection
  const toggleSelectAll = () => {
    if (!data?.items) return;
    if (selectedIds.length === data.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.items.map((i: any) => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const items = data?.items || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1, page: 1 };

  return (
    <div className="flex flex-col lg:flex-row items-start gap-4">
      {/* Suite Hierarchy Tree Sidebar */}
      {currentProject?.id && (
        <div
          className={cn(
            'transition-all duration-200 shrink-0 w-full',
            isTreeCollapsed ? 'lg:w-12' : 'lg:w-72 xl:w-80',
          )}
        >
          <SuiteTree
            projectId={currentProject.id}
            selectedSuiteId={selectedSuiteId}
            onSelectSuite={(id, name) => {
              setSelectedSuiteId(id);
              setSelectedSuiteName(name || 'Все тест-кейсы');
              setPage(1);
            }}
            isCollapsed={isTreeCollapsed}
            onToggleCollapse={() => setIsTreeCollapsed(!isTreeCollapsed)}
          />
        </div>
      )}

      {/* Main Table / Grid View */}
      <div className="flex-1 min-w-0 w-full space-y-3.5">
        {/* Suite Breadcrumb & Filter Bar Header */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-2 flex-wrap text-slate-500 dark:text-slate-400">
            <FolderTree className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Раздел:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
              {selectedSuiteName}
            </span>
            {selectedSuiteId && (
              <button
                onClick={() => {
                  setSelectedSuiteId(null);
                  setSelectedSuiteName('Все тест-кейсы');
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors ml-1"
                title="Показать все тест-кейсы"
              >
                <X className="w-3 h-3" />
                Сбросить фильтр
              </button>
            )}
          </div>
        </div>

        {/* Linear Action Bar & Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#0c101c] p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs transition-colors">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию, коду или описанию..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Filter Selects */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Все приоритеты</option>
              <option value="CRITICAL">Критический</option>
              <option value="HIGH">Высокий</option>
              <option value="MEDIUM">Средний</option>
              <option value="LOW">Низкий</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Все статусы</option>
              <option value="ACTIVE">Активный</option>
              <option value="DRAFT">Черновик</option>
              <option value="DEPRECATED">Устаревший</option>
            </select>

            {/* Automation */}
            <select
              value={automationFilter}
              onChange={(e) => {
                setAutomationFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Все типы</option>
              <option value="true">Автотесты</option>
              <option value="false">Только ручные</option>
            </select>

            {/* Tags */}
            <select
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Все теги</option>
              {tags.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Shared Steps filter */}
            <select
              value={sharedFilter}
              onChange={(e) => {
                setSharedFilter(e.target.value);
                setPage(1);
              }}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs focus:outline-none transition-colors border',
                sharedFilter === 'true'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold dark:bg-indigo-950/40 dark:border-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:border-indigo-500',
              )}
            >
              <option value="">Все кейсы</option>
              <option value="true">⚡ Только общие шаги</option>
            </select>

            {/* Create Button */}
            <button
              onClick={() => openEditor(null)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all ml-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {selectedSuiteId && selectedSuiteId !== 'root' ? 'Кейс в эту папку' : 'Новый тест-кейс'}
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-indigo-800 dark:text-indigo-300 font-medium">
              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Выбрано кейсов: {selectedIds.length}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Move to Suite Bulk Action */}
              <select
                value={bulkSuiteId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    bulkMutation.mutate({
                      action: 'SET_SUITE',
                      suiteId: val === '__none__' ? null : val,
                    });
                    setBulkSuiteId('');
                  }
                }}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700/60 rounded-lg text-xs text-indigo-900 dark:text-indigo-200"
              >
                <option value="">📁 Переместить в сьют / папку...</option>
                <option value="__none__">🚫 Без папки (В корень)</option>
                {availableSuites.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    📁 {s.name}
                  </option>
                ))}
              </select>

              <select
                value={bulkPriority}
                onChange={(e) => {
                  if (e.target.value) {
                    bulkMutation.mutate({ action: 'SET_PRIORITY', priority: e.target.value });
                    setBulkPriority('');
                  }
                }}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700/60 rounded-lg text-xs text-indigo-900 dark:text-indigo-200"
              >
                <option value="">Задать приоритет...</option>
                <option value="CRITICAL">Критический</option>
                <option value="HIGH">Высокий</option>
                <option value="MEDIUM">Средний</option>
                <option value="LOW">Низкий</option>
              </select>

              <select
                value={bulkStatus}
                onChange={(e) => {
                  if (e.target.value) {
                    bulkMutation.mutate({ action: 'SET_STATUS', status: e.target.value });
                    setBulkStatus('');
                  }
                }}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700/60 rounded-lg text-xs text-indigo-900 dark:text-indigo-200"
              >
                <option value="">Задать статус...</option>
                <option value="ACTIVE">Активный</option>
                <option value="DRAFT">Черновик</option>
                <option value="DEPRECATED">Устаревший</option>
              </select>

              <button
                onClick={() => {
                  if (confirm(`Вы уверены, что хотите удалить ${selectedIds.length} выбранных тест-кейсов?`)) {
                    bulkMutation.mutate({ action: 'DELETE' });
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Удалить выбранные
              </button>
            </div>
          </div>
        )}

        {/* Linear Minimalist Data Table */}
        <div className="bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 overflow-hidden shadow-xs transition-colors">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0e1424] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                <th className="p-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {items.length > 0 && selectedIds.length === items.length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3 w-28">Код / ID</th>
                <th className="p-3">Название и шаги</th>
                <th className="p-3 w-32">Сьют / Папка</th>
                <th className="p-3 w-28">Приоритет</th>
                <th className="p-3 w-28">Статус</th>
                <th className="p-3 w-28">Тип</th>
                <th className="p-3 w-36">Теги</th>
                <th className="p-3 w-20 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <TableSkeleton rows={8} />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderTree className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-600 dark:text-slate-300">В этом разделе нет тест-кейсов</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {selectedSuiteId
                          ? `В папке «${selectedSuiteName}» пока нет кейсов. Нажмите «Кейс в эту папку», чтобы создать первый.`
                          : 'В этом проекте ещё нет тест-кейсов. Нажмите «+ Новый тест-кейс», чтобы создать первый кейс.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((tc: any, idx: number) => {
                  const isSelected = selectedIds.includes(tc.id);
                  return (
                    <tr
                      key={tc.id}
                      className={cn(
                        'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer',
                        isSelected && 'bg-indigo-50/60 dark:bg-indigo-950/20',
                      )}
                      onClick={() => openEditor(tc.id)}
                    >
                      {/* Checkbox */}
                      <td
                        className="p-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectOne(tc.id);
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500" />
                        )}
                      </td>

                      {/* ID Badge */}
                      <td className="p-3 font-mono font-medium">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-indigo-400 font-semibold">
                          {currentProject?.key}-{idx + 1 + (page - 1) * 15}
                        </span>
                      </td>

                      {/* Title & Details */}
                      <td className="p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {tc.title}
                          </span>
                          {tc.isShared && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 flex items-center gap-1 shrink-0">
                              <Sparkles className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
                              Общие шаги
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5 flex-wrap">
                          <span>Шагов: {tc.steps?.length || 0}</span>
                          {tc.steps?.some((s: any) => s.sharedTestCaseId) && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Содержит общие шаги
                            </span>
                          )}
                          {tc.automationId && (
                            <span className="text-cyan-600 dark:text-cyan-400 font-mono truncate max-w-xs">
                              {tc.automationId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Suite Folder */}
                      <td className="p-3">
                        {tc.suite ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSuiteId(tc.suite.id);
                              setSelectedSuiteName(tc.suite.name);
                              setPage(1);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 hover:border-amber-400 transition-colors max-w-[130px] truncate"
                            title={`Фильтровать по папке «${tc.suite.name}»`}
                          >
                            <Folder className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate">{tc.suite.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-[11px] italic">Без папки</span>
                        )}
                      </td>

                      {/* Priority Badge */}
                      <td className="p-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider',
                            getPriorityColor(tc.priority),
                          )}
                        >
                          {getPriorityLabel(tc.priority)}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                            getStatusColor(tc.status),
                          )}
                        >
                          {getStatusLabel(tc.status)}
                        </span>
                      </td>

                      {/* Automation Type */}
                      <td className="p-3">
                        {tc.isAutomated ? (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-400 text-[11px] font-medium">
                            <Bot className="w-3 h-3" />
                            <span>Автотест</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 text-[11px] font-medium">
                            <UserCheck className="w-3 h-3" />
                            <span>Ручной</span>
                          </div>
                        )}
                      </td>

                      {/* Tags */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {tc.tags?.map((tag: any) => (
                            <span
                              key={tag.id}
                              className="px-1.5 py-0.2 rounded-full text-[10px] font-medium border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 flex items-center gap-1"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: tag.color || '#4F46E5' }}
                              />
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditor(tc.id)}
                            title="Редактировать"
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:text-indigo-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Удалить тест-кейс «${tc.title}»?`)) {
                                deleteMutation.mutate(tc.id);
                              }
                            }}
                            title="Удалить"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Linear Pagination Footer */}
          <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0e1424] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              Показано <span className="text-slate-900 dark:text-slate-200 font-semibold">{items.length}</span> из{' '}
              <span className="text-slate-900 dark:text-slate-200 font-semibold">{pagination.total}</span> тест-кейсов
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>
                Страница <span className="text-slate-900 dark:text-slate-200 font-semibold">{page}</span> из{' '}
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{pagination.totalPages || 1}</span>
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
