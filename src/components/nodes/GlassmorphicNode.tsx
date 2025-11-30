'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Code2, 
  Globe, 
  FileText, 
  GitBranch, 
  Database, 
  Sparkles,
  Play,
  Square,
  Repeat,
  RotateCcw,
  BookOpen,
  FileCode,
  Layers,
  Braces
} from 'lucide-react'

export type NodeType = 'start' | 'end' | 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm' | 'foreach' | 'endloop' | 'markdown' | 'html' | 'json' | 'embedding'

interface GlassmorphicNodeProps {
  id: string
  type: NodeType
  title: string
  isSelected?: boolean
  isExecuting?: boolean
  executionStatus?: 'success' | 'error' | 'running'
  onClick?: () => void
  data?: {
    description?: string
    code?: string
    config?: any
    skipDuringExecution?: boolean
  }
}

const nodeIcons = {
  start: Play,
  end: Square,
  python: Code2,
  typescript: Code2,
  http: Globe,
  file: FileText,
  condition: GitBranch,
  database: Database,
  llm: Sparkles,
  embedding: Layers,
  foreach: Repeat,
  endloop: RotateCcw,
  markdown: BookOpen,
  html: FileCode,
  json: Braces,
}

const nodeColors = {
  start: 'from-green-500 to-emerald-600',
  end: 'from-red-500 to-rose-600',
  python: 'from-blue-500 to-blue-600',
  typescript: 'from-cyan-500 to-cyan-600',
  http: 'from-purple-500 to-purple-600',
  file: 'from-yellow-500 to-amber-600',
  condition: 'from-orange-500 to-orange-600',
  database: 'from-green-600 to-emerald-700',
  llm: 'from-pink-500 to-rose-600',
  embedding: 'from-amber-500 to-amber-600',
  foreach: 'from-indigo-500 to-indigo-600',
  endloop: 'from-red-500 to-red-600',
  markdown: 'from-violet-500 to-violet-600',
  html: 'from-teal-500 to-teal-600',
  json: 'from-slate-500 to-slate-600',
}

export const GlassmorphicNode = React.memo(function GlassmorphicNode({
  id,
  type,
  title,
  isSelected = false,
  isExecuting = false,
  executionStatus,
  onClick,
  data,
}: GlassmorphicNodeProps) {
  const { isDark } = useTheme()
  const Icon = nodeIcons[type]
  const colorClass = nodeColors[type]
  
  // Dynamically import React Flow components to avoid SSR issues
  const [reactFlowComponents, setReactFlowComponents] = useState<{
    Handle: any
    Position: any
  } | null>(null)

  useEffect(() => {
    import('reactflow').then((mod) => {
      setReactFlowComponents({
        Handle: mod.Handle,
        Position: mod.Position,
      })
    })
  }, [])

  const getStatusColor = () => {
    if (executionStatus === 'success') return 'border-green-500'
    if (executionStatus === 'error') return 'border-red-500'
    if (executionStatus === 'running' || isExecuting) return 'border-purple-500'
    return 'border-white/20'
  }

  // Start nodes only have output, End nodes only have input
  const showInput = type !== 'start'
  const showOutput = type !== 'end'
  
  const Handle = reactFlowComponents?.Handle
  const Position = reactFlowComponents?.Position

  return (
    <div
      className={`
        glass-card
        min-w-[280px] max-w-[320px]
        p-4
        cursor-pointer
        relative
        transition-all duration-200
        hover:scale-[1.02] hover:-translate-y-0.5
        ${isSelected ? 'ring-2 ring-purple-500/50' : ''}
        ${isExecuting || executionStatus === 'running' ? 'glass-card-executing' : ''}
        ${getStatusColor()}
      `}
    >
      {/* Input Handle (left side) */}
      {showInput && Handle && Position && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="!bg-purple-500 !border-2 !border-white !w-3 !h-3"
        />
      )}
      
      {/* Output Handle (right side) */}
      {showOutput && Handle && Position && (
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="!bg-teal-500 !border-2 !border-white !w-3 !h-3"
        />
      )}
      {/* Header with icon and title */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`
          p-2 rounded-lg
          bg-gradient-to-br ${colorClass}
          text-white
          shadow-lg
        `}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-foreground truncate">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {type}
          </p>
        </div>
      </div>

      {/* Preview content */}
      {data?.description && (
        <div className="mt-3 p-2 rounded-md bg-black/10 dark:bg-white/5">
          <p className="text-xs text-muted-foreground line-clamp-3">
            {data.description}
          </p>
        </div>
      )}

      {!data?.description && data?.code && (
        <div className="mt-3 p-2 rounded-md bg-black/10 dark:bg-white/5">
          <code className="text-xs text-muted-foreground line-clamp-2">
            {data.code.split('\n')[0]}...
          </code>
        </div>
      )}

      {data?.config && (
        <div className="mt-3 p-2 rounded-md bg-black/10 dark:bg-white/5">
          <p className="text-xs text-muted-foreground line-clamp-1">
            {type === 'http' && `${data.config.method} ${data.config.url?.substring(0, 30)}...`}
            {type === 'file' && `${data.config.operation} ${data.config.path}`}
            {type === 'condition' && `${data.config.conditions?.length || 0} condition(s)`}
            {type === 'database' && `${data.config.operation} ${data.config.database}`}
            {type === 'llm' && `${data.config.provider} ${data.config.model}`}
          </p>
        </div>
      )}

      {/* Skip indicator */}
      {data?.skipDuringExecution && (
        <div className="mt-3 flex items-center gap-2 px-2 py-1 rounded-md bg-yellow-500/20 border border-yellow-500/30">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-xs text-yellow-200 font-medium">
            Skip During Execution
          </span>
        </div>
      )}

      {/* Status indicator */}
      {(isExecuting || executionStatus) && (
        <div className="mt-3 flex items-center gap-2">
          {executionStatus === 'success' && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
          {executionStatus === 'error' && (
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          {(isExecuting || executionStatus === 'running') && (
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          )}
          <span className="text-xs text-muted-foreground">
            {executionStatus === 'success' && 'Success'}
            {executionStatus === 'error' && 'Error'}
            {(isExecuting || executionStatus === 'running') && 'Running...'}
          </span>
        </div>
      )}
    </div>
  )
})
