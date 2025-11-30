'use client'

import React, { useState, useRef, useEffect } from 'react'
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
  ShieldAlert,
  ChevronDown,
  Code,
  Network,
  Database,
  GitBranch,
  HelpCircle,
  Eye,
} from 'lucide-react'
import type { CustomNodeTemplate } from '@/lib/custom-nodes'

export type NodeType = 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm' | 'foreach' | 'endloop' | 'markdown' | 'html' | 'json' | 'embedding'

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
  customNodes?: CustomNodeTemplate[]
  onSelectCustomNode?: (templateId: number) => void
  onImportCustomNodes?: () => void
  onOpenDbMaintenance?: () => void
  onOpenHelp?: () => void
}

const nodeTypes: { type: NodeType; label: string; color: string }[] = [
  { type: 'python', label: 'Python', color: 'from-blue-500 to-blue-600' },
  { type: 'typescript', label: 'TypeScript', color: 'from-cyan-500 to-cyan-600' },
  { type: 'http', label: 'HTTP', color: 'from-purple-500 to-purple-600' },
  { type: 'file', label: 'File', color: 'from-yellow-500 to-amber-600' },
  { type: 'condition', label: 'Condition', color: 'from-orange-500 to-orange-600' },
  { type: 'database', label: 'Database', color: 'from-green-600 to-emerald-700' },
  { type: 'llm', label: 'LLM AI', color: 'from-pink-500 to-rose-600' },
  { type: 'embedding', label: 'Embedding', color: 'from-amber-500 to-amber-600' },
  { type: 'foreach', label: 'For Each', color: 'from-indigo-500 to-indigo-600' },
  { type: 'endloop', label: 'End Loop', color: 'from-red-500 to-red-600' },
  { type: 'markdown', label: 'Markdown', color: 'from-violet-500 to-violet-600' },
  { type: 'html', label: 'HTML', color: 'from-teal-500 to-teal-600' },
  { type: 'json', label: 'JSON', color: 'from-slate-500 to-slate-600' },
]

const nodeGroups = [
  {
    label: 'Code',
    icon: Code,
    items: [
      { type: 'python' as NodeType, label: 'Python' },
      { type: 'typescript' as NodeType, label: 'TypeScript' },
    ],
  },
  {
    label: 'I/O',
    icon: Network,
    items: [
      { type: 'http' as NodeType, label: 'HTTP' },
      { type: 'file' as NodeType, label: 'File' },
    ],
  },
  {
    label: 'Data',
    icon: Database,
    items: [
      { type: 'database' as NodeType, label: 'Database' },
      { type: 'llm' as NodeType, label: 'LLM AI' },
      { type: 'embedding' as NodeType, label: 'Embedding' },
    ],
  },
  {
    label: 'Flow',
    icon: GitBranch,
    items: [
      { type: 'condition' as NodeType, label: 'Condition' },
      { type: 'foreach' as NodeType, label: 'For Each' },
      { type: 'endloop' as NodeType, label: 'End Loop' },
    ],
  },
  {
    label: 'Visuals',
    icon: Eye,
    items: [
      { type: 'markdown' as NodeType, label: 'Markdown Viewer' },
      { type: 'html' as NodeType, label: 'HTML Viewer' },
      { type: 'json' as NodeType, label: 'JSON Viewer' },
    ],
  },
]

function NodeGroupDropdown({
  group,
  activeNodeType,
  onNodeTypeClick,
  isLocked,
  isDark,
}: {
  group: typeof nodeGroups[0]
  activeNodeType?: NodeType | null
  onNodeTypeClick: (type: NodeType) => void
  isLocked: boolean
  isDark: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const Icon = group.icon

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const hasActiveNode = group.items.some(item => activeNodeType === item.type)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !isLocked && setIsOpen(!isOpen)}
        disabled={isLocked}
        className={`
          relative px-4 py-2 rounded-lg
          text-sm font-medium
          transition-all duration-300
          flex items-center gap-2
          ${isLocked 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:scale-105 active:scale-95'
          }
          ${hasActiveNode
            ? 'bg-white/15 text-foreground'
            : 'bg-white/5 hover:bg-white/10 text-foreground'
          }
        `}
        title={isLocked ? 'Workflow is locked - unlock to add nodes' : `Add ${group.label} Node`}
      >
        <Icon className="w-4 h-4" />
        <span>{group.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !isLocked && (
        <div className={`
          absolute top-full left-0 mt-2 min-w-[160px]
          rounded-lg shadow-xl z-50
          ${isDark 
            ? 'bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-purple-800/95' 
            : 'bg-gradient-to-br from-purple-50/95 via-indigo-50/95 to-purple-100/95'
          } 
          backdrop-blur-sm border border-purple-500/30
          overflow-hidden
        `}>
          {group.items.map((item) => {
            const nodeType = nodeTypes.find(nt => nt.type === item.type)
            const isActive = activeNodeType === item.type
            return (
              <button
                key={item.type}
                onClick={() => {
                  onNodeTypeClick(item.type)
                  setIsOpen(false)
                }}
                className={`
                  w-full px-4 py-2 text-left text-sm
                  transition-colors
                  flex items-center gap-2
                  ${isActive
                    ? `bg-gradient-to-r ${nodeType?.color || ''} text-white`
                    : 'hover:bg-white/10 text-foreground'
                  }
                `}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
  customNodes = [],
  onSelectCustomNode,
  onImportCustomNodes,
  onOpenDbMaintenance,
  onOpenHelp,
}: ModernToolbarProps) {
  const { isDark } = useTheme()

  return (
    <div className={`
      relative z-50
      glass-card
      mx-4 mt-4 mb-2
      px-4 py-3
      flex flex-wrap items-center gap-3 md:gap-4
    `}>
      {/* Left: File operations */}
      <div className="flex items-center gap-2 flex-wrap md:flex-nowrap w-full md:w-auto">
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

      {/* Center: Node type dropdowns */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center flex-1 min-w-[220px]">
        {nodeGroups.map((group) => (
          <NodeGroupDropdown
            key={group.label}
            group={group}
            activeNodeType={activeNodeType}
            onNodeTypeClick={onNodeTypeClick}
            isLocked={isLocked}
            isDark={isDark}
          />
        ))}
      </div>

      {/* Right: Custom nodes, Execute and theme toggle */}
      <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
        {/* Custom nodes dropdown */}
        {onSelectCustomNode && (
          <select
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground max-w-xs"
            defaultValue=""
            disabled={isLocked || customNodes.length === 0}
            onChange={(e) => {
              const value = e.target.value
              if (!value) return
              const id = Number(value)
              if (!Number.isNaN(id)) {
                onSelectCustomNode(id)
              }
              // reset selection so user can pick same item again if desired
              e.target.value = ''
            }}
          >
            <option value="" disabled>
              {customNodes.length === 0 ? 'No custom nodes' : 'Custom Nodes'}
            </option>
            {customNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
                {node.description ? ` — ${node.description}` : ''}
              </option>
            ))}
          </select>
        )}

        {/* Custom node import button */}
        {onImportCustomNodes && (
          <>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <button
              onClick={onImportCustomNodes}
              disabled={isLocked}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Import a custom node"
            >
              <Upload className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Execute and theme toggle */}
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
        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            className="p-2 rounded-lg hover:bg-blue-500/20 transition-colors hover:scale-105 active:scale-95"
            title="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
          </button>
        )}
        {onOpenDbMaintenance && (
          <button
            onClick={onOpenDbMaintenance}
            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors hover:scale-105 active:scale-95"
            title="Database maintenance"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </button>
        )}
      </div>
    </div>
  )
}
