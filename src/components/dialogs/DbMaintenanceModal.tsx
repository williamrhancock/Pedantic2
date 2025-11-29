'use client'

import React, { useState } from 'react'
import { X, Database, FileText, Trash2, AlertTriangle, HardDrive, Download } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { trpc } from '@/lib/trpc-provider'

interface DbMaintenanceModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DbMaintenanceModal({ isOpen, onClose }: DbMaintenanceModalProps) {
  const { isDark } = useTheme()

  const workflowsQuery = trpc.listWorkflows.useQuery(
    { search: '', category: 'all', limit: 100, offset: 0 },
    { enabled: isOpen }
  )
  const customNodesQuery = trpc.getCustomNodes.useQuery(undefined, { enabled: isOpen })
  const dbStatsQuery = trpc.getDbStats.useQuery(undefined, { enabled: isOpen })

  const deleteWorkflowMutation = trpc.deleteWorkflow.useMutation({
    onSuccess: () => workflowsQuery.refetch(),
  })
  const deleteCustomNodeMutation = trpc.deleteCustomNode.useMutation({
    onSuccess: () => customNodesQuery.refetch(),
  })
  const backupDatabaseMutation = trpc.backupDatabase.useMutation()
  const compactDatabaseMutation = trpc.compactDatabase.useMutation()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<Set<number>>(new Set())
  const [selectedCustomNodeIds, setSelectedCustomNodeIds] = useState<Set<number>>(new Set())

  if (!isOpen) return null

