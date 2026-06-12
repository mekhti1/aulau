import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Server-side client with service role key for full database access
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Simple wrapper for database operations matching Prisma-like API
export const db = {
  user: {
    findUnique: async (args: { where: { username?: string; id?: string }; select?: Record<string, boolean> }) => {
      let query = supabaseAdmin.from('users').select('*');
      if (args.where.username) query = query.eq('username', args.where.username);
      if (args.where.id) query = query.eq('id', args.where.id);
      const { data, error } = await query.single();
      if (error) console.error('[db.user.findUnique] error:', error.message, 'url:', supabaseUrl);
      return data;
    },
    findUniqueWithRawError: async (args: { where: { username?: string; id?: string }; select?: Record<string, boolean> }) => {
      let query = supabaseAdmin.from('users').select('*');
      if (args.where.username) query = query.eq('username', args.where.username);
      if (args.where.id) query = query.eq('id', args.where.id);
      const { data, error } = await query.single();
      return { data, error };
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const { data, error } = await supabaseAdmin.from('users').update(args.data).eq('id', args.where.id).select().single();
      if (error) console.error('[db.user.update] error:', error.message);
      return data;
    },
    count: async (args?: { where?: Record<string, unknown> }) => {
      let query = supabaseAdmin.from('users').select('id', { count: 'exact', head: true });
      if (args?.where?.role) query = query.eq('role', args.where.role);
      const { count } = await query;
      return count || 0;
    },
  },
  net: {
    findMany: async (args?: { where?: Record<string, unknown>; orderBy?: Record<string, string> }) => {
      let query = supabaseAdmin.from('nets').select('*, owner:users!ownerId(name, username, trustScore)');
      if (args?.where?.ownerId) query = query.eq('ownerId', args.where.ownerId);
      query = query.order('createdAt', { ascending: false });
      const { data } = await query;
      return data || [];
    },
    findUnique: async (args: { where: { netCode?: string; id?: string } }) => {
      let query = supabaseAdmin.from('nets').select('*, owner:users!ownerId(name, username, trustScore)');
      if (args.where.netCode) query = query.eq('netCode', args.where.netCode);
      if (args.where.id) query = query.eq('id', args.where.id);
      const { data } = await query.single();
      return data;
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const { data } = await supabaseAdmin.from('nets').insert(args.data).select().single();
      return data;
    },
    count: async () => {
      const { count } = await supabaseAdmin.from('nets').select('id', { count: 'exact', head: true });
      return count || 0;
    },
  },
  batch: {
    findMany: async (args?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number; select?: Record<string, unknown>; include?: Record<string, unknown> }) => {
      let query = supabaseAdmin.from('batches').select('*, owner:users!ownerId(name, username, trustScore)');
      if (args?.where) {
        for (const [key, value] of Object.entries(args.where)) {
          query = query.eq(key, value);
        }
      }
      query = query.order('createdAt', { ascending: false });
      if (args?.take) query = query.limit(args.take);
      const { data } = await query;
      return data || [];
    },
    findUnique: async (args: { where: { batchCode?: string; id?: string }; include?: Record<string, unknown> }) => {
      let selectStr = '*, owner:users!ownerId(name, username, trustScore)';
      if (args.include?.transactions) {
        selectStr += ', transactions(*, buyer:users!buyerId(name))';
      }
      let query = supabaseAdmin.from('batches').select(selectStr);
      if (args.where.batchCode) query = query.eq('batchCode', args.where.batchCode);
      if (args.where.id) query = query.eq('id', args.where.id);
      const { data } = await query.single();
      return data;
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const { data } = await supabaseAdmin.from('batches').insert(args.data).select().single();
      return data;
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const { data } = await supabaseAdmin.from('batches').update(args.data).eq('id', args.where.id).select().single();
      return data;
    },
    count: async () => {
      const { count } = await supabaseAdmin.from('batches').select('id', { count: 'exact', head: true });
      return count || 0;
    },
  },
  hydrophone: {
    findMany: async () => {
      const { data } = await supabaseAdmin.from('hydrophones').select('*, incidents(id, incidentCode, timestamp)').order('createdAt', { ascending: false });
      return (data || []).map(h => ({
        ...h,
        incidents: (h.incidents || []).sort((a: { timestamp: string }, b: { timestamp: string }) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5),
      }));
    },
    findUnique: async (args: { where: { id: string } }) => {
      const { data } = await supabaseAdmin.from('hydrophones').select('*').eq('id', args.where.id).single();
      return data;
    },
  },
  incident: {
    findMany: async () => {
      const { data } = await supabaseAdmin.from('incidents').select('*, hydrophone:hydrophones!hydrophoneId(name)').order('timestamp', { ascending: false });
      return data || [];
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const { data } = await supabaseAdmin.from('incidents').insert(args.data).select('*, hydrophone:hydrophones!hydrophoneId(name)').single();
      return data;
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const { data } = await supabaseAdmin.from('incidents').update(args.data).eq('id', args.where.id).select('*, hydrophone:hydrophones!hydrophoneId(name)').single();
      return data;
    },
    count: async () => {
      const { count } = await supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true });
      return count || 0;
    },
  },
  transaction: {
    findMany: async (args?: { where?: Record<string, unknown> }) => {
      let query = supabaseAdmin.from('transactions').select('*, batch:batches!batchId(species, weightKg, batchCode)');
      if (args?.where?.buyerId) query = query.eq('buyerId', args.where.buyerId);
      query = query.order('createdAt', { ascending: false });
      const { data } = await query;
      return data || [];
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const { data } = await supabaseAdmin.from('transactions').insert(args.data).select().single();
      return data;
    },
    count: async () => {
      const { count } = await supabaseAdmin.from('transactions').select('id', { count: 'exact', head: true });
      return count || 0;
    },
  },
};
