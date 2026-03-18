import { supabase } from "./supabase";

const TASK_RECORD_SELECT = `
  id,
  user_id,
  title,
  mindmap_graph,
  selected_file_name,
  generation_status,
  is_generating,
  source_mindmap_id,
  created_at,
  updated_at
`;

export const listTaskRecords = async () => {
  const { data, error } = await supabase
    .from("task_records")
    .select(TASK_RECORD_SELECT)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

export const upsertTaskRecords = async ({ records }) => {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("task_records")
    .upsert(records, { onConflict: "id" })
    .select(TASK_RECORD_SELECT);

  if (error) {
    throw error;
  }

  return data || [];
};

export const deleteTaskRecord = async ({ id }) => {
  if (!id) {
    return;
  }

  const { error } = await supabase.from("task_records").delete().eq("id", id);

  if (error) {
    throw error;
  }
};
