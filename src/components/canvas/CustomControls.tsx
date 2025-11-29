'use client'

import React from 'react'
import { ZoomIn, ZoomOut, Maximize2, Lock, Unlock } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import type { ReactFlowInstance } from 'reactflow'

interface CustomControlsProps {
  reactFlowInstance: ReactFlowInstance | null
  isLocked: boolean
  onToggleLock: () => void
}

export function CustomControls({
  reactFlowInstance,
  isLocked,
  onToggleLock,
}: CustomControlsProps) {
  const { isDark } = useTheme()

  const handleZoomIn = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut()
    }
  }

  const handleFitView = () => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 })
    }
  }

  return (
    <div
      className={`
        absolute bottom-4 left-4
        flex flex-col gap-1
        ${isDark ? 'bg-gray-800/50' : 'bg-white/50'} 
        backdrop-blur-sm 
        border border-white/20 
        rounded-lg
        p-1
        shadow-lg
      `}
    >
      <button
        onClick={handleZoomIn}
        className="p-2 rounded hover:bg-white/10 transition-colors"
        title="Zoom in"
      >
        <ZoomIn className="w-4 h-4 text-foreground" />
      </button>
      <button
        onClick={handleZoomOut}
        className="p-2 rounded hover:bg-white/10 transition-colors"
        title="Zoom out"
      >
        <ZoomOut className="w-4 h-4 text-foreground" />
      </button>
      <button
        onClick={handleFitView}
        className="p-2 rounded hover:bg-white/10 transition-colors"
        title="Fit view"
      >
        <Maximize2 className="w-4 h-4 text-foreground" />
      </button>
      <button
        onClick={onToggleLock}
        className={`
          p-2 rounded transition-colors
          ${isLocked
            ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300'
            : 'hover:bg-white/10'
          }
        `}
        title={isLocked ? 'Unlock workflow (allow editing)' : 'Lock workflow (prevent editing)'}
      >
        {isLocked ? (
          <Lock className="w-4 h-4" />
        ) : (
          <Unlock className="w-4 h-4 text-foreground" />
        )}
      </button>
    </div>
  )
}

