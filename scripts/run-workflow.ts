#!/usr/bin/env node

/**
 * Headless workflow runner.
 *
 * Usage:
 *   npm run run-workflow -- <workflowId>
 *
 * Requirements:
 *   - Next.js app running (for tRPC getWorkflow) on WORKFLOW_WEB_URL (default http://127.0.0.1:3000)
 *   - FastAPI backend running on WORKFLOW_API_URL (default http://127.0.0.1:8000)
 */

const WEB_BASE = process.env.WORKFLOW_WEB_URL ?? 'http://127.0.0.1:3000'
const API_BASE = process.env.WORKFLOW_API_URL ?? 'http://127.0.0.1:8000'

async function main() {
  const [, , idArg] = process.argv

  if (!idArg) {
    console.error('Usage: npm run run-workflow -- <workflowId>')
    process.exit(1)
  }

  const workflowId = Number(idArg)
  if (!Number.isInteger(workflowId) || workflowId <= 0) {
    console.error(`Invalid workflow id: ${idArg}`)
    process.exit(1)
  }

  console.log(`[run-workflow] Fetching workflow id=${workflowId} from ${WEB_BASE}...`)

  const inputPayload = encodeURIComponent(
    JSON.stringify({
      0: { id: workflowId, includeHistory: false },
    })
  )

  const trpcUrl = `${WEB_BASE}/api/trpc/getWorkflow?batch=1&input=${inputPayload}`
  const getRes = await fetch(trpcUrl)

  if (!getRes.ok) {
    console.error(`[run-workflow] Failed to fetch workflow: HTTP ${getRes.status}`)
    process.exit(1)
  }

  const trpcJson: any = await getRes.json()
  const workflowResponse = trpcJson?.[0]?.result?.data

  if (!workflowResponse || !workflowResponse.data) {
    console.error('[run-workflow] Unexpected tRPC response shape; no workflow data found.')
    process.exit(1)
  }

  const workflowData = workflowResponse.data

  console.log(
    `[run-workflow] Executing workflow "${workflowResponse.name}" (id=${workflowId}) via FastAPI at ${API_BASE}/run...`
  )

  const runRes = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow: workflowData }),
  })

  if (!runRes.ok) {
    console.error(`[run-workflow] Execution failed: HTTP ${runRes.status}`)
    const text = await runRes.text()
    console.error(text)
    process.exit(1)
  }

  const resultJson = await runRes.json()
  console.log(JSON.stringify(resultJson, null, 2))
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((err) => {
  console.error('[run-workflow] Unhandled error:', err)
  process.exit(1)
})


