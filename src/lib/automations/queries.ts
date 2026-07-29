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
  const { data, error } = await db
    .from('automations')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(error.message)
  return data
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

export async function deleteWorkflow(db: SupabaseClient, accountId: string, id: string) {
  const { error } = await db
    .from('automations')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId)
  
  if (error) throw new Error(error.message)
}
