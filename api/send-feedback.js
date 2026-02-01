// 处理用户反馈的API
export default async function handler(request, response) {
  // 设置CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');

  if (request.method !== 'POST') {
    return response.status(405).json({
      success: false,
      message: 'Only POST method allowed'
    });
  }

  try {
    const { feedback, userId, userAgent } = request.body;

    // 验证反馈内容
    if (!feedback || feedback.trim().length < 5) {
      return response.status(400).json({
        success: false,
        message: 'Feedback must be at least 5 characters'
      });
    }

    // 这里您可以：
    // 1. 保存到数据库（Supabase）
    // 2. 发送到Discord Webhook
    // 3. 发送到邮件
    // 4. 或其他处理方式

    console.log(`📝 New feedback received: ${feedback.substring(0, 50)}...`);

    // 模拟成功响应
    return response.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        timestamp: new Date().toISOString(),
        feedbackLength: feedback.length,
        processed: true
      }
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    return response.status(500).json({
      success: false,
      message: 'Error processing feedback'
    });
  }
}
