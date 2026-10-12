import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Bot,
  Tag as TagIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Unlink,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { SharedStepsModal, TestCaseItem } from './SharedStepsModal';

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
}

export const TestCaseEditor: React.FC<TestCaseEditorProps> = ({ onSaved }) => {
  const { currentProject, editingTestCaseId, closeEditor } = useAppStore();

  const [title, setTitle] = useState('');
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

  // Load available tags
  useEffect(() => {
    if (!currentProject?.id) return;
    api.get(`/projects/${currentProject.id}/tags`).then((res) => {
      setAvailableTags(res.data);
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

  // Step Management
  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { action: '', expectedResult: '', stepOrder: prev.length },
    ]);
  };

  const updateStep = (index: number, field: 'action' | 'expectedResult', value: string) => {
    setSteps((prev) =>
      prev.map((step, idx) =>
        idx === index ? { ...step, [field]: value } : step,
      ),
    );
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, stepOrder: idx })));
  };

  const cloneStep = (index: number) => {
    const stepToClone = steps[index];
    const newSteps = [...steps];
    newSteps.splice(index + 1, 0, {
      ...stepToClone,
      id: undefined,
      stepOrder: index + 1,
    });
    setSteps(newSteps.map((s, idx) => ({ ...s, stepOrder: idx })));
  };

  // Toggle expanded nested steps of a shared step
  const toggleSharedStepExpand = (index: number) => {
    setExpandedSharedStepIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  // Unlink/Unpack a shared step into editable plain steps
  const unpackSharedStep = (index: number) => {
    const step = steps[index];
    const subSteps = step.sharedTestCase?.steps;
    if (Array.isArray(subSteps) && subSteps.length > 0) {
      const unpacked = subSteps.map((s: any) => ({
        action: s.action,
        expectedResult: s.expectedResult,
        stepOrder: 0,
      }));
      const newSteps = [...steps];
      newSteps.splice(index, 1, ...unpacked);
      setSteps(newSteps.map((s, idx) => ({ ...s, stepOrder: idx })));
    } else {
      // Just remove the shared reference
      updateStep(index, 'action', step.action.replace('⚡ [Общие шаги] ', ''));
      setSteps((prev) =>
        prev.map((s, idx) => (idx === index ? { ...s, sharedTestCaseId: undefined, sharedTestCase: undefined } : s)),
      );
    }
  };

  // Drag-and-Drop Step Reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const reordered = [...steps];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    setSteps(reordered.map((s, idx) => ({ ...s, stepOrder: idx })));
    setDraggedIndex(targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Tags
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
        color: '#3B82F6',
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
      // As referenced shared step module
      const newStep: Step = {
        action: `⚡ [Общие шаги] ${testCase.title}`,
        expectedResult: `Все проверки кейса "${testCase.title}" пройдены успешно (${testCase.steps?.length || 0} шагов)`,
        stepOrder: steps.length,
        sharedTestCaseId: testCase.id,
        sharedTestCase: testCase,
      };
      setSteps((prev) => [...prev, newStep].map((s, idx) => ({ ...s, stepOrder: idx })));
      // Expand newly added step so QA engineer sees what's inside
      setExpandedSharedStepIndices((prev) => [...prev, steps.length]);
    }
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  // Save
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

    // Clean steps and ensure every step has non-empty action and expectedResult
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
      } else {
        await api.post(`/projects/${currentProject.id}/test-cases`, payload);
      }
      onSaved();
      closeEditor();
    } catch (err: any) {
      console.error('Failed to save test case', err);
      const msg = err.response?.data?.message;
      if (Array.isArray(msg)) {
        setSaveError(msg.join(', '));
      } else {
        setSaveError(msg || 'Не удалось сохранить тест-кейс. Проверьте соединение с сервером.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#131d36]/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                {editingTestCaseId ? 'Редакт.' : 'Новый'}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>{editingTestCaseId ? 'Редактирование тест-кейса' : 'Создание нового тест-кейса'}</span>
                  {isShared && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Общий тест-кейс
                    </span>
                  )}
                </h2>
              </div>
            </div>
            <button
              onClick={closeEditor}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Загрузка данных тест-кейса...</div>
          ) : (
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {saveError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Title & Priority Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Название тест-кейса <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="например, Проверка авторизации через Google OAuth 2.0"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Приоритет</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="LOW">🟢 Низкий</option>
                    <option value="MEDIUM">🟡 Средний</option>
                    <option value="HIGH">🟠 Высокий</option>
                    <option value="CRITICAL">🔴 Критический</option>
                  </select>
                </div>
              </div>

              {/* Status, Shared & Automation Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Жизненный цикл</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">Активный (Готов)</option>
                    <option value="DRAFT">Черновик (В работе)</option>
                    <option value="DEPRECATED">Устаревший</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* Reusable Shared Steps Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-indigo-300 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
                      <input
                        type="checkbox"
                        checked={isShared}
                        onChange={(e) => setIsShared(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0"
                      />
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Общий тест-кейс (Шаблон общих шагов)</span>
                    </label>

                    {/* Automation Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={isAutomated}
                        onChange={(e) => setIsAutomated(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0"
                      />
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Автоматизирован</span>
                    </label>
                  </div>

                  {isAutomated ? (
                    <input
                      type="text"
                      placeholder="например, tests.e2e.auth#test_google_login"
                      value={automationId}
                      onChange={(e) => setAutomationId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/40 text-xs text-cyan-300 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      Флаг «Общий тест-кейс» делает данный кейс модулем шагов, доступным для повторного использования в других кейсах проекта.
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5 text-blue-400" />
                  Теги
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5',
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700',
                        )}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.color || '#3B82F6' }}
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
                      className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-24"
                    />
                    {newTagName.trim() && (
                      <button
                        type="button"
                        onClick={handleCreateTag}
                        className="p-1 rounded-full bg-blue-600 text-white hover:bg-blue-500 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Description & Pre/Post conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Предусловия (Pre-Conditions)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSharedModalMode('preconditions');
                        setIsSharedModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      title="Выбрать готовый тест-кейс для вставки в предусловия"
                    >
                      <Sparkles className="w-3 h-3" />
                      + Вставить из готового кейса
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="например, Пользователь зарегистрирован и находится на странице входа..."
                    value={preConditions}
                    onChange={(e) => setPreConditions(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Постусловия (Post-Conditions)</label>
                  <textarea
                    rows={3}
                    placeholder="например, Создана сессионная cookie и выполнен редирект в личный кабинет..."
                    value={postConditions}
                    onChange={(e) => setPostConditions(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Dynamic Ordered Test Steps with Drag & Drop */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    Шаги тестирования ({steps.length})
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSharedModalMode('steps');
                        setIsSharedModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-semibold transition-colors"
                      title="Выбрать существующий тест-кейс и вставить его шаги"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Вставить общие шаги
                    </button>

                    <button
                      type="button"
                      onClick={addStep}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Добавить шаг
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
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
                          'p-3 rounded-xl border transition-all space-y-2 group',
                          isSharedStep
                            ? 'bg-gradient-to-r from-indigo-950/40 to-slate-900 border-indigo-500/40 shadow-sm'
                            : 'bg-slate-900/90 border-slate-800',
                          draggedIndex === index && 'opacity-40 border-blue-500 scale-[0.99]',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Drag Handle */}
                          <div
                            className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 mt-1 shrink-0"
                            title="Перетащите для изменения порядка шагов"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Step Number */}
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1',
                              isSharedStep
                                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                                : 'bg-slate-800 text-slate-300',
                            )}
                          >
                            {index + 1}
                          </div>

                          {/* Action and Expected Result Fields */}
                          <div className="flex-1 space-y-2">
                            {isSharedStep && (
                              <div className="flex items-center justify-between text-[11px] text-indigo-300">
                                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                                  <Sparkles className="w-3 h-3 text-indigo-400" />
                                  Модуль общих шагов
                                </span>

                                <div className="flex items-center gap-2">
                                  {subSteps.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleSharedStepExpand(index)}
                                      className="text-indigo-400 hover:text-indigo-200 transition-colors inline-flex items-center gap-1"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronDown className="w-3 h-3" /> Скрыть подшаги ({subSteps.length})
                                        </>
                                      ) : (
                                        <>
                                          <ChevronRight className="w-3 h-3" /> Показать подшаги ({subSteps.length})
                                        </>
                                      )}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => unpackSharedStep(index)}
                                    title="Развернуть в обычные редактируемые шаги"
                                    className="text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1 text-[10px]"
                                  >
                                    <Unlink className="w-3 h-3" /> Развернуть
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              <div>
                                <input
                                  type="text"
                                  required
                                  placeholder="Действие (например, Нажать кнопку «Войти»)"
                                  value={step.action}
                                  onChange={(e) => updateStep(index, 'action', e.target.value)}
                                  className={cn(
                                    'w-full px-3 py-2 rounded-lg border text-xs focus:outline-none transition-colors',
                                    isSharedStep
                                      ? 'bg-indigo-950/20 border-indigo-500/40 text-indigo-100 focus:border-indigo-400 font-medium'
                                      : 'bg-[#0b0f19] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500',
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
                                    'w-full px-3 py-2 rounded-lg border text-xs focus:outline-none transition-colors',
                                    isSharedStep
                                      ? 'bg-indigo-950/20 border-indigo-500/40 text-indigo-200 focus:border-indigo-400'
                                      : 'bg-[#0b0f19] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500',
                                  )}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            <button
                              type="button"
                              onClick={() => cloneStep(index)}
                              title="Дублировать шаг"
                              className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStep(index)}
                              disabled={steps.length <= 1}
                              title="Удалить шаг"
                              className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Accordion view for nested steps inside a shared step */}
                        {isSharedStep && isExpanded && subSteps.length > 0 && (
                          <div className="ml-10 p-2.5 rounded-lg bg-slate-950/80 border border-indigo-900/50 space-y-1.5 animate-in fade-in duration-150">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                              Вложенные шаги из «{step.sharedTestCase?.title || 'Общего кейса'}»:
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

              {/* Sticky Submit Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-[#0f172a]/90 backdrop-blur pb-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
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
