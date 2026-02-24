import { supabase } from '@/lib/customSupabaseClient';

// ============================================================
// rehab_phases
// ============================================================
export const phasesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('rehab_phases')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },
};

// ============================================================
// rehab_sow
// ============================================================
export const sowService = {
  async getForDeal(dealId) {
    const { data, error } = await supabase
      .from('rehab_sow')
      .select('*')
      .eq('deal_id', dealId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(dealId, fields) {
    const payload = { deal_id: dealId, ...fields };
    const { data, error } = await supabase
      .from('rehab_sow')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    // Auto-create a blank estimates row for this SOW
    await estimatesService.createForSow(data.id);
    return data;
  },

  async update(sowId, fields) {
    const { data, error } = await supabase
      .from('rehab_sow')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', sowId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(sowId) {
    const { error } = await supabase
      .from('rehab_sow')
      .delete()
      .eq('id', sowId);
    if (error) throw error;
  },
};

// ============================================================
// rehab_tasks
// ============================================================
export const tasksService = {
  async getForDeal(dealId) {
    const { data, error } = await supabase
      .from('rehab_tasks')
      .select('*, rehab_phases(name)')
      .eq('deal_id', dealId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getForSow(sowId) {
    const { data, error } = await supabase
      .from('rehab_tasks')
      .select('*, rehab_phases(name)')
      .eq('sow_id', sowId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(dealId, fields) {
    const payload = { deal_id: dealId, ...fields };
    const { data, error } = await supabase
      .from('rehab_tasks')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(taskId, fields) {
    const { data, error } = await supabase
      .from('rehab_tasks')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateOrder(taskId, orderIndex) {
    const { data, error } = await supabase
      .from('rehab_tasks')
      .update({ order_index: orderIndex, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(taskId) {
    const { error } = await supabase
      .from('rehab_tasks')
      .delete()
      .eq('id', taskId);
    if (error) throw error;
  },
};

// ============================================================
// rehab_estimates
// ============================================================
export const estimatesService = {
  async getForSow(sowId) {
    const { data, error } = await supabase
      .from('rehab_estimates')
      .select('*')
      .eq('sow_id', sowId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createForSow(sowId) {
    const { data, error } = await supabase
      .from('rehab_estimates')
      .insert({ sow_id: sowId })
      .select()
      .single();
    // Ignore conflict if already exists
    if (error && error.code !== '23505') throw error;
    return data;
  },

  async update(estimateId, fields) {
    const { data, error } = await supabase
      .from('rehab_estimates')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', estimateId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async upsertForSow(sowId, fields) {
    const existing = await this.getForSow(sowId);
    if (existing) {
      return this.update(existing.id, fields);
    }
    const { data, error } = await supabase
      .from('rehab_estimates')
      .insert({ sow_id: sowId, ...fields })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================================
// materials_log
// ============================================================
export const materialsService = {
  async getForSow(sowId) {
    const { data, error } = await supabase
      .from('materials_log')
      .select('*')
      .eq('sow_id', sowId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getForDeal(dealId) {
    // Join through rehab_sow to get all materials for a deal
    const { data, error } = await supabase
      .from('materials_log')
      .select('*, rehab_sow!inner(deal_id, name)')
      .eq('rehab_sow.deal_id', dealId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(sowId, fields) {
    const payload = { sow_id: sowId, ...fields };
    const { data, error } = await supabase
      .from('materials_log')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(materialId, fields) {
    const { data, error } = await supabase
      .from('materials_log')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', materialId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(materialId) {
    const { error } = await supabase
      .from('materials_log')
      .delete()
      .eq('id', materialId);
    if (error) throw error;
  },

  /** Upload a receipt photo and return the public URL */
  async uploadReceipt(dealId, sowId, file) {
    const ext = file.name.split('.').pop();
    const path = `${dealId}/${sowId}/${Date.now()}_receipt.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('materials-receipts')
      .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage
      .from('materials-receipts')
      .getPublicUrl(path);
    return urlData?.publicUrl || null;
  },

  /** Upload a product photo and return the public URL */
  async uploadProductPhoto(dealId, sowId, file) {
    const ext = file.name.split('.').pop();
    const path = `${dealId}/${sowId}/${Date.now()}_product.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('materials-receipts')
      .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage
      .from('materials-receipts')
      .getPublicUrl(path);
    return urlData?.publicUrl || null;
  },
};

// ============================================================
// rehab_photos
// ============================================================
export const photosService = {
  async getForDeal(dealId) {
    const { data, error } = await supabase
      .from('rehab_photos')
      .select('*')
      .eq('deal_id', dealId)
      .order('taken_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getForTask(taskId) {
    const { data, error } = await supabase
      .from('rehab_photos')
      .select('*')
      .eq('task_id', taskId)
      .order('taken_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getForSow(sowId) {
    const { data, error } = await supabase
      .from('rehab_photos')
      .select('*')
      .eq('sow_id', sowId)
      .order('taken_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(dealId, fields) {
    const payload = { deal_id: dealId, ...fields };
    const { data, error } = await supabase
      .from('rehab_photos')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(photoId, fields) {
    const { data, error } = await supabase
      .from('rehab_photos')
      .update(fields)
      .eq('id', photoId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(photoId, storagePath) {
    if (storagePath) {
      await supabase.storage.from('rehab-photos').remove([storagePath]);
    }
    const { error } = await supabase
      .from('rehab_photos')
      .delete()
      .eq('id', photoId);
    if (error) throw error;
  },

  /** Upload a photo file to Supabase Storage and return its URL + path */
  async upload(dealId, file, context = {}) {
    const ext = file.name.split('.').pop();
    const contextPrefix = context.taskId
      ? `tasks/${context.taskId}`
      : context.sowId
      ? `sow/${context.sowId}`
      : 'general';
    const path = `${dealId}/${contextPrefix}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from('rehab-photos')
      .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage
      .from('rehab-photos')
      .getPublicUrl(path);
    return { url: urlData?.publicUrl || null, path };
  },
};

// ============================================================
// rehab_issues
// ============================================================
export const issuesService = {
  async getForDeal(dealId) {
    const { data, error } = await supabase
      .from('rehab_issues')
      .select('*')
      .eq('deal_id', dealId)
      .order('reported_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(dealId, fields) {
    const payload = { deal_id: dealId, ...fields };
    const { data, error } = await supabase
      .from('rehab_issues')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(issueId, fields) {
    const { data, error } = await supabase
      .from('rehab_issues')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', issueId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(issueId) {
    const { error } = await supabase
      .from('rehab_issues')
      .delete()
      .eq('id', issueId);
    if (error) throw error;
  },
};
