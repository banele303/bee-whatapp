import { createClient } from '@/lib/supabase/server'
import * as queries from '@/lib/automations/queries'

export async function saveWorkflowGraph({
  orgId,
  id,
  graph,
}: {
  orgId: string
  id: string
  graph: any
}) {
  const db = await createClient()
  return queries.saveWorkflowGraph({ db, accountId: orgId, id, graph })
}

export async function listWorkflows(orgId: string) {
  const db = await createClient()
  return queries.listWorkflows(db, orgId)
}

export async function getWorkflow(orgId: string, id: string) {
  const db = await createClient()
  return queries.getWorkflow(db, orgId, id)
}

export async function createWorkflow(orgId: string, name: string) {
  const db = await createClient()
  return queries.createWorkflow(db, orgId, name)
}

export async function deleteWorkflow(orgId: string, id: string) {
  const db = await createClient()
  return queries.deleteWorkflow(db, orgId, id)
}
