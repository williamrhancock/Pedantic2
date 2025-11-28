'use client'

import React from 'react'
import { getBezierPath, BaseEdge, EdgeLabelRenderer } from 'reactflow'
import type { EdgeProps } from 'reactflow'

function AnimatedEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const animated = data?.animated ?? false
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // Create unique gradient ID
  const gradientId = `gradient-${id.replace(/\s/g, '-')}`

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={animated ? 1 : 0.8} />
          <stop offset="50%" stopColor="#a78bfa" stopOpacity={animated ? 0.8 : 0.6} />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity={animated ? 1 : 0.8} />
        </linearGradient>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: `url(#${gradientId})`,
          strokeDasharray: animated ? '5,5' : undefined,
        }}
      />
      {animated && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className="pointer-events-none"
          >
            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-lg animate-pulse" />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

// Memoize and export to prevent recreation
export const AnimatedEdge = React.memo(AnimatedEdgeComponent)
AnimatedEdge.displayName = 'AnimatedEdge'
