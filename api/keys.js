// 共享内存（与generate.js中的allKeys相同）
let allKeys = [];

// 从generate.js导入（需要共享状态）
// 由于Vercel限制，我们可以使用一个简单的方法来共享
// 这里使用一个全局对象（注意：Vercel实例重启会重置）

export default async function handler(request, response) {
  // 设置CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

  try {
    // 返回所有卡密
    const now = Math.floor(Date.now() / 1000);
    const validKeys = allKeys.filter(key => key.expiresAt > now && key.status === 'active');
    
    return response.status(200).json({
      success: true,
      message: `Found ${validKeys.length} valid keys (${allKeys.length} total)`,
      data: {
        validKeys: validKeys,
        allKeys: allKeys,
        count: validKeys.length,
        total: allKeys.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return response.status(500).json({
      success: false,
      message: 'Error getting keys'
    });
  }
}
