export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID required' });
    }

    const response = await fetch('https://api.casaku.id/api/generate/cancel-status', {
      method: 'POST',
      headers: {
        'x-license-key': process.env.CASAKU_LICENSE_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ transactionId }),
    });

    const data = await response.json();

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Cancel error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}