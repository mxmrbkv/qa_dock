import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Folder,
  FolderOpen,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Search,
  Inbox,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { TreeSkeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';

export interface TestSuiteItem {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  _count?: {
    testCases: number;
  };
}

interface SuiteTreeProps {
  projectId: string;
  selectedSuiteId: string | null; // null = all, 'root' = unassigned, or specific suite id
  onSelectSuite: (suiteId: string | null, suiteName?: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SuiteTree: React.FC<SuiteTreeProps> = ({
  projectId,
  selectedSuiteId,
  onSelectSuite,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingSuiteId, setEditingSuiteId] = useState<string | null>(null);
  const [suiteName, setSuiteName] = useState('');
  const [suiteDesc, setSuiteDesc] = useState('');
  const [suiteParentId, setSuiteParentId] = useState<string | null>(null);
  const [expandedSuiteIds, setExpandedSuiteIds] = useState<string[]>([]);
  const [activeMenuSuiteId, setActiveMenuSuiteId] = useState<string | null>(null);

  // Fetch Suites
  const { data, isLoading } = useQuery<{
    suites: TestSuiteItem[];
    counts: { total: number; unassigned: number };
  }>({
    queryKey: ['test-suites', projectId],
    queryFn: async () => {
      if (!projectId) return { suites: [], counts: { total: 0, unassigned: 0 } };
      const res = await api.get(`/projects/${projectId}/suites`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const suites = data?.suites || [];
  const counts = data?.counts || { total: 0, unassigned: 0 };

  // Create Suite Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string; parentId?: string | null }) => {
      return api.post(`/projects/${projectId}/suites`, payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['test-suites', projectId] });
      toast.success('Тест-сьют создан', `Папка «${res.data.name}» успешно добавлена`);
      setIsModalOpen(false);
      setSuiteName('');
      setSuiteDesc('');
      setSuiteParentId(null);
    },
    onError: (err: any) => {
      toast.error('Ошибка создания сьюта', err.response?.data?.message || err.message);
    },
  });

  // Edit Suite Mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { name: string; description?: string } }) => {
      return api.patch(`/projects/${projectId}/suites/${id}`, payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['test-suites', projectId] });
      toast.success('Сьют обновлён', `Изменения в «${res.data.name}» сохранены`);
      setIsModalOpen(false);
      setSuiteName('');
      setSuiteDesc('');
      setEditingSuiteId(null);
    },
    onError: (err: any) => {
      toast.error('Ошибка сохранения сьюта', err.response?.data?.message || err.message);
    },
  });

  // Delete Suite Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/projects/${projectId}/suites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-suites', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
      toast.success('Сьют удалён', 'Тест-кейсы перенесены в общий список');
      if (selectedSuiteId === editingSuiteId) {
        onSelectSuite(null, 'Все тест-кейсы');
      }
      setActiveMenuSuiteId(null);
    },
    onError: (err: any) => {
      toast.error('Ошибка удаления', err.response?.data?.message || err.message);
    },
  });

  const handleOpenCreate = (parentId?: string | null) => {
    setModalMode('create');
    setSuiteName('');
    setSuiteDesc('');
    setSuiteParentId(parentId || null);
    setIsModalOpen(true);
    setActiveMenuSuiteId(null);
  };

  const handleOpenEdit = (suite: TestSuiteItem) => {
    setModalMode('edit');
    setEditingSuiteId(suite.id);
    setSuiteName(suite.name);
    setSuiteDesc(suite.description || '');
    setIsModalOpen(true);
    setActiveMenuSuiteId(null);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suiteName.trim()) return;

    if (modalMode === 'create') {
      createMutation.mutate({
        name: suiteName.trim(),
        description: suiteDesc.trim() || undefined,
        parentId: suiteParentId,
      });
    } else if (editingSuiteId) {
      editMutation.mutate({
        id: editingSuiteId,
        payload: {
          name: suiteName.trim(),
          description: suiteDesc.trim() || undefined,
        },
      });
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSuiteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Filter suites by search query
  const filteredSuites = suites.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Group top-level suites and nested children
  const rootSuites = filteredSuites.filter((s) => !s.parentId);
  const getChildren = (parentId: string) =>
    filteredSuites.filter((s) => s.parentId === parentId);

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0c101c] p-2 flex flex-col items-center gap-3 shrink-0 transition-all duration-200 rounded-xl">
        <button
          onClick={onToggleCollapse}
          title="Развернуть дерево тест-сьютов"
          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Folder className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectSuite(null, 'Все тест-кейсы')}
          title={`Все кейсы (${counts.total})`}
          className={cn(
            'p-1.5 rounded-lg text-xs transition-colors',
            selectedSuiteId === null
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold'
              : 'text-slate-400 hover:text-slate-600',
          )}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0c101c] flex flex-col shrink-0 rounded-xl overflow-hidden shadow-2xs transition-colors">
      {/* Tree Header */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
          <Folder className="w-4 h-4 text-indigo-500" />
          <span>Тест-сьюты</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenCreate(null)}
            title="Создать новую папку сьюта"
            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-300 text-[11px] font-semibold transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Папка</span>
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Свернуть дерево"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input in Suites */}
      {suites.length > 4 && (
        <div className="p-2 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск папок..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-xs rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Tree Nodes List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
        {isLoading ? (
          <TreeSkeleton count={5} />
        ) : (
          <>
            {/* "All Test Cases" root node */}
            <button
              onClick={() => onSelectSuite(null, 'Все тест-кейсы')}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors group',
                selectedSuiteId === null
                  ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50',
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">Все тест-кейсы</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {counts.total}
              </span>
            </button>

            {/* "Unassigned" node */}
            <button
              onClick={() => onSelectSuite('root', 'Без папки')}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors group',
                selectedSuiteId === 'root'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50',
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Inbox className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Без папки</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {counts.unassigned}
              </span>
            </button>

            <div className="pt-1.5 pb-0.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Папки проекта
            </div>

            {/* Suites Tree List */}
            {rootSuites.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-slate-400 italic">
                {search ? 'Папки не найдены' : 'Папок пока нет. Нажмите «+ Папка», чтобы сгруппировать тесты.'}
              </div>
            ) : (
              rootSuites.map((suite) => {
                const isSelected = selectedSuiteId === suite.id;
                const children = getChildren(suite.id);
                const hasChildren = children.length > 0;
                const isExpanded = expandedSuiteIds.includes(suite.id);

                return (
                  <div key={suite.id} className="space-y-0.5">
                    {/* Suite item */}
                    <div
                      onClick={() => onSelectSuite(suite.id, suite.name)}
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors group relative',
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50',
                      )}
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(suite.id, e)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        ) : (
                          <span className="w-3" />
                        )}

                        {isSelected || isExpanded ? (
                          <FolderOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}

                        <span className="truncate">{suite.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {suite._count?.testCases || 0}
                        </span>

                        {/* Actions trigger */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuSuiteId(activeMenuSuiteId === suite.id ? null : suite.id);
                            }}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Dropdown menu for suite */}
                      {activeMenuSuiteId === suite.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-1 top-full mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 py-1"
                        >
                          <button
                            onClick={() => handleOpenCreate(suite.id)}
                            className="w-full flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Plus className="w-3 h-3" /> Подпапка
                          </button>
                          <button
                            onClick={() => handleOpenEdit(suite)}
                            className="w-full flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="w-3 h-3" /> Изменить
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Удалить папку «${suite.name}»? Тест-кейсы не удалятся, а перейдут в общий список.`)) {
                                deleteMutation.mutate(suite.id);
                              }
                            }}
                            className="w-full flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-3 h-3" /> Удалить
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Children suites */}
                    {hasChildren && isExpanded && (
                      <div className="pl-4 space-y-0.5 border-l border-slate-100 dark:border-slate-800/80 ml-2.5">
                        {children.map((child) => {
                          const isChildSelected = selectedSuiteId === child.id;
                          return (
                            <div
                              key={child.id}
                              onClick={() => onSelectSuite(child.id, `${suite.name} / ${child.name}`)}
                              className={cn(
                                'flex items-center justify-between px-2 py-1 rounded-lg cursor-pointer transition-colors group',
                                isChildSelected
                                  ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50',
                              )}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <Folder className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{child.name}</span>
                              </div>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {child._count?.testCases || 0}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Modal: Create / Edit Suite */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                {modalMode === 'create' ? 'Новая папка тест-сьюта' : 'Редактировать папку'}
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Название сьюта / папки <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="например, Авторизация или Оплата"
                  value={suiteName}
                  onChange={(e) => setSuiteName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Описание (опционально)
                </label>
                <textarea
                  rows={2}
                  placeholder="Область тестирования данного раздела..."
                  value={suiteDesc}
                  onChange={(e) => setSuiteDesc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!suiteName.trim() || createMutation.isPending || editMutation.isPending}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-2xs disabled:opacity-50"
                >
                  {createMutation.isPending || editMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
