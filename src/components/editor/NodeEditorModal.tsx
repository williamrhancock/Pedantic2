'use client'

import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { X, Trash2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export type NodeType = 'start' | 'end' | 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm' | 'foreach' | 'endloop' | 'markdown' | 'html' | 'embedding'

interface NodeEditorModalProps {
  isOpen: boolean
  onClose: () => void
  nodeId: string
  nodeType: NodeType
  nodeTitle: string
  code?: string
  config?: any
  onSave: (code?: string, config?: any) => void
  onDelete?: () => void
  isLocked?: boolean
  onMakeCustom?: (options: { name: string; description: string; code?: string; config?: any }) => Promise<void> | void
  onUpdateCustomFromNode?: (options: { code?: string; config?: any }) => Promise<void> | void
  onExportCustomNode?: (options: { filename: string }) => Promise<void> | void
  isCustom?: boolean
  customName?: string
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
  onDelete,
  isLocked = false,
  onMakeCustom,
  onUpdateCustomFromNode,
  onExportCustomNode,
  isCustom = false,
  customName,
}: NodeEditorModalProps) {
  const { isDark } = useTheme()
  const [editedCode, setEditedCode] = useState(code || '')
  const [editedConfig, setEditedConfig] = useState(config ? JSON.stringify(config, null, 2) : '')
  const [testInput, setTestInput] = useState('{}')
  const [liveOutput, setLiveOutput] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMakeCustomDialog, setShowMakeCustomDialog] = useState(false)
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false)
  const [customNameInput, setCustomNameInput] = useState(customName || nodeTitle)
  const [customDescriptionInput, setCustomDescriptionInput] = useState('')
  const [customError, setCustomError] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFilenameInput, setExportFilenameInput] = useState(
    (customName || nodeTitle || 'custom_node') + '.json'
  )

  const isCodeNode = nodeType === 'python' || nodeType === 'typescript'
  const isConfigNode = !isCodeNode && nodeType !== 'start' && nodeType !== 'end' && nodeType !== 'endloop'
  const canDelete = nodeType !== 'start' && nodeType !== 'end'
  const isCustomInstance = isCustom || !!customName
  const canMakeCustom = nodeType !== 'start' && nodeType !== 'end' && !!onMakeCustom

  const handleSave = async () => {
    if (isLocked) return

    setConfigError(null)

    if (isCodeNode) {
      onSave(editedCode, undefined)
    } else if (isConfigNode) {
      try {
        const parsedConfig = JSON.parse(editedConfig)
        onSave(undefined, parsedConfig)
      } catch (e) {
        setConfigError('Invalid JSON configuration')
        return
      }
    }

    onClose()
  }

  const handleDelete = () => {
    if (!canDelete) {
      return
    }
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (onDelete) {
      onDelete()
      onClose()
    }
    setShowDeleteConfirm(false)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  const openMakeCustomDialog = () => {
    if (!canMakeCustom || isLocked) return
    setCustomNameInput(customName || nodeTitle)
    setCustomDescriptionInput('')
    setCustomError(null)
    setShowMakeCustomDialog(true)
  }

  const cancelMakeCustom = () => {
    setShowMakeCustomDialog(false)
    setCustomError(null)
  }

  const confirmMakeCustom = async () => {
    if (!onMakeCustom) return
    const trimmedName = customNameInput.trim()
    const trimmedDescription = customDescriptionInput.trim()

    if (!trimmedName) {
      setCustomError('Name is required')
      return
    }

    let configForCustom: any | undefined

    if (isConfigNode) {
      try {
        configForCustom = JSON.parse(editedConfig)
      } catch (e) {
        setCustomError('Invalid JSON configuration')
        return
      }
    }

    try {
      await Promise.resolve(
        onMakeCustom({
          name: trimmedName,
          description: trimmedDescription,
          code: isCodeNode ? editedCode : undefined,
          config: isConfigNode ? configForCustom : undefined,
        })
      )
      setShowMakeCustomDialog(false)
      setCustomError(null)
    } catch (e) {
      console.error('Failed to save custom node:', e)
      setCustomError(
        e instanceof Error ? e.message : 'Failed to save custom node. Please try again.'
      )
    }
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
                  {nodeType === 'foreach' && 'Configure loop settings: items array (if not from upstream), execution mode (serial/parallel), max concurrency, and items_key to extract array from upstream input. If upstream input contains an array or has the specified key, it will be used. Otherwise, use the items array in config.'}
                  {nodeType === 'markdown' && 'The markdown node automatically detects markdown content in any variable passed from upstream. It scans all variables and displays the first one containing markdown patterns (headers, lists, links, code blocks, etc.). Optionally specify a content_key to prioritize a specific variable.'}
                  {nodeType === 'html' && 'The HTML node automatically detects HTML content in any variable passed from upstream. It scans all variables and displays the first one containing HTML tags. Optionally specify a content_key to prioritize a specific variable.'}
                  {nodeType === 'embedding' && 'Configure embedding generation: model (default: all-MiniLM-L6-v2), input_field (field name to extract text from, default: content), output_field (field name for embedding output, default: embedding), format (blob for SQLite BLOB or array for JSON array, default: blob).'}
                </p>
              </div>
            )}

            {nodeType === 'endloop' && (
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Description
                </label>
                <p className="text-xs text-muted-foreground">
                  End Loop node marks the end of a ForEach loop. It aggregates all iteration results and passes the complete dataset to the next node. No configuration needed.
                </p>
              </div>
            )}

            {/* Make / Update Custom Node */}
            {!isLocked && (
              <div className="mt-4 space-y-2">
                {canMakeCustom && !isCustomInstance && (
                  <button
                    onClick={openMakeCustomDialog}
                    className="w-full px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-sm font-medium transition-all hover:scale-105 active:scale-95"
                  >
                    Save as Custom Node
                  </button>
                )}
                {isCustomInstance && onUpdateCustomFromNode && (
                  <button
                    onClick={async () => {
                      try {
                        let updatedConfig: any | undefined
                        setConfigError(null)

                        if (isConfigNode) {
                          try {
                            updatedConfig = JSON.parse(editedConfig)
                          } catch (e) {
                            setConfigError('Invalid JSON configuration')
                            return
                          }
                        }

                        await Promise.resolve(
                          onUpdateCustomFromNode({
                            code: isCodeNode ? editedCode : undefined,
                            config: isConfigNode ? updatedConfig : undefined,
                          })
                        )
                        setShowUpdateSuccess(true)
                      } catch (e) {
                        console.error('Failed to update custom node from editor:', e)
                        setCustomError(
                          e instanceof Error
                            ? e.message
                            : 'Failed to update custom node. Please try again.'
                        )
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-sm font-medium transition-all hover:scale-105 active:scale-95"
                  >
                    Update Custom Node
                  </button>
                )}
            {isCustomInstance && onExportCustomNode && (
              <button
                onClick={() => {
                  setExportFilenameInput(
                    (customName || nodeTitle || 'custom_node') + '.json'
                  )
                  setShowExportDialog(true)
                }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-foreground text-sm font-medium transition-all hover:scale-105 active:scale-95"
              >
                Export Custom Node
              </button>
            )}
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

            {(configError || customError) && (
              <div className="mt-3 space-y-1">
                {configError && (
                  <p className="text-xs text-red-400">
                    {configError}
                  </p>
                )}
                {customError && (
                  <p className="text-xs text-red-400">
                    {customError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-white/10">
          {/* Left: Delete button */}
          <div>
            {canDelete && onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Node
              </button>
            )}
          </div>

          {/* Right: Close and Save buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isLocked}
              className={`px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all${
                isLocked ? ' opacity-50 cursor-not-allowed hover:scale-100' : ''
              }`}
            >
              Save to Workflow
            </button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <>
            <div
              className="fixed inset-0 z-[60] backdrop-blur-md bg-black/70"
              onClick={cancelDelete}
            />
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="glass-card p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Delete Node?
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Are you sure you want to delete &quot;{nodeTitle}&quot;? This will also remove all connections to and from this node. This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={cancelDelete}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Make Custom Node Dialog */}
        {showMakeCustomDialog && (
          <>
            <div
              className="fixed inset-0 z-[60] backdrop-blur-md bg-black/70"
              onClick={cancelMakeCustom}
            />
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="glass-card p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Save as Custom Node
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Give this node a reusable name and brief description. It will be available in the Custom Nodes menu for all workflows.
                </p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      Name
                    </label>
                    <input
                      type="text"
                      value={customNameInput}
                      onChange={(e) => setCustomNameInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="My custom node"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      Description
                    </label>
                    <textarea
                      value={customDescriptionInput}
                      onChange={(e) => setCustomDescriptionInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="Short description of what this node does..."
                    />
                  </div>
                  {customError && (
                    <p className="text-sm text-red-400">
                      {customError}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={cancelMakeCustom}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmMakeCustom}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    Save Custom Node
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Custom Node Updated Dialog */}
        {showUpdateSuccess && (
          <>
            <div
              className="fixed inset-0 z-[60] backdrop-blur-md bg-black/60"
              onClick={() => setShowUpdateSuccess(false)}
            />
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="glass-card p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Custom Node Updated
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The custom node &quot;{customName || nodeTitle}&quot; has been updated with the latest changes.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowUpdateSuccess(false)}
                    className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Export Custom Node Dialog */}
        {showExportDialog && (
          <>
            <div
              className="fixed inset-0 z-[60] backdrop-blur-md bg-black/60"
              onClick={() => setShowExportDialog(false)}
            />
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="glass-card p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Export Custom Node
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a filename for this custom node. It will be exported as a JSON file that can
                  be imported into other projects.
                </p>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-foreground mb-1 block">
                    File name
                  </label>
                  <input
                    type="text"
                    value={exportFilenameInput}
                    onChange={(e) => setExportFilenameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {customError && (
                  <p className="text-sm text-red-400 mb-2">
                    {customError}
                  </p>
                )}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowExportDialog(false)}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!onExportCustomNode) return
                      const trimmed = exportFilenameInput.trim()
                      if (!trimmed) {
                        setCustomError('Please enter a file name.')
                        return
                      }
                      try {
                        await Promise.resolve(
                          onExportCustomNode({ filename: trimmed })
                        )
                        setShowExportDialog(false)
                        setCustomError(null)
                      } catch (e) {
                        console.error('Failed to export custom node from editor:', e)
                        setCustomError(
                          e instanceof Error
                            ? e.message
                            : 'Failed to export custom node. Please try again.'
                        )
                      }
                    }}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

