export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { id, amount, useUniqueCode, packageIds, expiredInMinutes, prefix } = req.body;

    const response = await fetch('https://api.casaku.id/api/generate/qris', {
      method: 'POST',
      headers: {
        'x-license-key': process.env.CASAKU_LICENSE_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        id,
        amount,
        useUniqueCode: useUniqueCode ?? true,
        packageIds: packageIds ?? [],
        expiredInMinutes: expiredInMinutes ?? 15,
        prefix: prefix ?? 'INV',
      }),
    });

    const data = await response.json();

    if (response.ok && data.data) {
      return res.status(200).json({ success: true, data: data.data });
    } else {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Gagal generate QRIS',
      });
    }
  } catch (error) {
    console.error('Generate error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}