import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Search,
  Sparkles,
  Layers,
  Copy,
  Link2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { cn, getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel } from '../../lib/utils';

export interface TestCaseItem {
  id: string;
  title: string;
  description?: string;
  preConditions?: string;
  postConditions?: string;
  priority: string;
  status: string;
  isAutomated: boolean;
  isShared?: boolean;
  automationId?: string;
  steps?: Array<{
    id?: string;
    action: string;
    expectedResult: string;
    stepOrder: number;
  }>;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface SharedStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentTestCaseId?: string | null;
  mode: 'preconditions' | 'steps';
  onSelectForPreconditions?: (formattedText: string, testCase: TestCaseItem) => void;
  onSelectForSteps?: (
    testCase: TestCaseItem,
    insertMode: 'clone_all_steps' | 'as_shared_step',
  ) => void;
}

export const SharedStepsModal: React.FC<SharedStepsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  currentTestCaseId,
  mode,
  onSelectForPreconditions,
  onSelectForSteps,
}) => {
  const [search, setSearch] = useState('');
  const [filterSharedOnly, setFilterSharedOnly] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TestCaseItem | null>(null);

  const { data: testCases = [], isLoading } = useQuery<TestCaseItem[]>({
    queryKey: ['test-cases-shared-picker', projectId, search, filterSharedOnly],
    queryFn: async () => {
      if (!projectId) return [];
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (filterSharedOnly) params.append('isShared', 'true');
      params.append('limit', '50');

      const res = await api.get(`/projects/${projectId}/test-cases?${params.toString()}`);
      return (res.data.items || []).filter((tc: TestCaseItem) => tc.id !== currentTestCaseId);
    },
    enabled: isOpen && !!projectId,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-slate-200/90 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0e1424] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/50 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {mode === 'preconditions'
                    ? 'Добавить тест-кейс в Предусловия'
                    : 'Вставить общие шаги из готового кейса'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Общие шаги
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {mode === 'preconditions'
                  ? 'Выберите существующий кейс, чтобы импортировать его шаги в предусловия'
                  : 'Выберите существующий кейс, чтобы использовать его как модуль шагов'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-slate-200/90 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию или ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterSharedOnly(false)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                !filterSharedOnly
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
              )}
            >
              Все кейсы
            </button>
            <button
              type="button"
              onClick={() => setFilterSharedOnly(true)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
                filterSharedOnly
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
              )}
            >
              <Sparkles className="w-3 h-3 text-indigo-300" />
              Только общие (Shared)
            </button>
          </div>
        </div>

        {/* Modal Main Content: Split View */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/90 dark:divide-slate-800/80 overflow-hidden min-h-[300px]">
          {/* Left Column: Test Cases List */}
          <div className="overflow-y-auto p-3 space-y-1.5 max-h-[440px]">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Загрузка тест-кейсов...</div>
            ) : testCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-1.5">
                <AlertCircle className="w-5 h-5 mx-auto text-slate-400" />
                <div>Тест-кейсы не найдены.</div>
              </div>
            ) : (
              testCases.map((tc) => {
                const isSelected = selectedCase?.id === tc.id;
                return (
                  <div
                    key={tc.id}
                    onClick={() => setSelectedCase(tc)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left cursor-pointer transition-all space-y-1 group',
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs dark:bg-indigo-950/30 dark:border-indigo-700/60'
                        : 'bg-white dark:bg-slate-900/50 border-slate-200/90 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-xs text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {tc.title}
                      </div>
                      {tc.isShared && (
                        <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          Общий
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className={cn('px-1.5 py-0.2 rounded border font-semibold', getPriorityColor(tc.priority))}>
                        {getPriorityLabel(tc.priority)}
                      </span>
                      <span>
                        Шагов: <strong className="text-slate-700 dark:text-slate-300">{tc.steps?.length || 0}</strong>
                      </span>
                      {tc.preConditions && (
                        <span className="text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">
                          • Есть предусловия
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Live Preview of Selected Case */}
          <div className="overflow-y-auto p-4 flex flex-col justify-between max-h-[440px] bg-slate-50/40 dark:bg-slate-900/20">
            {selectedCase ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn('px-1.5 py-0.2 rounded text-[10px] font-semibold border', getPriorityColor(selectedCase.priority))}>
                      {getPriorityLabel(selectedCase.priority)}
                    </span>
                    <span className={cn('px-1.5 py-0.2 rounded text-[10px] font-semibold border', getStatusColor(selectedCase.status))}>
                      {getStatusLabel(selectedCase.status)}
                    </span>
                    {selectedCase.isShared && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                        ⚡ Общий кейс
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{selectedCase.title}</h4>
                  {selectedCase.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{selectedCase.description}</p>
                  )}
                </div>

                {/* Preconditions in Preview */}
                {selectedCase.preConditions && (
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Предусловия:</div>
                    <div className="text-slate-800 dark:text-slate-300 whitespace-pre-wrap text-[11px]">{selectedCase.preConditions}</div>
                  </div>
                )}

                {/* Steps List in Preview */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Шаги ({selectedCase.steps?.length || 0})</span>
                  </div>

                  {(!selectedCase.steps || selectedCase.steps.length === 0) ? (
                    <div className="text-xs text-slate-400 italic p-3 bg-white dark:bg-slate-900/60 rounded-lg text-center">
                      В данном тест-кейсе нет настроенных шагов.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {selectedCase.steps.map((st, i) => (
                        <div key={st.id || i} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 text-[11px] space-y-0.5">
                          <div className="flex items-start gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div className="text-slate-800 dark:text-slate-200">
                              <span className="text-slate-400 mr-1">Действие:</span>
                              {st.action}
                            </div>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 pl-5 text-[10px]">
                            <span className="text-emerald-600 dark:text-emerald-400 mr-1 font-medium">Результат:</span>
                            {st.expectedResult}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="m-auto text-center p-6 text-slate-400 space-y-1.5">
                <Layers className="w-6 h-6 mx-auto text-slate-400" />
                <div className="text-xs">Выберите тест-кейс слева для просмотра и вставки.</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="p-3 border-t border-slate-200/90 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0c101c] flex items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Закрыть
          </button>

          {selectedCase && (
            <div className="flex items-center gap-2">
              {mode === 'preconditions' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!onSelectForPreconditions) return;
                      const text = `[Общие шаги: ${selectedCase.title}]`;
                      onSelectForPreconditions(text, selectedCase);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Как ссылку
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!onSelectForPreconditions) return;
                      const stepsText = (selectedCase.steps || [])
                        .map((s, idx) => `  ${idx + 1}. ${s.action} -> ${s.expectedResult}`)
                        .join('\n');
                      const text = `[Общие шаги: ${selectedCase.title}]\n${
                        selectedCase.preConditions ? `Предусловия: ${selectedCase.preConditions}\n` : ''
                      }${stepsText ? `Шаги:\n${stepsText}` : ''}`;
                      onSelectForPreconditions(text, selectedCase);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Вставить с шагами
                  </button>
                </>
              )}

              {mode === 'steps' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!onSelectForSteps) return;
                      onSelectForSteps(selectedCase, 'as_shared_step');
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 dark:text-indigo-300 dark:border-indigo-500/40 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Вставить как общий шаг-модуль
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!onSelectForSteps) return;
                      onSelectForSteps(selectedCase, 'clone_all_steps');
                      onClose();
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Развернуть все шаги ({selectedCase.steps?.length || 0})
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
