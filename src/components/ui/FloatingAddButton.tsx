'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface FloatingAddButtonProps {
  onClick: () => void
  label?: string
}

export function FloatingAddButton({ onClick, label = 'Add Node' }: FloatingAddButtonProps) {
  const { isDark } = useTheme()

  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6
        w-14 h-14
        rounded-full
        bg-gradient-to-br from-purple-500 to-teal-500
        text-white
        shadow-2xl
        flex items-center justify-center
        z-40
        hover:shadow-purple-500/50
        hover:scale-110
        active:scale-90
        transition-all duration-200
      `}
      aria-label={label}
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}
