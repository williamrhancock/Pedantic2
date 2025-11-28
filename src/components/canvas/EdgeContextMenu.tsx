'use client'

import React from 'react'
import { Trash2, X } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface EdgeContextMenuProps {
  x: number
  y: number
  onDelete: () => void
  onCancel: () => void
}

export function EdgeContextMenu({ x, y, onDelete, onCancel }: EdgeContextMenuProps) {
  const { isDark } = useTheme()

  return (
    <div
      className="fixed z-50"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-8px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`
          glass-card p-2 min-w-[160px]
          border border-white/20
          shadow-xl
          rounded-lg
          ${isDark ? 'bg-gray-900/95' : 'bg-white/95'}
        `}
      >
        <button
          onClick={onDelete}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-md
            transition-all duration-200
            ${isDark 
              ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300' 
              : 'text-red-600 hover:bg-red-50 hover:text-red-700'
            }
          `}
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm font-medium">Delete</span>
        </button>
        
        <div className="h-px bg-white/10 my-1" />
        
        <button
          onClick={onCancel}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-md
            transition-all duration-200
            ${isDark 
              ? 'text-gray-400 hover:bg-gray-500/20 hover:text-gray-300' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-700'
            }
          `}
        >
          <X className="w-4 h-4" />
          <span className="text-sm font-medium">Cancel</span>
        </button>
      </div>
    </div>
  )
}
