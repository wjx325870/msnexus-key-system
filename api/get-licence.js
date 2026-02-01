import { supabase } from '../../utils/supabase.js'

export default async function handler(req, res) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing userId parameter' 
      })
    }

    // 查询用户的所有卡密（按创建时间排序）
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 格式化返回数据
    const formattedLicenses = licenses.map(license => ({
      id: license.id,
      key: license.license_key,
      status: license.status,
      created_at: license.created_at,
      expires_at: license.expires_at,
      last_used: license.last_used
    }))

    return res.status(200).json({
      success: true,
      count: formattedLicenses.length,
      licenses: formattedLicenses
    })

  } catch (error) {
    console.error('Get license error:', error)
    return res.status(500).json({ 
      error: 'Internal server error' 
    })
  }
}
