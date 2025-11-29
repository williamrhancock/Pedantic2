'use client'

import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import {
  FilePlus,
  FolderOpen,
  Save,
  Copy,
  Download,
  Upload,
  Play,
} from 'lucide-react'

export type NodeType = 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm'

interface ModernToolbarProps {
  activeNodeType?: NodeType | null
  onNodeTypeClick: (type: NodeType) => void
  onNewWorkflow: () => void
  onOpenWorkflow: () => void
  onSave: () => void
  onSaveAs: () => void
  onExport: () => void
  onImport: () => void
  onExecute: () => void
  isExecuting?: boolean
  hasUnsavedChanges?: boolean
  isAutoSaving?: boolean
  isLocked?: boolean
}

const nodeTypes: { type: NodeType; label: string; color: string }[] = [
  { type: 'python', label: 'Python', color: 'from-blue-500 to-blue-600' },
  { type: 'typescript', label: 'TypeScript', color: 'from-cyan-500 to-cyan-600' },
  { type: 'http', label: 'HTTP', color: 'from-purple-500 to-purple-600' },
  { type: 'file', label: 'File', color: 'from-yellow-500 to-amber-600' },
  { type: 'condition', label: 'Condition', color: 'from-orange-500 to-orange-600' },
  { type: 'database', label: 'Database', color: 'from-green-600 to-emerald-700' },
  { type: 'llm', label: 'LLM AI', color: 'from-pink-500 to-rose-600' },
]

export function ModernToolbar({
  activeNodeType,
  onNodeTypeClick,
  onNewWorkflow,
  onOpenWorkflow,
  onSave,
  onSaveAs,
  onExport,
  onImport,
  onExecute,
  isExecuting = false,
  hasUnsavedChanges = false,
  isAutoSaving = false,
  isLocked = false,
}: ModernToolbarProps) {
  const { isDark } = useTheme()

  return (
    <div className={`
      relative z-50
      glass-card
      mx-4 mt-4 mb-2
      px-4 py-3
      flex items-center justify-between gap-4
    `}>
      {/* Left: File operations */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewWorkflow}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors hover:scale-105 active:scale-95"
          title="New Workflow"
        >
          <FilePlus className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenWorkflow}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors hover:scale-105 active:scale-95"
          title="Open Workflow"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isAutoSaving}
          className={`
            p-2 rounded-lg transition-all
            ${hasUnsavedChanges && !isAutoSaving
              ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:scale-105 active:scale-95'
              : 'opacity-50 cursor-not-allowed'
            }
          `}
          title={isAutoSaving ? "Saving..." : hasUnsavedChanges ? "Save Workflow" : "No unsaved changes"}
        >
          <Save className="w-4 h-4" />
        </button>
        <button
          onClick={onSaveAs}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors hover:scale-105 active:scale-95"
          title="Save As..."
        >
          <Copy className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-white/20 mx-1" />
        <button
          onClick={onExport}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors hover:scale-105 active:scale-95"
          title="Export Workflow"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={onImport}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors hover:scale-105 active:scale-95"
          title="Import Workflow"
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Node type buttons */}
      <div className="flex items-center gap-1 flex-1 justify-center">
        {nodeTypes.map(({ type, label, color }) => {
          const isActive = activeNodeType === type
          return (
            <button
              key={type}
              onClick={() => onNodeTypeClick(type)}
              disabled={isLocked}
              className={`
                relative px-4 py-2 rounded-lg
                text-sm font-medium
                transition-all duration-300
                ${isLocked 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105 active:scale-95'
                }
                ${isActive
                  ? `bg-gradient-to-r ${color} text-white shadow-lg`
                  : 'bg-white/5 hover:bg-white/10 text-foreground'
                }
              `}
              title={isLocked ? 'Workflow is locked - unlock to add nodes' : `Add ${label} Node`}
            >
              {label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Right: Execute and theme toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExecute}
          disabled={isExecuting}
          className={`
            px-6 py-2 rounded-lg
            font-medium text-sm
            bg-gradient-to-r from-green-500 to-emerald-600
            text-white
            shadow-lg
            transition-all
            ${isExecuting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:scale-105 active:scale-95'}
          `}
        >
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            {isExecuting ? 'Executing...' : 'Execute'}
          </div>
        </button>
        <ThemeToggle />
      </div>
    </div>
  )
}
