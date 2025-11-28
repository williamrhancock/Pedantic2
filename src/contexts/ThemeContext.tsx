'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Theme = 'nebula' | 'aurora'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('nebula')

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('workflow-theme') as Theme
    if (savedTheme && (savedTheme === 'nebula' || savedTheme === 'aurora')) {
      setThemeState(savedTheme)
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('workflow-theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const toggleTheme = () => {
    const newTheme = theme === 'nebula' ? 'aurora' : 'nebula'
    setTheme(newTheme)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'nebula',
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

