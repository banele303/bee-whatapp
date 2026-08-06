import { SupabaseClient } from '@supabase/supabase-js'

export async function saveWorkflowGraph({
  db,
  accountId,
  id,
  graph,
}: {
  db: SupabaseClient
  accountId: string
  id: string
  graph: any
}) {
  const { error } = await db
    .from('automations')
    .update({ graph, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('account_id', accountId)
  
  if (error) throw new Error(error.message)
}

export async function listWorkflows(db: SupabaseClient, accountId: string) {
  try {
    const { data, error } = await db
      .from('automations')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
    
    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

export async function getWorkflow(db: SupabaseClient, accountId: string, id: string) {
  const { data, error } = await db
    .from('automations')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .single()
  
  if (error) throw new Error(error.message)
  return data
}

export async function createWorkflow(db: SupabaseClient, accountId: string, name: string) {
  const { data, error } = await db
    .from('automations')
    .insert({ account_id: accountId, name })
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return data
}

export async function createWorkflowWithId(db: SupabaseClient, accountId: string, id: string, name: string) {
  const defaultGraph = {
    nodes: [
      {
        id: 'node-trigger-1',
        type: 'triggerNode',
        position: { x: 250, y: 100 },
        data: { label: 'Inbound Hilux Sourcing Query', eventType: 'whatsapp_message' },
      },
      {
        id: 'node-action-1',
        type: 'actionNode',
        position: { x: 250, y: 250 },
        data: { label: 'Stagehand Web Scraper (Goldwagen & Masterparts SA)' },
      },
      {
        id: 'node-action-2',
        type: 'actionNode',
        position: { x: 250, y: 400 },
        data: { label: 'Dispatch ZAR Quote & PDF Attachment via WhatsApp' },
      },
    ],
    edges: [
      { id: 'edge-1', source: 'node-trigger-1', target: 'node-action-1' },
      { id: 'edge-2', source: 'node-action-1', target: 'node-action-2' },
    ],
  }

  const { data, error } = await db
    .from('automations')
    .upsert({ id, account_id: accountId, name, graph: defaultGraph, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single()

  if (error || !data) {
    return { id, account_id: accountId, name, graph: defaultGraph }
  }
  return data
}

export async function deleteWorkflow(db: SupabaseClient, accountId: string, id: string) {
  const { error } = await db
    .from('automations')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId)
  
  if (error) throw new Error(error.message)
}
