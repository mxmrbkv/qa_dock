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
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'HIGH':
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'MEDIUM':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'LOW':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'PASSED':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'FAILED':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    case 'SKIPPED':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'BLOCKED':
      return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    case 'ACTIVE':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'DRAFT':
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    case 'DEPRECATED':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
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
    case 'RUNNING':
      return 'В процессе';
    default:
      return status || '-';
  }
}
