import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const rawPayload = JSON.stringify(req.body);
    const signature = req.headers['x-casaku-signature'];

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.CASAKU_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.log('Invalid signature');
      return res.status(401).json({ status: 'error', message: 'Invalid signature' });
    }

    const data = req.body;

    if (!data.transactionId || !data.status) {
      return res.status(400).json({ status: 'error', message: 'Invalid payload' });
    }

    console.log('Webhook received:', {
      transactionId: data.transactionId,
      status: data.status,
      amount: data.amount,
      package: data.packageName,
    });

    // Process berdasarkan status
    if (data.status === 'paid') {
      // TODO: Update database, aktifkan paket, kirim email, dll.
      console.log(`✅ Payment SUCCESS: ${data.transactionId}`);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Webhook processed',
      transactionId: data.transactionId,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
}