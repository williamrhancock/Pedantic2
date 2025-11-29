'use client'

import React, { useCallback } from 'react'
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

  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn()
    }
  }, [reactFlowInstance])

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut()
    }
  }, [reactFlowInstance])

  const handleFitView = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 })
    }
  }, [reactFlowInstance])

  const handleToggleLock = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleLock()
  }, [onToggleLock])

  return (
    <div
      className={`
        absolute bottom-4 left-4
        flex flex-col gap-1
        z-50
        pointer-events-auto
        ${isDark ? 'bg-gray-800/50' : 'bg-white/50'} 
        backdrop-blur-sm 
        border border-white/20 
        rounded-lg
        p-1
        shadow-lg
      `}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleZoomIn}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
        title="Zoom in"
        type="button"
      >
        <ZoomIn className="w-4 h-4 text-foreground" />
      </button>
      <button
        onClick={handleZoomOut}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
        title="Zoom out"
        type="button"
      >
        <ZoomOut className="w-4 h-4 text-foreground" />
      </button>
      <button
        onClick={handleFitView}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
        title="Fit view"
        type="button"
      >
        <Maximize2 className="w-4 h-4 text-foreground" />
      </button>
      <button
        onClick={handleToggleLock}
        onMouseDown={(e) => e.stopPropagation()}
        className={`
          p-2 rounded transition-colors cursor-pointer
          ${isLocked
            ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300'
            : 'hover:bg-white/10'
          }
        `}
        title={isLocked ? 'Unlock workflow (allow editing)' : 'Lock workflow (prevent editing)'}
        type="button"
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

