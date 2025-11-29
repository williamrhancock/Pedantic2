'use client'

import React, { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export interface TimelineEntry {
  id: string
  nodeId: string
  nodeTitle: string
  status: 'success' | 'error' | 'running'
  output?: any
  error?: string
  stdout?: string
  stderr?: string
  executionTime?: number
  timestamp: Date
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

  const getStatusIcon = (status: TimelineEntry['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <Clock className="w-5 h-5 text-purple-500 animate-spin" />
      default:
        return null
    }
  }

  const getStatusColor = (status: TimelineEntry['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-500/50 bg-green-500/10'
      case 'error':
        return 'border-red-500/50 bg-red-500/10'
      case 'running':
        return 'border-purple-500/50 bg-purple-500/10'
      default:
        return 'border-white/20 bg-white/5'
    }
  }

  return (
    <div className="h-full flex flex-col glass-card p-4 overflow-hidden">
      <h3 className="text-lg font-semibold mb-4 text-white flex-shrink-0">
        Execution Timeline
      </h3>
      
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-0"
      >
        {entries.length === 0 ? (
          <div className="text-center text-gray-300 py-8">
            <p className="text-sm">No executions yet</p>
            <p className="text-xs mt-2 text-gray-400">Execute a workflow to see results</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 via-teal-500/50 to-transparent" />
            {entries.map((entry, index) => (
              <TimelineEntryComponent
                key={entry.id}
                entry={entry}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface TimelineEntryComponentProps {
  entry: TimelineEntry
  getStatusIcon: (status: TimelineEntry['status']) => React.ReactNode
  getStatusColor: (status: TimelineEntry['status']) => string
}

function TimelineEntryComponent({
  entry,
  getStatusIcon,
  getStatusColor,
}: TimelineEntryComponentProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="relative pl-12">
      <div className={`
        absolute left-4 top-2
        w-4 h-4 rounded-full
        border-2 ${getStatusColor(entry.status)}
        flex items-center justify-center
        z-10
      `}>
        {getStatusIcon(entry.status)}
      </div>

      <div
        className={`
          glass-card p-3 cursor-pointer
          ${getStatusColor(entry.status)}
          transition-all hover:scale-[1.02] hover:translate-x-1
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white truncate">
              {entry.nodeTitle}
            </h4>
            <p className="text-xs text-gray-300 mt-1">
              {entry.nodeId} • {entry.timestamp.toLocaleTimeString()}
            </p>
            {entry.executionTime && (
              <p className="text-xs text-gray-400">
                {entry.executionTime.toFixed(2)}s
              </p>
            )}
          </div>
          <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/10">
            {entry.error && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-red-400 mb-1">Error:</p>
                <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto text-gray-200">
                  {entry.error}
                </pre>
              </div>
            )}
            {entry.stdout && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-300 mb-1">STDOUT:</p>
                <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto text-gray-200">
                  {entry.stdout}
                </pre>
              </div>
            )}
            {entry.stderr && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-300 mb-1">STDERR:</p>
                <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto text-gray-200">
                  {entry.stderr}
                </pre>
              </div>
            )}
            {entry.output && (
              <div>
                <p className="text-xs font-semibold text-gray-300 mb-1">Output:</p>
                <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto text-gray-200 max-h-48">
                  {JSON.stringify(entry.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
