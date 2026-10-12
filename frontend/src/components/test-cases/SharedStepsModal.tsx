import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  Tag as TagIcon,
  Bot,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#131d36]/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>
                  {mode === 'preconditions'
                    ? 'Добавить тест-кейс в Предусловия'
                    : 'Вставить общие шаги из готового тест-кейса'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  Общие шаги (Shared Steps)
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {mode === 'preconditions'
                  ? 'Выберите существующий кейс, чтобы импортировать его шаги или описание в предусловия'
                  : 'Выберите существующий кейс, чтобы использовать его шаги в качестве общего модуля'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск по названию или ID кейса..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterSharedOnly(false)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                !filterSharedOnly
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200',
              )}
            >
              Все кейсы
            </button>
            <button
              type="button"
              onClick={() => setFilterSharedOnly(true)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                filterSharedOnly
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200',
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Только общие (Shared)
            </button>
          </div>
        </div>

        {/* Modal Main Content: Split View (List + Preview) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden min-h-[320px]">
          {/* Left Column: Test Cases List */}
          <div className="overflow-y-auto p-3 space-y-2 max-h-[460px]">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Загрузка тест-кейсов...</div>
            ) : testCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto text-slate-600" />
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
                      'p-3 rounded-xl border text-left cursor-pointer transition-all space-y-1.5 group',
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-xs text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {tc.title}
                      </div>
                      {tc.isShared && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          Общий
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                      <span className={cn('px-1.5 py-0.2 rounded border font-semibold', getPriorityColor(tc.priority))}>
                        {getPriorityLabel(tc.priority)}
                      </span>
                      <span className="text-slate-400">
                        Шагов: <strong className="text-slate-300">{tc.steps?.length || 0}</strong>
                      </span>
                      {tc.preConditions && (
                        <span className="text-cyan-400/80 truncate max-w-[140px]">
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
          <div className="overflow-y-auto p-4 flex flex-col justify-between max-h-[460px] bg-slate-900/30">
            {selectedCase ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border', getPriorityColor(selectedCase.priority))}>
                      {getPriorityLabel(selectedCase.priority)}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium border', getStatusColor(selectedCase.status))}>
                      {getStatusLabel(selectedCase.status)}
                    </span>
                    {selectedCase.isShared && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        ⚡ Общий кейс
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">{selectedCase.title}</h4>
                  {selectedCase.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{selectedCase.description}</p>
                  )}
                </div>

                {/* Preconditions in Preview */}
                {selectedCase.preConditions && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <div className="text-[11px] font-semibold text-slate-400 mb-0.5">Предусловия:</div>
                    <div className="text-slate-300 whitespace-pre-wrap text-[11px]">{selectedCase.preConditions}</div>
                  </div>
                )}

                {/* Steps List in Preview */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Шаги проверки ({selectedCase.steps?.length || 0})</span>
                  </div>

                  {(!selectedCase.steps || selectedCase.steps.length === 0) ? (
                    <div className="text-xs text-slate-500 italic p-3 bg-slate-900/60 rounded-lg text-center">
                      В данном тест-кейсе нет настроенных шагов.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedCase.steps.map((st, i) => (
                        <div key={st.id || i} className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[11px] space-y-1">
                          <div className="flex items-start gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div className="text-slate-200">
                              <span className="text-slate-500 mr-1">Действие:</span>
                              {st.action}
                            </div>
                          </div>
                          <div className="text-slate-400 pl-5.5 text-[10px]">
                            <span className="text-emerald-500/80 mr-1 font-medium">Ожидаемый рез-т:</span>
                            {st.expectedResult}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="m-auto text-center p-8 text-slate-500 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-600" />
                <div className="text-xs">Выберите тест-кейс слева для предварительного просмотра и вставки.</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
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
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Вставить как ссылку
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
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Вставить с шагами в предусловия
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
                    className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
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
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
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
