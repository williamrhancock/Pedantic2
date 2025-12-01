'use client'

import React from 'react'
import { GlassmorphicNode } from '@/components/nodes/GlassmorphicNode'

export type WorkflowNodeType = 'start' | 'end' | 'python' | 'typescript' | 'http' | 'file' | 'condition' | 'database' | 'llm' | 'foreach' | 'endloop' | 'markdown' | 'html' | 'json' | 'embedding' | 'browser' | 'image'

export interface WorkflowNodeData {
  type: WorkflowNodeType
  title: string
  description?: string
  code?: string
  config?: any
  isExecuting?: boolean
  executionStatus?: 'success' | 'error' | 'running'
  skipDuringExecution?: boolean
}

// Simple wrapper component
export function WorkflowNode({ id, data, selected }: { id: string; data: WorkflowNodeData; selected: boolean }) {
  return (
    <GlassmorphicNode
      id={id}
      type={data.type}
      title={data.title}
      isSelected={selected}
      isExecuting={data.isExecuting}
      executionStatus={data.executionStatus}
      data={{
        description: data.description,
        code: data.code,
        config: data.config,
        skipDuringExecution: data.skipDuringExecution,
      }}
    />
  )
}

