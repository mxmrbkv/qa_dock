import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Tag as TagIcon,
  Bot,
  UserCheck,
  CheckSquare,
  Square,
  ArrowUpDown,
  MoreHorizontal,
  FileEdit,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { cn, getPriorityColor, getStatusColor, getPriorityLabel, getStatusLabel } from '../../lib/utils';

export const TestCaseGrid: React.FC = () => {
  const { currentProject, openEditor } = useAppStore();
  const queryClient = useQueryClient();

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

  // Fetch Test Cases
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      'test-cases',
      currentProject?.id,
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
    mutationFn: async (payload: { action: string; priority?: string; status?: string; tagId?: string }) => {
      if (!currentProject?.id) return;
      await api.post(`/projects/${currentProject.id}/test-cases/bulk`, {
        caseIds: selectedIds,
        ...payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', currentProject?.id] });
      setSelectedIds([]);
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
    <div className="space-y-4">
      {/* Action Bar & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0d121f] p-4 rounded-xl border border-slate-800">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Поиск тест-кейсов по названию, коду или описанию..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
            className="px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
            className="px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
            className="px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
            className="px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
              'px-2.5 py-2 rounded-lg text-xs focus:outline-none transition-colors border',
              sharedFilter === 'true'
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-semibold'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 focus:border-blue-500',
            )}
          >
            <option value="">Все кейсы</option>
            <option value="true">⚡ Только общие шаги</option>
          </select>

          {/* Create Button */}
          <button
            onClick={() => openEditor(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all ml-auto"
          >
            <Plus className="w-4 h-4" />
            Новый тест-кейс
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-950/40 border border-blue-800/80 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs text-blue-300 font-medium">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span>Выбрано тест-кейсов: {selectedIds.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkPriority}
              onChange={(e) => {
                if (e.target.value) {
                  bulkMutation.mutate({ action: 'SET_PRIORITY', priority: e.target.value });
                  setBulkPriority('');
                }
              }}
              className="px-2.5 py-1.5 bg-slate-900 border border-blue-700/60 rounded-lg text-xs text-blue-200"
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
              className="px-2.5 py-1.5 bg-slate-900 border border-blue-700/60 rounded-lg text-xs text-blue-200"
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
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 rounded-lg text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Удалить выбранные
            </button>
          </div>
        </div>
      )}

      {/* Test Cases Data Table */}
      <div className="bg-[#0d121f] rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#121829] text-slate-400 uppercase tracking-wider font-semibold">
              <th className="p-3.5 w-10 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-slate-400 hover:text-slate-200"
                >
                  {items.length > 0 && selectedIds.length === items.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="p-3.5 w-24">Код / ID</th>
              <th className="p-3.5">Название и шаги</th>
              <th className="p-3.5 w-28">Приоритет</th>
              <th className="p-3.5 w-28">Статус</th>
              <th className="p-3.5 w-32">Тип</th>
              <th className="p-3.5 w-44">Теги</th>
              <th className="p-3.5 w-20 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  Загрузка тест-кейсов...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  В этом проекте ещё нет тест-кейсов. Нажмите «+ Новый тест-кейс», чтобы создать первый кейс.
                </td>
              </tr>
            ) : (
              items.map((tc: any, idx: number) => {
                const isSelected = selectedIds.includes(tc.id);
                return (
                  <tr
                    key={tc.id}
                    className={cn(
                      'hover:bg-slate-800/40 transition-colors group cursor-pointer',
                      isSelected && 'bg-blue-600/10',
                    )}
                    onClick={() => openEditor(tc.id)}
                  >
                    {/* Checkbox */}
                    <td
                      className="p-3.5 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectOne(tc.id);
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                      )}
                    </td>

                    {/* ID Badge */}
                    <td className="p-3.5 font-mono font-medium text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-blue-400 font-semibold">
                        {currentProject?.key}-{idx + 1 + (page - 1) * 15}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                          {tc.title}
                        </span>
                        {tc.isShared && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 shrink-0">
                            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                            Общие шаги
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 flex-wrap">
                        <span>Шагов: {tc.steps?.length || 0}</span>
                        {tc.steps?.some((s: any) => s.sharedTestCaseId) && (
                          <span className="text-indigo-400/90 font-medium flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            Содержит общие шаги
                          </span>
                        )}
                        {tc.automationId && (
                          <span className="text-cyan-400/80 font-mono truncate max-w-xs">
                            {tc.automationId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Priority Badge */}
                    <td className="p-3.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider',
                          getPriorityColor(tc.priority),
                        )}
                      >
                        {getPriorityLabel(tc.priority)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5">
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
                    <td className="p-3.5">
                      {tc.isAutomated ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-medium">
                          <Bot className="w-3 h-3" />
                          <span>Автотест</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px] font-medium">
                          <UserCheck className="w-3 h-3" />
                          <span>Ручной</span>
                        </div>
                      )}
                    </td>

                    {/* Tags */}
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {tc.tags?.map((tag: any) => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-slate-700 bg-slate-900 text-slate-300 flex items-center gap-1"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: tag.color || '#3B82F6' }}
                            />
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditor(tc.id)}
                          title="Редактировать"
                          className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
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
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-[#121829] flex items-center justify-between text-xs text-slate-400">
          <div>
            Показано <span className="text-slate-200 font-semibold">{items.length}</span> из{' '}
            <span className="text-slate-200 font-semibold">{pagination.total}</span> тест-кейсов
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:hover:border-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Страница <span className="text-slate-200 font-semibold">{page}</span> из{' '}
              <span className="text-slate-200 font-semibold">{pagination.totalPages || 1}</span>
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:hover:border-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
