import { createClient } from '@supabase/supabase-js'

// 内存存储
let memoryKeys = [];

export default async function handler(request, response) {
  // 设置CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

  try {
    let keysFromDatabase = [];
    let databaseSource = 'memory';
    let databaseError = null;
    
    // 尝试从Supabase获取
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // 从license_keys表获取数据
        const { data, error } = await supabase
          .from('license_keys')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Supabase query error:', error);
          databaseError = error.message;
        } else if (data) {
          keysFromDatabase = data.map(item => ({
            licenseKey: item.license_key,
            expiresAt: item.expires_at,
            expiresAtReadable: item.expires_at_readable,
            generatedAt: item.generated_at,
            status: item.status || 'active',
            id: item.id,
            source: 'supabase'
          }));
          databaseSource = 'supabase';
        }
      } catch (supabaseError) {
        console.error('Supabase connection error:', supabaseError);
        databaseError = supabaseError.message;
      }
    }

    // 合并内存中的卡密（避免重复）
    const allKeysMap = new Map();
    
    // 先添加数据库的卡密
    keysFromDatabase.forEach(key => {
      allKeysMap.set(key.licenseKey, key);
    });
    
    // 再添加内存的卡密（数据库没有的）
    memoryKeys.forEach(key => {
      if (!allKeysMap.has(key.licenseKey)) {
        allKeysMap.set(key.licenseKey, {
          ...key,
          source: 'memory'
        });
      }
    });
    
    // 转换为数组并排序（最新的在前面）
    const allKeys = Array.from(allKeysMap.values())
      .sort((a, b) => (b.id || 0) - (a.id || 0));

    // 过滤有效卡密
    const now = Math.floor(Date.now() / 1000);
    const validKeys = allKeys.filter(key => {
      const expired = key.expiresAt < now;
      const status = key.status || 'active';
      return !expired && status === 'active';
    });

    // 统计来源
    const supabaseKeys = allKeys.filter(k => k.source === 'supabase').length;
    const memoryKeysCount = allKeys.filter(k => k.source === 'memory').length;

    return response.status(200).json({
      success: true,
      message: `Found ${validKeys.length} valid keys (${allKeys.length} total)`,
      data: {
        validKeys: validKeys,
        allKeys: allKeys,
        validCount: validKeys.length,
        totalCount: allKeys.length,
        source: databaseSource,
        sourceStats: {
          supabase: supabaseKeys,
          memory: memoryKeysCount
        },
        databaseError: databaseError,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Get keys error:', error);
    return response.status(500).json({
      success: false,
      message: 'Error getting keys: ' + error.message,
      data: {
        validKeys: [],
        allKeys: memoryKeys,
        validCount: 0,
        totalCount: memoryKeys.length,
        source: 'memory (error fallback)',
        error: error.message
      }
    });
  }
}
