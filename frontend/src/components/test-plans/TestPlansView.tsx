import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ListTodo, Layers, ChevronRight, CheckSquare, Square, Trash2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { getStatusLabel } from '../../lib/utils';

export const TestPlansView: React.FC = () => {
  const { currentProject, setActiveTestRunId } = useAppStore();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);

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

  // Fetch Available Test Cases to attach to a plan
  const { data: testCases = [] } = useQuery({
    queryKey: ['test-cases-all', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const res = await api.get(`/projects/${currentProject.id}/test-cases?limit=100`);
      return res.data.items || [];
    },
    enabled: isCreating && !!currentProject?.id,
  });

  // Create Mutation
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-plans', currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreating(false);
      setTitle('');
      setDescription('');
      setSelectedCaseIds([]);
      setPlanError(null);
    },
    onError: (err: any) => {
      console.error('Failed to create test plan', err);
      const msg = err.response?.data?.message || err.message;
      if (Array.isArray(msg)) {
        setPlanError(msg.join(', '));
      } else {
        setPlanError(msg || 'Не удалось сохранить тест-план. Проверьте соединение с сервером.');
      }
    },
  });

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
    setSelectedCaseIds([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#0d121f] p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100">Тест-планы и наборы тестов</h2>
          <p className="text-xs text-slate-400">
            Организация и группировка тест-кейсов в комплексные тестовые наборы.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Создать тест-план
        </button>
      </div>

      {/* Modal: Create Test Plan */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-slate-100">Создание нового тест-плана</h3>

            {planError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{planError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Название плана <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="например, Регрессионное тестирование Релиза 2.0"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Описание
                </label>
                <textarea
                  rows={2}
                  placeholder="Область действия и цели данного тест-плана..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Case Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Выбрать включённые тест-кейсы ({selectedCaseIds.length})</span>
                  {testCases.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCaseIds.length === testCases.length) {
                          setSelectedCaseIds([]);
                        } else {
                          setSelectedCaseIds(testCases.map((tc: any) => tc.id));
                        }
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {selectedCaseIds.length === testCases.length ? 'Снять выбор' : 'Выбрать все'}
                    </button>
                  )}
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800">
                  {testCases.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      В проекте пока нет тест-кейсов. Тест-план будет сохранён пустым, кейсы можно будет привязать позже.
                    </div>
                  ) : (
                    testCases.map((tc: any) => {
                      const isSelected = selectedCaseIds.includes(tc.id);
                      return (
                        <div
                          key={tc.id}
                          onClick={() => toggleSelectCase(tc.id)}
                          className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-600/20 text-blue-300' : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span className="truncate">{tc.title}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => createPlanMutation.mutate()}
                disabled={!title.trim() || createPlanMutation.isPending}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
              >
                {createPlanMutation.isPending ? 'Сохранение...' : 'Сохранить план'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 p-12 text-center text-slate-500">Загрузка тест-планов...</div>
        ) : plans.length === 0 ? (
          <div className="col-span-3 p-12 text-center text-slate-500 bg-[#0d121f] rounded-2xl border border-slate-800">
            В проекте пока нет тест-планов. Нажмите «Создать тест-план», чтобы объединить кейсы в наборы.
          </div>
        ) : (
          plans.map((plan: any) => (
            <div
              key={plan.id}
              className="bg-[#0d121f] rounded-2xl border border-slate-800 p-5 space-y-4 shadow-lg hover:border-slate-700 transition-all"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {getStatusLabel(plan.status)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100">{plan.title}</h3>
                {plan.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{plan.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                <span>Тест-кейсов: {plan._count?.testCases || 0}</span>
                <span>Запусков: {plan._count?.testRuns || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
