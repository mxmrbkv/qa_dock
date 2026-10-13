import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, ChevronDown } from 'lucide-react';
import { useAppStore, ThemeMode } from '../../store/useAppStore';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { mode: ThemeMode; label: string; icon: React.ElementType }[] = [
    { mode: 'dark', label: 'Тёмная', icon: Moon },
    { mode: 'light', label: 'Светлая', icon: Sun },
    { mode: 'system', label: 'Системная', icon: Laptop },
  ];

  const currentOption = options.find((opt) => opt.mode === theme) || options[0];
  const CurrentIcon = currentOption.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Сменить тему оформления"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150
                   bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300
                   dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/80 shadow-sm"
      >
        <CurrentIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
        <span className="hidden sm:inline">{currentOption.label}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-36 rounded-lg border shadow-xl z-50 py-1 overflow-hidden
                        bg-white border-slate-200 text-slate-800
                        dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => {
                  setTheme(opt.mode);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-600 font-semibold dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