  const toggleWorkflowSelection = (id: number) => {
    setSelectedWorkflowIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCustomNodeSelection = (id: number) => {
    setSelectedCustomNodeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const anySelection = selectedWorkflowIds.size > 0 || selectedCustomNodeIds.size > 0

  return (
    <>
      <div
        className="fixed inset-0 z-50 backdrop-blur-md bg-black/50"
        onClick={onClose}
      />
      <div
        className="fixed inset-4 z-50 glass-card p-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Database Maintenance
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage stored workflows and custom nodes. Deletions are permanent.
              </p>
              {dbStatsQuery.data && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {dbStatsQuery.data.workflowCount} workflow(s),{' '}
                  {dbStatsQuery.data.customNodeCount} custom node(s),{' '}
                  {dbStatsQuery.data.dbSizeBytes
                    ? `${(dbStatsQuery.data.dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                    : 'size unknown'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
          {/* Workflows panel */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Workflows
              </h3>
              <span className="text-xs text-muted-foreground">
                {workflowsQuery.data?.workflows?.length ?? 0}
              </span>
            </div>
            <div className="flex-1 rounded-lg border border-white/10 bg-black/10 dark:bg-white/5 overflow-auto custom-scrollbar">
              {workflowsQuery.isLoading ? (
                <div className="p-4 text-xs text-muted-foreground">Loading workflows…</div>
              ) : (workflowsQuery.data?.workflows?.length ?? 0) === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">No workflows found.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-black/20 dark:bg-white/10 backdrop-blur">
                    <tr>
                      <th className="px-2 py-2 w-8">
                        <input
                          type="checkbox"
                          className="rounded border-white/20 bg-transparent"
                          checked={
                            workflowsQuery.data!.workflows!.length > 0 &&
                            selectedWorkflowIds.size === workflowsQuery.data!.workflows!.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWorkflowIds(
                                new Set(workflowsQuery.data!.workflows!.map((w: any) => w.id))
                              )
                            } else {
                              setSelectedWorkflowIds(new Set())
                            }
                          }}
                        />
                      </th>
                      <th className="px-2 py-2 text-left">Name</th>
                      <th className="px-2 py-2 text-left">Type</th>
                      <th className="px-2 py-2 text-left">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflowsQuery.data!.workflows!.map((w: any) => (
                      <tr
                        key={w.id}
                        className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                        onClick={() => toggleWorkflowSelection(w.id)}
                      >
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            className="rounded border-white/20 bg-transparent"
                            checked={selectedWorkflowIds.has(w.id)}
                            onChange={() => toggleWorkflowSelection(w.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-2 py-1 truncate max-w-[140px]">{w.name}</td>
                        <td className="px-2 py-1 text-muted-foreground">
                          {w.is_template ? 'Template' : 'Workflow'}
                        </td>
                        <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">
                          {w.updated_at
                            ? new Date(w.updated_at).toLocaleDateString()
                            : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Custom nodes panel */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Custom Nodes
              </h3>
              <span className="text-xs text-muted-foreground">
                {customNodesQuery.data?.length ?? 0}
              </span>
            </div>
            <div className="flex-1 rounded-lg border border-white/10 bg-black/10 dark:bg-white/5 overflow-auto custom-scrollbar">
              {customNodesQuery.isLoading ? (
                <div className="p-4 text-xs text-muted-foreground">Loading custom nodes…</div>
              ) : (customNodesQuery.data?.length ?? 0) === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">No custom nodes found.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-black/20 dark:bg-white/10 backdrop-blur">
                    <tr>
                      <th className="px-2 py-2 w-8">
                        <input
                          type="checkbox"
                          className="rounded border-white/20 bg-transparent"
                          checked={
                            customNodesQuery.data!.length > 0 &&
                            selectedCustomNodeIds.size === customNodesQuery.data!.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomNodeIds(
                                new Set(customNodesQuery.data!.map((n: any) => n.id))
                              )
                            } else {
                              setSelectedCustomNodeIds(new Set())
                            }
                          }}
                        />
                      </th>
                      <th className="px-2 py-2 text-left">Name</th>
                      <th className="px-2 py-2 text-left">Type</th>
                      <th className="px-2 py-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customNodesQuery.data!.map((n: any) => (
                      <tr
                        key={n.id}
                        className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                        onClick={() => toggleCustomNodeSelection(n.id)}
                      >
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            className="rounded border-white/20 bg-transparent"
                            checked={selectedCustomNodeIds.has(n.id)}
                            onChange={() => toggleCustomNodeSelection(n.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-2 py-1 truncate max-w-[140px]">{n.name}</td>
                        <td className="px-2 py-1 text-muted-foreground">{n.type}</td>
                        <td className="px-2 py-1 text-muted-foreground truncate max-w-[180px]">
                          {n.description || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions (placeholders for now) */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Deletes are permanent. Back up before making destructive changes.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={!anySelection}
              onClick={() => setShowDeleteConfirm(true)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                anySelection
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:scale-105 active:scale-95'
                  : 'bg-white/5 text-muted-foreground opacity-60 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
            <button
              onClick={async () => {
                setStatusMessage(null)
                try {
                  const result = await backupDatabaseMutation.mutateAsync()
                  const byteCharacters = atob(result.base64)
                  const byteNumbers = new Array(byteCharacters.length)
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                  }
                  const byteArray = new Uint8Array(byteNumbers)
                  const blob = new Blob([byteArray], { type: 'application/octet-stream' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = result.filename
                  a.click()
                  URL.revokeObjectURL(url)
                  setStatusMessage('Backup created successfully.')
                } catch (e) {
                  console.error('Failed to back up database:', e)
                  setStatusMessage('Failed to back up database. See console for details.')
                }
              }}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Backup DB
            </button>
            <button
              onClick={async () => {
                setStatusMessage(null)
                try {
                  await compactDatabaseMutation.mutateAsync()
                  setStatusMessage('Database compacted successfully.')
                } catch (e) {
                  console.error('Failed to compact database:', e)
                  setStatusMessage('Failed to compact database. See console for details.')
                }
              }}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Compact DB
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-2 text-xs text-muted-foreground">
            {statusMessage}
          </div>
        )}

        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <>
            <div
              className="fixed inset-0 z-[60] backdrop-blur-md bg-black/60"
              onClick={() => setShowDeleteConfirm(false)}
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
                  Delete Selected Items?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You are about to permanently delete{' '}
                  {selectedWorkflowIds.size} workflow(s) and{' '}
                  {selectedCustomNodeIds.size} custom node(s). This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await Promise.all([
                          ...Array.from(selectedWorkflowIds).map(id =>
                            deleteWorkflowMutation.mutateAsync({ id })
                          ),
                          ...Array.from(selectedCustomNodeIds).map(id =>
                            deleteCustomNodeMutation.mutateAsync({ id })
                          ),
                        ])
                        setSelectedWorkflowIds(new Set())
                        setSelectedCustomNodeIds(new Set())
                        setStatusMessage('Selected items deleted.')
                      } catch (e) {
                        console.error('Failed to delete selected items:', e)
                        setStatusMessage('Failed to delete some items. See console for details.')
                      } finally {
                        setShowDeleteConfirm(false)
                      }
                    }}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    Delete
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


