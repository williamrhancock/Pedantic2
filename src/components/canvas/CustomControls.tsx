'use client'

import React, { useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Network } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import type { ReactFlowInstance } from 'reactflow'

interface WorkflowNode {
  id: string
  type: 'start' | 'end' | 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm' | 'foreach' | 'markdown'
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

    // Hierarchical layout algorithm
    const nodeMap = new Map<string, WorkflowNode>()
    nodes.forEach(node => nodeMap.set(node.id, node))

    // Build adjacency lists
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

    // Find start node (node with no incoming connections, or type === 'start')
    const startNode = nodes.find(n => n.type === 'start') || 
                     nodes.find(n => (incoming.get(n.id) || []).length === 0) ||
                     nodes[0] // Fallback to first node
    
    if (!startNode) return

    // Assign levels using BFS
    const levels = new Map<string, number>()
    const visited = new Set<string>()
    const queue: Array<{ id: string; level: number }> = [{ id: startNode.id, level: 0 }]
    
    levels.set(startNode.id, 0)
    visited.add(startNode.id)

    while (queue.length > 0) {
      const { id, level } = queue.shift()!
      const children = outgoing.get(id) || []
      
      for (const childId of children) {
        if (!visited.has(childId)) {
          visited.add(childId)
          const childLevel = level + 1
          levels.set(childId, childLevel)
          queue.push({ id: childId, level: childLevel })
        } else {
          // If already visited, update to max level if needed
          const existingLevel = levels.get(childId) || 0
          const newLevel = Math.max(existingLevel, level + 1)
          levels.set(childId, newLevel)
        }
      }
    }

    // Assign levels to unvisited nodes (disconnected components)
    nodes.forEach(node => {
      if (!levels.has(node.id)) {
        // Find the minimum level of any connected node, or use max level + 1
        const maxLevel = Math.max(...Array.from(levels.values()), -1)
        levels.set(node.id, maxLevel + 1)
      }
    })

    // Group nodes by level
    const nodesByLevel = new Map<number, WorkflowNode[]>()
    nodes.forEach(node => {
      const level = levels.get(node.id) ?? 0
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      nodesByLevel.get(level)!.push(node)
    })

    // Calculate positions
    const HORIZONTAL_SPACING = 300
    const VERTICAL_SPACING = 150
    const START_X = 100
    const START_Y = 100

    const updates: Array<{ id: string; position: { x: number; y: number } }> = []
    
    nodesByLevel.forEach((levelNodes, level) => {
      const x = START_X + (level * HORIZONTAL_SPACING)
      const totalHeight = (levelNodes.length - 1) * VERTICAL_SPACING
      const startY = START_Y - (totalHeight / 2)
      
      levelNodes.forEach((node, index) => {
        const y = startY + (index * VERTICAL_SPACING)
        updates.push({
          id: node.id,
          position: { x, y }
        })
      })
    })

    // Update node positions
    onNodesUpdate(updates)

    // Fit view after a short delay to allow positions to update
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

