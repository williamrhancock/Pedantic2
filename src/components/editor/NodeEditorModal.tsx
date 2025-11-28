'use client'

import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { X } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export type NodeType = 'start' | 'end' | 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm'

interface NodeEditorModalProps {
  isOpen: boolean
  onClose: () => void
  nodeId: string
  nodeType: NodeType
  nodeTitle: string
  code?: string
  config?: any
  onSave: (code?: string, config?: any) => void
}

export function NodeEditorModal({
  isOpen,
  onClose,
  nodeId,
  nodeType,
  nodeTitle,
  code,
  config,
  onSave,
}: NodeEditorModalProps) {
  const { isDark } = useTheme()
  const [editedCode, setEditedCode] = useState(code || '')
  const [editedConfig, setEditedConfig] = useState(config ? JSON.stringify(config, null, 2) : '')
  const [testInput, setTestInput] = useState('{}')
  const [liveOutput, setLiveOutput] = useState<any>(null)

  const isCodeNode = nodeType === 'python' || nodeType === 'typescript'
  const isConfigNode = !isCodeNode && nodeType !== 'start' && nodeType !== 'end'

  const handleSave = () => {
    if (isCodeNode) {
      onSave(editedCode, undefined)
    } else if (isConfigNode) {
      try {
        const parsedConfig = JSON.parse(editedConfig)
        onSave(undefined, parsedConfig)
      } catch (e) {
        alert('Invalid JSON configuration')
        return
      }
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 backdrop-blur-md bg-black/50"
      />

      {/* Modal */}
      <div
        className="fixed inset-4 z-50 glass-card p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Edit {nodeTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {nodeId} • {nodeType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors hover:scale-110 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left Sidebar */}
          <div className="w-64 glass-card p-4 flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">
                Node Name
              </label>
              <input
                type="text"
                value={nodeTitle}
                readOnly
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm"
              />
            </div>

            {isCodeNode && (
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Test Input (JSON)
                </label>
                <Editor
                  height="200px"
                  language="json"
                  value={testInput}
                  onChange={(value) => setTestInput(value || '{}')}
                  theme={isDark ? 'vs-dark' : 'vs-light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: 'off',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              </div>
            )}

            {isConfigNode && (
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Description
                </label>
                <p className="text-xs text-muted-foreground">
                  {nodeType === 'http' && 'Configure HTTP request parameters'}
                  {nodeType === 'file' && 'Configure file operation settings'}
                  {nodeType === 'condition' && 'Configure conditional logic rules'}
                  {nodeType === 'database' && 'Configure database query parameters'}
                  {nodeType === 'llm' && 'Configure LLM provider and prompt settings'}
                </p>
              </div>
            )}
          </div>

          {/* Center: Editor */}
          <div className="flex-1 glass-card p-4 flex flex-col min-w-0">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                {isCodeNode ? 'Code Editor' : 'Configuration Editor'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isCodeNode && nodeType === 'python' && 'Must have a "run(input)" function that returns output'}
                {isCodeNode && nodeType === 'typescript' && 'Must have an "async run(input)" function that returns output'}
              </p>
            </div>
            <div className="flex-1 min-h-0">
              {isCodeNode ? (
                <Editor
                  height="100%"
                  language={nodeType === 'python' ? 'python' : 'typescript'}
                  value={editedCode}
                  onChange={(value) => setEditedCode(value || '')}
                  theme={isDark ? 'vs-dark' : 'vs-light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              ) : (
                <Editor
                  height="100%"
                  language="json"
                  value={editedConfig}
                  onChange={(value) => setEditedConfig(value || '{}')}
                  theme={isDark ? 'vs-dark' : 'vs-light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Sidebar: Live Output */}
          <div className="w-64 glass-card p-4 flex flex-col">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Live Output
            </h3>
            <div className="flex-1 bg-black/20 rounded-lg p-3 overflow-auto custom-scrollbar">
              {liveOutput ? (
                <pre className="text-xs text-foreground">
                  {JSON.stringify(liveOutput, null, 2)}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Output will appear here when tested
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  )
}
