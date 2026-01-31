// api/keys.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rzdepwljvkgcaxhpypcm.supabase.co';
const supabaseKey = 'sb_publishable_DNwr0ZVOvw7rXrVB1v3oMA_dmQLUJxK';
const supabase = createClient(supabaseUrl, supabaseKey);

// 内存备份
let memoryKeys = [];

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

  try {
    let allKeys = [];
    let source = 'memory';
    
    // 优先从Supabase获取
    try {
      const { data, error } = await supabase
        .from('license_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        allKeys = data.map(item => ({
          licenseKey: item.license_key,
          expiresAt: item.expires_at,
          expiresAtReadable: item.expires_at_readable,
          generatedAt: item.generated_at,
          status: item.status,
          ip: item.ip,
          id: item.id
        }));
        source = 'supabase';
      }
    } catch (error) {
      console.error('从Supabase获取失败:', error);
      allKeys = memoryKeys;
      source = 'memory (fallback)';
    }
    
    // 过滤有效卡密
    const now = Math.floor(Date.now() / 1000);
    const validKeys = allKeys.filter(key => {
      const expired = key.expiresAt < now;
      const status = key.status || 'active';
      return !expired && status === 'active';
    });
    
    return response.status(200).json({
      success: true,
      message: `找到 ${validKeys.length} 个有效卡密（共 ${allKeys.length} 个）`,
      data: {
        validKeys: validKeys,
        allKeys: allKeys,
        validCount: validKeys.length,
        totalCount: allKeys.length,
        source: source,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('获取卡密错误:', error);
    return response.status(500).json({
      success: false,
      message: '获取失败'
    });
  }
}
