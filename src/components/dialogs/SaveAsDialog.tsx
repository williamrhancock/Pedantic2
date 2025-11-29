'use client'

import React, { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { trpc } from '@/lib/trpc-provider'

interface SaveAsDialogProps {
  isOpen: boolean
  currentName: string
  currentId?: number
  onClose: () => void
  onSave: (name: string) => Promise<void>
}

export function SaveAsDialog({
  isOpen,
  currentName,
  currentId,
  onClose,
  onSave,
}: SaveAsDialogProps) {
  const { isDark } = useTheme()
  const [workflowName, setWorkflowName] = useState(currentName)
  const [nameExists, setNameExists] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Check if name exists when user types
  const checkNameMutation = trpc.checkWorkflowName.useQuery(
    {
      name: workflowName.trim(),
      excludeId: currentId,
    },
    {
      enabled: false, // We'll manually trigger refetch
      onSuccess: (data) => {
        setNameExists(data.exists)
      },
    }
  )

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setWorkflowName(currentName)
      setNameExists(false)
      setShowOverwriteConfirm(false)
      setIsSaving(false)
    }
  }, [isOpen, currentName])

  // Debounce name checking
  useEffect(() => {
    if (!isOpen || showOverwriteConfirm || !workflowName.trim()) {
      setNameExists(false)
      return
    }

    const timeoutId = setTimeout(() => {
      checkNameMutation.refetch()
    }, 300) // Debounce for 300ms

    return () => clearTimeout(timeoutId)
  }, [workflowName, isOpen, showOverwriteConfirm, checkNameMutation])

  const handleSave = async () => {
    const trimmedName = workflowName.trim()
    
    if (!trimmedName) {
      return
    }

    // If name exists and we haven't confirmed overwrite, show confirmation
    if (nameExists && !showOverwriteConfirm) {
      setShowOverwriteConfirm(true)
      return
    }

    // Save the workflow
    setIsSaving(true)
    try {
      await onSave(trimmedName)
      onClose()
    } catch (error) {
      console.error('Failed to save workflow:', error)
      alert('Failed to save workflow. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (showOverwriteConfirm) {
      setShowOverwriteConfirm(false)
    } else {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleCancel}
        className="fixed inset-0 z-50 backdrop-blur-md bg-black/50"
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="glass-card p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              {showOverwriteConfirm ? 'Overwrite Workflow?' : 'Save As'}
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {showOverwriteConfirm ? (
            /* Overwrite Confirmation */
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Workflow &quot;{workflowName}&quot; already exists
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Do you want to overwrite the existing workflow? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Overwrite'}
                </button>
              </div>
            </div>
          ) : (
            /* Name Input */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  disabled={isSaving}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  placeholder="Enter workflow name..."
                />
                {nameExists && workflowName.trim() && (
                  <p className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    A workflow with this name already exists
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!workflowName.trim() || isSaving}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

