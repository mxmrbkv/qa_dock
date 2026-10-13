import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Bot,
  Tag as TagIcon,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Unlink,
  AlertCircle,
  Copy,
  Layers,
  Folder,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { SharedStepsModal, TestCaseItem } from './SharedStepsModal';
import { useToast } from '../ui/Toast';

interface Step {
  id?: string;
  action: string;
  expectedResult: string;
  stepOrder: number;
  sharedTestCaseId?: string;
  sharedTestCase?: any;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TestCaseEditorProps {
  onSaved: () => void;
  defaultSuiteId?: string | null;
}

export const TestCaseEditor: React.FC<TestCaseEditorProps> = ({ onSaved, defaultSuiteId }) => {
  const { currentProject, editingTestCaseId, closeEditor } = useAppStore();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [suiteId, setSuiteId] = useState<string>(defaultSuiteId || '');
  const [availableSuites, setAvailableSuites] = useState<{ id: string; name: string }[]>([]);
  const [description, setDescription] = useState('');
  const [preConditions, setPreConditions] = useState('');
  const [postConditions, setPostConditions] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'DEPRECATED'>('ACTIVE');
  const [isAutomated, setIsAutomated] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [automationId, setAutomationId] = useState('');
  const [steps, setSteps] = useState<Step[]>([
    { action: 'Открыть целевую страницу в браузере', expectedResult: 'Страница успешно загрузилась без ошибок', stepOrder: 0 },
  ]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Shared Steps Modal state
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);
  const [sharedModalMode, setSharedModalMode] = useState<'preconditions' | 'steps'>('steps');
  const [expandedSharedStepIndices, setExpandedSharedStepIndices] = useState<number[]>([]);

  // Load available tags and suites
  useEffect(() => {
    if (!currentProject?.id) return;
    api.get(`/projects/${currentProject.id}/tags`).then((res) => {
      setAvailableTags(res.data);
    }).catch(console.error);

    api.get(`/projects/${currentProject.id}/suites`).then((res) => {
      setAvailableSuites(res.data.suites || []);
    }).catch(console.error);
  }, [currentProject?.id]);

  // Load existing test case if editing
  useEffect(() => {
    if (editingTestCaseId && currentProject?.id) {
      setIsLoading(true);
      api
        .get(`/projects/${currentProject.id}/test-cases/${editingTestCaseId}`)
        .then((res) => {
          const tc = res.data;
          setTitle(tc.title || '');
          setSuiteId(tc.suiteId || '');
          setDescription(tc.description || '');
          setPreConditions(tc.preConditions || '');
          setPostConditions(tc.postConditions || '');
          setPriority(tc.priority || 'MEDIUM');
          setStatus(tc.status || 'ACTIVE');
          setIsAutomated(tc.isAutomated || false);
          setIsShared(tc.isShared || false);
          setAutomationId(tc.automationId || '');
          setSelectedTagIds((tc.tags || []).map((t: Tag) => t.id));
          if (tc.steps && tc.steps.length > 0) {
            setSteps(tc.steps);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [editingTestCaseId, currentProject?.id]);

  // Steps actions
  const addStep = () => {
    setSteps([
      ...steps,
      { action: '', expectedResult: '', stepOrder: steps.length },
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const updated = steps.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, stepOrder: idx }));
    setSteps(updated);
  };

  const cloneStep = (index: number) => {
    const target = steps[index];
    const newStep = { ...target, id: undefined, stepOrder: index + 1 };
    const updated = [...steps];
    updated.splice(index + 1, 0, newStep);
    setSteps(updated.map((s, idx) => ({ ...s, stepOrder: idx })));
  };

  const updateStep = (index: number, field: 'action' | 'expectedResult', value: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  // Drag and drop steps reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...steps];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setSteps(updated.map((s, idx) => ({ ...s, stepOrder: idx })));
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleSharedStepExpand = (index: number) => {
    setExpandedSharedStepIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const unpackSharedStep = (index: number) => {
    const step = steps[index];
    const subSteps: Step[] = (step.sharedTestCase?.steps || []).map((s: any, idx: number) => ({
      action: s.action,
      expectedResult: s.expectedResult,
      stepOrder: index + idx,
    }));

    if (subSteps.length === 0) {
      updateStep(index, 'action', step.action.replace('⚡ [Общие шаги] ', ''));
      const updated = [...steps];
      delete updated[index].sharedTestCaseId;
      delete updated[index].sharedTestCase;
      setSteps(updated);
      return;
    }

    const updated = [...steps];
    updated.splice(index, 1, ...subSteps);
    setSteps(updated.map((s, idx) => ({ ...s, stepOrder: idx })));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !currentProject?.id) return;
    try {
      const res = await api.post(`/projects/${currentProject.id}/tags`, {
        name: newTagName.trim(),
        color: '#4F46E5',
      });
      setAvailableTags((prev) => [...prev, res.data]);
      setSelectedTagIds((prev) => [...prev, res.data.id]);
      setNewTagName('');
    } catch (err) {
      console.error('Failed to create tag', err);
    }
  };

  // Insertion handlers from SharedStepsModal
  const handlePreconditionsInsert = (formattedText: string) => {
    setPreConditions((prev) => {
      if (!prev.trim()) return formattedText;
      return `${prev.trim()}\n\n${formattedText}`;
    });
  };

  const handleStepsInsert = (
    testCase: TestCaseItem,
    insertMode: 'clone_all_steps' | 'as_shared_step',
  ) => {
    if (insertMode === 'clone_all_steps') {
      const importedSteps: Step[] = (testCase.steps || []).map((s, idx) => ({
        action: s.action,
        expectedResult: s.expectedResult,
        stepOrder: steps.length + idx,
      }));
      if (importedSteps.length === 0) {
        importedSteps.push({
          action: `[Общие шаги] ${testCase.title}`,
          expectedResult: 'Все шаги модуля выполнены успешно',
          stepOrder: steps.length,
        });
      }
      setSteps((prev) => [...prev, ...importedSteps].map((s, idx) => ({ ...s, stepOrder: idx })));
    } else {
      const newStep: Step = {
        action: `⚡ [Общие шаги] ${testCase.title}`,
        expectedResult: `Все проверки кейса "${testCase.title}" пройдены успешно (${testCase.steps?.length || 0} шагов)`,
        stepOrder: steps.length,
        sharedTestCaseId: testCase.id,
        sharedTestCase: testCase,
      };
      setSteps((prev) => [...prev, newStep].map((s, idx) => ({ ...s, stepOrder: idx })));
      setExpandedSharedStepIndices((prev) => [...prev, steps.length]);
    }
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!title.trim()) {
      setSaveError('Пожалуйста, укажите название тест-кейса.');
      return;
    }

    if (!currentProject?.id) {
      setSaveError('Ошибка: проект не выбран. Пожалуйста, выберите проект в левом меню.');
      return;
    }

    setIsSaving(true);

    const validSteps = steps
      .filter((s) => s.action.trim() || s.expectedResult.trim())
      .map((s, idx) => ({
        id: s.id,
        action: s.action.trim() || 'Выполнить шаг теста',
        expectedResult: s.expectedResult.trim() || 'Шаг выполнен успешно',
        stepOrder: idx,
        sharedTestCaseId: s.sharedTestCaseId || undefined,
      }));

    const payload = {
      title: title.trim(),
      suiteId: suiteId ? suiteId : null,
      description: description.trim() || undefined,
      preConditions: preConditions.trim() || undefined,
      postConditions: postConditions.trim() || undefined,
      priority,
      status,
      isAutomated,
      isShared,
      automationId: isAutomated && automationId.trim() ? automationId.trim() : undefined,
      tagIds: selectedTagIds,
      steps: validSteps.length > 0 ? validSteps : undefined,
    };

    try {
      if (editingTestCaseId) {
        await api.patch(
          `/projects/${currentProject.id}/test-cases/${editingTestCaseId}`,
          payload,
        );
        toast.success('Тест-кейс обновлён', `«${title.trim()}» успешно сохранён`);
      } else {
        await api.post(`/projects/${currentProject.id}/test-cases`, payload);
        toast.success('Тест-кейс создан', `«${title.trim()}» добавлен в проект`);
      }
      onSaved();
      closeEditor();
    } catch (err: any) {
      console.error('Failed to save test case', err);
      const msg = err.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Не удалось сохранить тест-кейс.');
      setSaveError(errorMsg);
      toast.error('Ошибка сохранения', errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
        <div className="bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Modal Header */}
          <div className="px-6 py-3.5 border-b border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-[#0e1424] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/50 flex items-center justify-center font-bold text-xs">
                {editingTestCaseId ? 'РЕД' : 'НОВ'}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{editingTestCaseId ? 'Редактирование тест-кейса' : 'Новый тест-кейс'}</span>
                  {isShared && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      Общий тест-кейс
                    </span>
                  )}
                </h2>
              </div>
            </div>
            <button
              onClick={closeEditor}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Загрузка данных тест-кейса...</div>
          ) : (
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
              {saveError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Title, Suite & Priority Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Название кейса <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="например, Проверка авторизации через Google OAuth 2.0"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Тест-сьют / Папка</span>
                  </label>
                  <select
                    value={suiteId}
                    onChange={(e) => setSuiteId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">Без папки (Общий список)</option>
                    {availableSuites.map((s) => (
                      <option key={s.id} value={s.id}>
                        📁 {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Приоритет</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="LOW">🟢 Низкий</option>
                    <option value="MEDIUM">🟡 Средний</option>
                    <option value="HIGH">🟠 Высокий</option>
                    <option value="CRITICAL">🔴 Критический</option>
                  </select>
                </div>
              </div>

              {/* Status, Shared & Automation Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/70 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Жизненный цикл</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ACTIVE">Активный (Готов)</option>
                    <option value="DRAFT">Черновик (В работе)</option>
                    <option value="DEPRECATED">Устаревший</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={isShared}
                        onChange={(e) => setIsShared(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      <span>Общий тест-кейс (Шаблон шагов)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={isAutomated}
                        onChange={(e) => setIsAutomated(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <Bot className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Автоматизирован</span>
                    </label>
                  </div>

                  {isAutomated ? (
                    <input
                      type="text"
                      placeholder="например, tests.e2e.auth#test_google_login"
                      value={automationId}
                      onChange={(e) => setAutomationId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-500/40 text-xs text-cyan-700 dark:text-cyan-300 font-mono placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  ) : (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Флаг «Общий тест-кейс» делает данный кейс модулем шагов, доступным для повторного использования в других кейсах проекта.
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5 text-indigo-500" />
                  Теги
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5',
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300',
                        )}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: tag.color || '#4F46E5' }}
                        />
                        {tag.name}
                      </button>
                    );
                  })}

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="+ Новый тег"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateTag();
                        }
                      }}
                      className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-24"
                    />
                    {newTagName.trim() && (
                      <button
                        type="button"
                        onClick={handleCreateTag}
                        className="p-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Description & Pre/Post conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Предусловия (Pre-Conditions)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSharedModalMode('preconditions');
                        setIsSharedModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium transition-colors"
                      title="Выбрать готовый тест-кейс для вставки в предусловия"
                    >
                      <Sparkles className="w-3 h-3" />
                      + Вставить из готового кейса
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="например, Пользователь зарегистрирован и находится на странице входа..."
                    value={preConditions}
                    onChange={(e) => setPreConditions(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Постусловия (Post-Conditions)</label>
                  <textarea
                    rows={2}
                    placeholder="например, Создана сессионная cookie и выполнен редирект в личный кабинет..."
                    value={postConditions}
                    onChange={(e) => setPostConditions(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Dynamic Ordered Test Steps with Drag & Drop */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Шаги тестирования ({steps.length})
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSharedModalMode('steps');
                        setIsSharedModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-300 dark:border-indigo-500/30 hover:bg-indigo-100 text-xs font-medium transition-colors"
                      title="Выбрать существующий тест-кейс и вставить его шаги"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                      Вставить общие шаги
                    </button>

                    <button
                      type="button"
                      onClick={addStep}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Добавить шаг
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {steps.map((step, index) => {
                    const isSharedStep = !!step.sharedTestCaseId;
                    const isExpanded = expandedSharedStepIndices.includes(index);
                    const subSteps = step.sharedTestCase?.steps || [];

                    return (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'p-2.5 rounded-xl border transition-all space-y-1.5 group',
                          isSharedStep
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40 shadow-2xs'
                            : 'bg-white dark:bg-[#0e1422] border-slate-200/90 dark:border-slate-800/80',
                          draggedIndex === index && 'opacity-40 border-indigo-500 scale-[0.99]',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 mt-1 shrink-0"
                            title="Перетащите для изменения порядка шагов"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          <div
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1',
                              isSharedStep
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                            )}
                          >
                            {index + 1}
                          </div>

                          <div className="flex-1 space-y-1.5">
                            {isSharedStep && (
                              <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300">
                                <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-[9px]">
                                  <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                                  Модуль общих шагов
                                </span>

                                <div className="flex items-center gap-2">
                                  {subSteps.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleSharedStepExpand(index)}
                                      className="text-indigo-600 dark:text-indigo-400 hover:underline transition-colors inline-flex items-center gap-0.5 text-[10px]"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronDown className="w-3 h-3" /> Скрыть ({subSteps.length})
                                        </>
                                      ) : (
                                        <>
                                          <ChevronRight className="w-3 h-3" /> Показать ({subSteps.length})
                                        </>
                                      )}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => unpackSharedStep(index)}
                                    title="Развернуть в обычные редактируемые шаги"
                                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-0.5 text-[10px]"
                                  >
                                    <Unlink className="w-3 h-3" /> Развернуть
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <input
                                  type="text"
                                  required
                                  placeholder="Действие (например, Нажать кнопку «Войти»)"
                                  value={step.action}
                                  onChange={(e) => updateStep(index, 'action', e.target.value)}
                                  className={cn(
                                    'w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none transition-colors',
                                    isSharedStep
                                      ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 font-medium'
                                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500',
                                  )}
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ожидаемый результат (например, Открыта форма входа)"
                                  value={step.expectedResult}
                                  onChange={(e) => updateStep(index, 'expectedResult', e.target.value)}
                                  className={cn(
                                    'w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none transition-colors',
                                    isSharedStep
                                      ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500',
                                  )}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0 mt-1">
                            <button
                              type="button"
                              onClick={() => cloneStep(index)}
                              title="Дублировать шаг"
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStep(index)}
                              disabled={steps.length <= 1}
                              title="Удалить шаг"
                              className="p-1 rounded text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Accordion view for nested steps */}
                        {isSharedStep && isExpanded && subSteps.length > 0 && (
                          <div className="ml-8 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                            <div className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">
                              Вложенные шаги из «{step.sharedTestCase?.title || 'Общего кейса'}»:
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

              {/* Sticky Submit Footer */}
              <div className="pt-3 border-t border-slate-200/90 dark:border-slate-800/90 flex items-center justify-end gap-2.5 sticky bottom-0 bg-white/95 dark:bg-[#0c101c]/95 backdrop-blur pb-1">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                >
                  {isSaving ? 'Сохранение...' : editingTestCaseId ? 'Сохранить изменения' : 'Создать тест-кейс'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Shared Steps Modal */}
      {currentProject?.id && (
        <SharedStepsModal
          isOpen={isSharedModalOpen}
          onClose={() => setIsSharedModalOpen(false)}
          projectId={currentProject.id}
          currentTestCaseId={editingTestCaseId}
          mode={sharedModalMode}
          onSelectForPreconditions={handlePreconditionsInsert}
          onSelectForSteps={handleStepsInsert}
        />
      )}
    </>
  );
};
