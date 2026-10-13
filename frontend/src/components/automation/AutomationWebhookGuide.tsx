import React, { useState } from 'react';
import { Terminal, Copy, Check, Webhook, Code2, FileCode } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../ui/Toast';

export const AutomationWebhookGuide: React.FC = () => {
  const { currentProject } = useAppStore();
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string, label: string = 'Текст') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Скопировано в буфер', `${label} успешно скопирован`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const projectId = currentProject?.id || 'ВАШ_ID_ПРОЕКТА';
  const webhookUrl = `${window.location.origin}/api/v1/projects/${projectId}/automation/results`;

  const curlJsonSnippet = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "CI Регрессия - Прогон #45",
    "environment": "staging",
    "results": [
      {
        "automationId": "auth.spec.ts#login-success",
        "name": "Успешная авторизация пользователя с валидными данными",
        "status": "PASSED",
        "duration": 1.15
      },
      {
        "automationId": "cart.spec.ts#empty-cart",
        "name": "Проверка отображения пустой корзины",
        "status": "FAILED",
        "duration": 2.40,
        "error": "AssertionError: Expected cart item count to be 0, received 1"
      }
    ]
  }'`;

  const curlXmlSnippet = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/xml" \\
  --data-binary @junit-report.xml`;

  const playwrightSnippet = `// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['junit', { outputFile: 'junit-results.xml' }]
  ],
});

// В шаге пайплайна CI/CD:
// npx playwright test
// curl -X POST "${webhookUrl}" -H "Content-Type: application/xml" --data-binary @junit-results.xml`;

  const pytestSnippet = `# В Pytest (генерация JUnit XML):
# pytest --junitxml=report.xml

# В шаге пайплайна CI/CD:
curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/xml" \\
  --data-binary @report.xml`;

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="bg-white dark:bg-[#0c101c] p-5 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs space-y-2 transition-colors">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
          <Webhook className="w-4 h-4" />
          <span>Вебхук интеграции с автотестами и CI/CD</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Прямая передача результатов тестов из любого фреймворка автоматизации (Playwright, Cypress, Pytest, Jest, JUnit). QA Dock сопоставляет результаты по <code className="text-indigo-600 dark:text-cyan-400 font-mono">automationId</code> или названию теста, а новые автотесты регистрирует автоматически.
        </p>

        <div className="pt-1.5">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="px-1.5 py-0.2 rounded font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800 text-[10px] font-bold">
                POST
              </span>
              <code className="text-xs text-slate-800 dark:text-slate-300 font-mono truncate">{webhookUrl}</code>
            </div>
            <button
              onClick={() => copyToClipboard(webhookUrl, 'url', 'URL вебхука')}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium transition-colors"
            >
              {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'url' ? 'Скопировано' : 'Скопировать URL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Snippet 1: JSON Payload */}
      <div className="bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0e1424] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>1. Отправка отчетов в формате JSON REST API</span>
          </div>
          <button
            onClick={() => copyToClipboard(curlJsonSnippet, 'json', 'JSON cURL пример')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {copiedKey === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'json' ? 'Скопировано' : 'Скопировать'}</span>
          </button>
        </div>
        <div className="p-3.5 bg-slate-900 border-t border-slate-800">
          <pre className="text-xs text-slate-200 font-mono overflow-x-auto whitespace-pre leading-relaxed">
            {curlJsonSnippet}
          </pre>
        </div>
      </div>

      {/* Snippet 2: JUnit XML Ingestion */}
      <div className="bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0e1424] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <FileCode className="w-3.5 h-3.5 text-emerald-500" />
            <span>2. Отправка отчетов JUnit XML (Стандарт CI/CD пайплайнов)</span>
          </div>
          <button
            onClick={() => copyToClipboard(curlXmlSnippet, 'xml', 'JUnit XML cURL пример')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {copiedKey === 'xml' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'xml' ? 'Скопировано' : 'Скопировать'}</span>
          </button>
        </div>
        <div className="p-3.5 bg-slate-900 border-t border-slate-800">
          <pre className="text-xs text-slate-200 font-mono overflow-x-auto whitespace-pre leading-relaxed">
            {curlXmlSnippet}
          </pre>
        </div>
      </div>

      {/* Snippet 3: Framework Examples (Playwright & Pytest) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-4 space-y-2.5 shadow-xs">
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-500" />
            Пример для Playwright
          </h4>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <pre className="text-[11px] text-slate-200 font-mono overflow-x-auto">
              {playwrightSnippet}
            </pre>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c101c] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-4 space-y-2.5 shadow-xs">
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-500" />
            Пример для Pytest
          </h4>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <pre className="text-[11px] text-slate-200 font-mono overflow-x-auto">
              {pytestSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
