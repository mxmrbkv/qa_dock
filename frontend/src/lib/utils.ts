import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '-';
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} мс`;
  return `${seconds.toFixed(2)} с`;
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30';
    case 'HIGH':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30';
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30';
    case 'LOW':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-500/30';
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'PASSED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40';
    case 'FAILED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40';
    case 'SKIPPED':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40';
    case 'PLANNED':
      return 'bg-[#7700FF]/10 text-[#7700FF] border-[#7700FF]/30 dark:bg-[#7700FF]/20 dark:text-[#C084FC] dark:border-[#7700FF]/40';
    case 'IN_PROGRESS':
      return 'bg-[#FF4F12]/10 text-[#FF4F12] border-[#FF4F12]/30 dark:bg-[#FF4F12]/20 dark:text-[#FF8A65] dark:border-[#FF4F12]/40';
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40';
    case 'ACTIVE':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40';
    case 'DRAFT':
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30';
    case 'DEPRECATED':
      return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/40';
  }
}

export function getPriorityLabel(priority?: string): string {
  switch (priority) {
    case 'CRITICAL':
      return 'Критический';
    case 'HIGH':
      return 'Высокий';
    case 'MEDIUM':
      return 'Средний';
    case 'LOW':
      return 'Низкий';
    default:
      return priority || 'Не указан';
  }
}

export function getStatusLabel(status?: string): string {
  switch (status) {
    case 'PASSED':
      return 'Пройден';
    case 'FAILED':
      return 'Провален';
    case 'SKIPPED':
      return 'Пропущен';
    case 'BLOCKED':
      return 'Заблокирован';
    case 'ACTIVE':
      return 'Активный';
    case 'DRAFT':
      return 'Черновик';
    case 'DEPRECATED':
      return 'Устаревший';
    case 'COMPLETED':
      return 'Завершён';
    case 'PLANNED':
      return 'Запланирован';
    case 'IN_PROGRESS':
      return 'В процессе';
    case 'RUNNING':
      return 'Выполняется';
    default:
      return status || '-';
  }
}
