'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'nebula'

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg
        ${isDark 
          ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300' 
          : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-600'
        }
        transition-all duration-300
        backdrop-blur-sm
        border border-white/10
        hover:scale-105 active:scale-95
      `}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  )
}
