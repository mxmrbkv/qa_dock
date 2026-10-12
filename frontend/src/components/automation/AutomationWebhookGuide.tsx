import React, { useState } from 'react';
import { Terminal, Copy, Check, Webhook, Code2, Play, FileCode, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const AutomationWebhookGuide: React.FC = () => {
  const { currentProject } = useAppStore();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
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
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-[#0d121f] p-6 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center gap-2.5 text-blue-400 font-bold text-base">
          <Webhook className="w-5 h-5" />
          <span>Вебхук интеграции с автотестами и CI/CD</span>
        </div>
        <p className="text-xs text-slate-400">
          Прямая передача результатов тестов из любого фреймворка автоматизации (Playwright, Cypress, Pytest, Jest, JUnit). QA Dock сопоставляет результаты по <code className="text-cyan-400">automationId</code> или названию теста, а новые автотесты регистрирует автоматически.
        </p>

        <div className="pt-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700/80">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                POST
              </span>
              <code className="text-xs text-slate-300 font-mono truncate">{webhookUrl}</code>
            </div>
            <button
              onClick={() => copyToClipboard(webhookUrl, 'url')}
              className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'url' ? 'Скопировано' : 'Скопировать URL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Snippet 1: JSON Payload */}
      <div className="bg-[#0d121f] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800 bg-[#121829] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Code2 className="w-4 h-4 text-blue-400" />
            <span>1. Отправка отчетов в формате JSON REST API</span>
          </div>
          <button
            onClick={() => copyToClipboard(curlJsonSnippet, 'json')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            {copiedKey === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'json' ? 'Скопировано' : 'Скопировать'}</span>
          </button>
        </div>
        <div className="p-4 bg-[#080b12]">
          <pre className="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
            {curlJsonSnippet}
          </pre>
        </div>
      </div>

      {/* Snippet 2: JUnit XML Ingestion */}
      <div className="bg-[#0d121f] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800 bg-[#121829] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>2. Отправка отчетов JUnit XML (Стандарт CI/CD пайплайнов)</span>
          </div>
          <button
            onClick={() => copyToClipboard(curlXmlSnippet, 'xml')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            {copiedKey === 'xml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'xml' ? 'Скопировано' : 'Скопировать'}</span>
          </button>
        </div>
        <div className="p-4 bg-[#080b12]">
          <pre className="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
            {curlXmlSnippet}
          </pre>
        </div>
      </div>

      {/* Snippet 3: Framework Examples (Playwright & Pytest) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0d121f] rounded-2xl border border-slate-800 p-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Пример для Playwright
          </h4>
          <div className="bg-[#080b12] p-3 rounded-xl border border-slate-800">
            <pre className="text-[11px] text-slate-300 font-mono overflow-x-auto">
              {playwrightSnippet}
            </pre>
          </div>
        </div>

        <div className="bg-[#0d121f] rounded-2xl border border-slate-800 p-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            Пример для Pytest
          </h4>
          <div className="bg-[#080b12] p-3 rounded-xl border border-slate-800">
            <pre className="text-[11px] text-slate-300 font-mono overflow-x-auto">
              {pytestSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
