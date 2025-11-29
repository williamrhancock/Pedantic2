'use client'

import React, { useEffect, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export interface TimelineEntry {
  id: string
  nodeId: string
  nodeTitle: string
  status: 'success' | 'error' | 'running' | 'waiting' | 'done'
  output?: any
  error?: string
  stdout?: string
  stderr?: string
  executionTime?: number
  timestamp: Date
  isForEachResult?: boolean
  forEachIteration?: number
  forEachItem?: any
}

interface ExecutionTimelineProps {
  entries: TimelineEntry[]
}

export function ExecutionTimeline({ entries }: ExecutionTimelineProps) {
  const { isDark } = useTheme()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current && entries.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  return (
    <div className="h-full flex flex-col glass-card p-4 overflow-hidden">
      <h3 className="text-lg font-semibold mb-4 text-white flex-shrink-0">
        Execution Log
      </h3>
      
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar min-h-0 font-mono text-sm"
      >
        {entries.length === 0 ? (
          <div className="text-center text-gray-300 py-8">
            <p className="text-sm">No executions yet</p>
            <p className="text-xs mt-2 text-gray-400">Execute a workflow to see results</p>
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map((entry, index) => {
              const timestamp = entry.timestamp.toLocaleTimeString()
              let statusSymbol = '○'
              let statusColor = 'text-gray-400'
              let statusText = 'Waiting'
              
              if (entry.status === 'success' || entry.status === 'done') {
                statusSymbol = '✓'
                statusColor = 'text-green-400'
                statusText = 'Done'
              } else if (entry.status === 'error') {
                statusSymbol = '✗'
                statusColor = 'text-red-400'
                statusText = 'Error'
              } else if (entry.status === 'running') {
                statusSymbol = '⟳'
                statusColor = 'text-purple-400'
                statusText = 'Running'
              } else if (entry.status === 'waiting') {
                statusSymbol = '○'
                statusColor = 'text-gray-400'
                statusText = 'Waiting'
              }
              
              // Check if this is a nested node execution within an iteration
              // Iteration headers have "→ Iteration" (e.g., "For Each Loop → Iteration 1")
              // Nested nodes have "[Iteration" (e.g., "LLM AI Assistant [Iteration 1]")
              const isIterationHeader = entry.isForEachResult && entry.nodeTitle.includes('→ Iteration')
              const isNestedNode = entry.isForEachResult && entry.nodeTitle.includes('[Iteration') && !isIterationHeader
              
              return (
                <div key={entry.id} className={`text-gray-300 leading-relaxed ${isNestedNode ? 'ml-8' : ''}`}>
                  {/* Main log line */}
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 flex-shrink-0">[{timestamp}]</span>
                    <span className={statusColor}>{statusSymbol}</span>
                    {isNestedNode && <span className="text-gray-600 mr-1">└─</span>}
                    <span className="text-white font-medium">{entry.nodeTitle}</span>
                    {entry.isForEachResult && entry.forEachIteration !== undefined && !isNestedNode && (
                      <span className="text-cyan-400">[Iteration {entry.forEachIteration + 1}]</span>
                    )}
                    {isNestedNode && entry.forEachIteration !== undefined && (
                      <span className="text-cyan-400">[Iteration {entry.forEachIteration + 1}]</span>
                    )}
                    <span className={`text-xs ${statusColor}`}>({statusText})</span>
                    {entry.executionTime !== undefined && entry.executionTime !== null && entry.executionTime > 0 && (
                      <span className="text-gray-500 ml-1">{entry.executionTime.toFixed(2)}s</span>
                    )}
                  </div>
                  
                  {/* For-each item info */}
                  {entry.isForEachResult && entry.forEachItem && (
                    <div className="ml-8 text-xs text-gray-400">
                      Item: {JSON.stringify(entry.forEachItem)}
                    </div>
                  )}
                  
                  {/* STDOUT */}
                  {entry.stdout && (
                    <div className="ml-8 text-gray-400">
                      → {entry.stdout}
                    </div>
                  )}
                  
                  {/* Error */}
                  {entry.error && (
                    <div className="ml-8 text-red-400">
                      ✗ {entry.error}
                    </div>
                  )}
                  
                  {/* STDERR */}
                  {entry.stderr && (
                    <div className="ml-8 text-yellow-400">
                      ! {entry.stderr}
                    </div>
                  )}
                  
                  {/* Output preview (if small) */}
                  {entry.output && !entry.isForEachResult && typeof entry.output === 'object' && Object.keys(entry.output).length <= 3 && (
                    <div className="ml-8 text-xs text-gray-500">
                      {JSON.stringify(entry.output, null, 2).substring(0, 200)}
                      {JSON.stringify(entry.output).length > 200 ? '...' : ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

