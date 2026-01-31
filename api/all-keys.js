import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rzdepwljvkgcaxhpypcm.supabase.co';
const supabaseAnonKey = '您的匿名公钥';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

  try {
    const { data, error } = await supabase
      .from('license_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return response.status(500).json({
        success: false,
        message: 'Database error'
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const validKeys = data.filter(key => 
      key.status === 'active' && key.expires_at > now
    );

    return response.status(200).json({
      success: true,
      data: {
        all: data,
        valid: validKeys,
        total: data.length,
        valid_count: validKeys.length
      }
    });

  } catch (error) {
    console.error('获取错误:', error);
    return response.status(500).json({
      success: false,
      message: 'Internal error'
    });
  }
}
