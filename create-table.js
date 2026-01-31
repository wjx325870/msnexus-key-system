import { createClient } from '@supabase/supabase-js'

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

  if (request.method !== 'POST') {
    return response.status(405).json({
      success: false,
      message: 'Only POST method is allowed'
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return response.status(400).json({
      success: false,
      message: 'Supabase credentials not configured'
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 创建license_keys表的SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS license_keys (
        id BIGSERIAL PRIMARY KEY,
        license_key VARCHAR(255) NOT NULL UNIQUE,
        expires_at BIGINT NOT NULL,
        expires_at_readable TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_license_keys_license_key ON license_keys(license_key);
      CREATE INDEX IF NOT EXISTS idx_license_keys_expires_at ON license_keys(expires_at);
      CREATE INDEX IF NOT EXISTS idx_license_keys_status ON license_keys(status);
    `;

    // 注意：Supabase JS客户端不能直接执行任意SQL
    // 您需要在Supabase Dashboard的SQL Editor中手动执行上面的SQL
    
    return response.status(200).json({
      success: true,
      message: 'Please manually create the table in Supabase SQL Editor',
      sql: createTableSQL,
      instructions: [
        '1. Go to Supabase Dashboard',
        '2. Click "SQL Editor" in left menu',
        '3. Create new query',
        '4. Paste the SQL above',
        '5. Click "Run"'
      ]
    });

  } catch (error) {
    console.error('Create table error:', error);
    return response.status(500).json({
      success: false,
      message: 'Error: ' + error.message
    });
  }
}
