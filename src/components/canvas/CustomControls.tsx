'use client'

import React, { useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Network } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import type { ReactFlowInstance } from 'reactflow'

interface WorkflowNode {
  id: string
  type: 'start' | 'end' | 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm' | 'embedding' | 'foreach' | 'endloop' | 'markdown' | 'html' | 'json' | 'browser' | 'image' | 'ocr'
  position: { x: number; y: number }
}

interface Connection {
  from: string
  to: string
}

interface CustomControlsProps {
  reactFlowInstance: ReactFlowInstance | null
  isLocked: boolean
  onToggleLock: () => void
  nodes: WorkflowNode[]
  connections: Connection[]
  onNodesUpdate: (updates: Array<{ id: string; position: { x: number; y: number } }>) => void
}

export function CustomControls({
  reactFlowInstance,
  isLocked,
  onToggleLock,
  nodes,
  connections,
  onNodesUpdate,
}: CustomControlsProps) {
  const { isDark } = useTheme()

  const handleAutoArrange = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!reactFlowInstance || nodes.length === 0) return

    // Build adjacency lists to determine execution order
    const incoming = new Map<string, string[]>()
    const outgoing = new Map<string, string[]>()
    
    nodes.forEach(node => {
      incoming.set(node.id, [])
      outgoing.set(node.id, [])
    })
    
    connections.forEach(conn => {
      if (incoming.has(conn.to) && outgoing.has(conn.from)) {
        incoming.get(conn.to)!.push(conn.from)
        outgoing.get(conn.from)!.push(conn.to)
      }
    })

    // Find start node
    const startNode = nodes.find(n => n.type === 'start') || 
                     nodes.find(n => (incoming.get(n.id) || []).length === 0) ||
                     nodes[0]
    
    if (!startNode) return

    // Topological sort to get execution order
    const executionOrder: WorkflowNode[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) return // Cycle detected, skip
      if (visited.has(nodeId)) return
      
      visiting.add(nodeId)
      const node = nodes.find(n => n.id === nodeId)
      if (!node) return

      // Visit all dependencies first
      const deps = incoming.get(nodeId) || []
      deps.forEach(depId => visit(depId))

      visiting.delete(nodeId)
      visited.add(nodeId)
      executionOrder.push(node)
    }

    // Visit all nodes starting from start node
    visit(startNode.id)
    
    // Visit any remaining unvisited nodes
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        visit(node.id)
      }
    })

    // Layout constants
    const NODE_HEIGHT = 150  // Approximate node height
    const NODE_SPACING = NODE_HEIGHT * 0.5  // Half a node worth of space (75px)
    const TOTAL_NODE_SPACE = NODE_HEIGHT + NODE_SPACING  // Space per node including gap
    const NODES_PER_COLUMN = 5
    const COLUMN_WIDTH = 400  // One node width between columns

    const START_X = 100
    const START_Y = 100

    const updates: Array<{ id: string; position: { x: number; y: number } }> = []
    
    let currentColumn = 0
    let currentRow = 0
    let currentY = START_Y

    // Process nodes in execution order
    for (let i = 0; i < executionOrder.length; i++) {
      const node = executionOrder[i]
      
      // Check if we need to start a new column
      const shouldStartNewColumn = 
        currentRow >= NODES_PER_COLUMN ||  // Column is full (5 nodes)
        node.type === 'foreach'            // foreach starts new column

      if (shouldStartNewColumn) {
        currentColumn++
        currentRow = 0
        currentY = START_Y
      }

      // Calculate position
      const x = START_X + (currentColumn * COLUMN_WIDTH)
      const y = currentY

      updates.push({
        id: node.id,
        position: { x, y }
      })

      // Move to next row
      currentRow++
      currentY += TOTAL_NODE_SPACE

      // If endloop, end this column - next node will start a new column
      if (node.type === 'endloop') {
        currentColumn++
        currentRow = 0
        currentY = START_Y
      }
    }

    // Update node positions
    onNodesUpdate(updates)

    // Fit view after a short delay
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 })
      }
    }, 100)
  }, [reactFlowInstance, nodes, connections, onNodesUpdate])

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
        onClick={handleAutoArrange}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
        title="Auto-arrange nodes"
        type="button"
        disabled={isLocked}
      >
        <Network className="w-4 h-4 text-foreground" />
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

