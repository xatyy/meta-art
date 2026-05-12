import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Service role key bypasses RLS — never expose this client-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { token_id, seller, price_wei, image_url, prompt, metadata_uri, tx_hash } = req.body;
    const { error } = await supabase.from('listings').upsert({
      token_id,
      seller: (seller as string).toLowerCase(),
      price_wei,
      status: 'active',
      image_url,
      prompt,
      metadata_uri,
      tx_hash,
      updated_at: new Date().toISOString(),
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PATCH') {
    const { token_id, status, tx_hash } = req.body;
    const update: Record<string, string> = { status, updated_at: new Date().toISOString() };
    if (tx_hash) update.tx_hash = tx_hash;
    const { error } = await supabase.from('listings').update(update).eq('token_id', token_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
