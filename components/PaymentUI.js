import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const packages = {
  '1B': [
    { name: '1B FAST', price: 120000, speed: '10 MENIT - 1 JAM', icon: '🚀' },
    { name: '1B SEMI FAST', price: 75000, speed: '1 - 5 JAM', icon: '⚡' },
    { name: '1B SLOW', price: 65000, speed: '1 HARI', icon: '🕒' },
  ],
  '3B': [
    { name: '3B FAST', price: 230000, speed: '10 MENIT - 1 JAM', icon: '🚀' },
    { name: '3B SEMI FAST', price: 150000, speed: '1 - 5 JAM', icon: '⚡' },
    { name: '3B SLOW', price: 140000, speed: '1 HARI', icon: '🕒' },
  ],
};

export default function PaymentUI() {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [currentTransactionId, setCurrentTransactionId] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [status, setStatus] = useState('pending');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const statusInterval = useRef(null);

  const phoneNumber = process.env.NEXT_PUBLIC_PHONE_NUMBER || '6288269865083';

  // Cleanup interval
  useEffect(() => {
    return () => {
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
      }
    };
  }, []);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Select package
  const selectPackage = (pkg) => {
    setSelectedPackage(pkg);
    showNotification(`✅ ${pkg.name} dipilih!`);
  };

  // Generate QRIS
  const generateQRIS = async (pkg) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/generate', {
        id: `ORD-${Date.now()}`,
        amount: pkg.price,
        useUniqueCode: true,
        packageIds: [pkg.name.toLowerCase().replace(/\s/g, '_')],
        expiredInMinutes: 15,
        prefix: 'INV',
      });

      if (response.data.success) {
        const data = response.data.data;
        setCurrentTransactionId(data.transactionId);
        setQrData(data);
        setStatus('pending');
        
        setLoading(false);
        setShowQRModal(true);
        
        // Auto check status every 5 seconds
        if (statusInterval.current) {
          clearInterval(statusInterval.current);
        }
        statusInterval.current = setInterval(checkStatus, 5000);
        
        showNotification('✅ QR Code berhasil digenerate!');
      } else {
        throw new Error(response.data.message || 'Gagal generate QRIS');
      }
    } catch (error) {
      console.error('Generate error:', error);
      setLoading(false);
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  // Check status
  const checkStatus = async () => {
    if (!currentTransactionId) return;

    try {
      const response = await axios.post('/api/check-status', {
        transactionId: currentTransactionId,
      });

      if (response.data.success) {
        const newStatus = response.data.data.status;
        setStatus(newStatus);

        if (newStatus === 'paid') {
          showNotification('🎉 Pembayaran berhasil! Terima kasih!');
          if (statusInterval.current) {
            clearInterval(statusInterval.current);
            statusInterval.current = null;
          }
          setTimeout(() => {
            setShowQRModal(false);
            sendWhatsAppConfirmation();
          }, 2000);
        } else if (newStatus === 'expired') {
          showNotification('⏰ Transaksi kadaluarsa', 'warning');
          if (statusInterval.current) {
            clearInterval(statusInterval.current);
            statusInterval.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  };

  // Cancel transaction
  const cancelTransaction = async () => {
    if (!currentTransactionId) return;
    if (!confirm('Yakin ingin membatalkan transaksi?')) return;

    try {
      const response = await axios.post('/api/cancel', {
        transactionId: currentTransactionId,
      });

      if (response.data.success) {
        showNotification('✅ Transaksi dibatalkan');
        setStatus('cancel');
        if (statusInterval.current) {
          clearInterval(statusInterval.current);
          statusInterval.current = null;
        }
      }
    } catch (error) {
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  // Process payment
  const processPayment = () => {
    if (!selectedPayment) {
      showNotification('⚠️ Pilih metode pembayaran dulu!', 'warning');
      return;
    }

    setShowPaymentModal(false);

    if (selectedPayment === 'QRIS') {
      generateQRIS(selectedPackage);
    } else {
      sendWhatsAppMessage();
    }
  };

  // WhatsApp
  const sendWhatsAppMessage = () => {
    const message = `Halo WISH STORE, saya ingin order paket *${selectedPackage?.name}* dengan detail:\n\n📦 Paket: ${selectedPackage?.name}\n💰 Harga: Rp ${selectedPackage?.price?.toLocaleString('id-ID')}\n💳 Metode: ${selectedPayment}\n\nSaya siap melakukan pembayaran.`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const sendWhatsAppConfirmation = () => {
    const message = `Halo WISH STORE, saya sudah melakukan pembayaran untuk paket *${selectedPackage?.name}*.\n\n📦 Paket: ${selectedPackage?.name}\n💰 Harga: Rp ${selectedPackage?.price?.toLocaleString('id-ID')}\n💳 Metode: QRIS\n🆔 Transaction ID: ${currentTransactionId}\n\nMohon proses order saya. Terima kasih!`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Copy text
  const copyText = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('✅ Berhasil disalin!');
    });
  };

  // Status badge color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-400 text-black',
      paid: 'bg-green-500 text-white',
      expired: 'bg-red-500 text-white',
      cancel: 'bg-gray-500 text-white',
    };
    return colors[status] || 'bg-gray-500 text-white';
  };

  return (
    <div className="min-h-screen bg-[#0b0d11] text-white">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full font-semibold shadow-lg 
          ${notification.type === 'error' ? 'bg-red-500' : 
            notification.type === 'warning' ? 'bg-yellow-400 text-black' : 
            'bg-green-500'}`}>
          {notification.message}
        </div>
      )}

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0b0d11]/90 backdrop-blur-md border-b border-yellow-500/20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center gap-4">
          <span className="text-2xl font-bold text-yellow-400">WISH</span>
          <span className="text-2xl font-bold text-white">STORE</span>
          <a href="#services" className="px-4 py-2 rounded-full text-sm font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-all">
            <i className="fas fa-shopping-cart mr-1"></i> Beli
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-20 px-4" style={{ background: 'linear-gradient(135deg, #0b0d11 0%, #1a1a2e 100%)' }}>
        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-8 items-center">
          <div className="text-center lg:text-left space-y-6">
            <h1 className="text-4xl md:text-6xl font-extrabold">
              <span className="text-white">WISH</span>
              <span className="text-yellow-400">STORE</span>
              <span className="block text-2xl text-gray-300 mt-2">🔐 Unlock IMEI iPhone</span>
            </h1>
            <p className="text-gray-400 text-lg">Spesialis Unlock IMEI iPhone dengan server premium. Fast response 24/7.</p>
            <a href="#services" className="inline-block px-6 py-3 rounded-2xl bg-yellow-400 text-black font-bold hover:scale-105 transition-all">
              <i className="fas fa-bolt mr-2"></i> Lihat Layanan
            </a>
          </div>
          
          <div className="relative">
            <div className="rounded-3xl p-6 border border-yellow-500/20" style={{ background: 'linear-gradient(145deg, rgba(20,24,30,0.9), rgba(10,12,16,0.9))' }}>
              <div className="text-center text-yellow-400 font-bold">🔐 IMEI BY WISH STORE</div>
              <div className="text-center text-blue-400 text-xs">PREMIUM SERVICE</div>
              <div className="space-y-2 text-sm mt-4">
                <div className="flex justify-between"><span className="text-gray-400">Status</span><span className="text-green-400">✅ Active</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Garansi</span><span className="text-yellow-300">1 Bulan / 3 Bulan</span></div>
              </div>
              <button onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })} className="w-full mt-4 bg-yellow-400 text-black font-bold py-3 rounded-xl hover:scale-105 transition-all">
                <i className="fas fa-shopping-cart mr-2"></i> Beli Sekarang
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="px-4 py-16 bg-[#0f1219]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-yellow-400 font-semibold">📦 PILIHAN LAYANAN</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">Paket Unlock IMEI</h2>
          </div>

          {Object.entries(packages).map(([category, items]) => (
            <div key={category} className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                <span className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full">{category}</span>
                <span className="text-gray-300 ml-2">Garansi {category === '1B' ? '1 Bulan' : '3 Bulan'}</span>
                {category === '3B' && (
                  <span className="text-xs bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full ml-2">⭐ BEST SELLER</span>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {items.map((pkg) => (
                  <div
                    key={pkg.name}
                    className={`bg-[#14181e] rounded-2xl p-6 border-2 transition-all cursor-pointer
                      ${selectedPackage?.name === pkg.name ? 'border-yellow-400 bg-yellow-500/10' : 'border-yellow-500/10 hover:border-yellow-400'}`}
                    onClick={() => selectPackage(pkg)}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">{pkg.icon}</div>
                      <h4 className="text-white font-bold text-xl">{pkg.name}</h4>
                      <p className="text-gray-400 text-sm">{pkg.speed}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Garansi</span>
                          <span className="text-white">{category === '1B' ? '1 Bulan' : '3 Bulan'}</span>
                        </div>
                        <div className="text-yellow-400 font-bold text-2xl">Rp {pkg.price.toLocaleString('id-ID')}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectPackage(pkg);
                          setShowPaymentModal(true);
                        }}
                        className="w-full mt-4 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-bold py-2 rounded-xl border border-yellow-500/30 transition-all"
                      >
                        Pilih
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Selected Service */}
          {selectedPackage && (
            <div className="mt-10 p-6 rounded-2xl bg-yellow-500/5 border border-yellow-500/20">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Paket dipilih:</p>
                  <p className="text-white font-bold text-xl">{selectedPackage.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total:</p>
                  <p className="text-yellow-400 font-bold text-2xl">Rp {selectedPackage.price.toLocaleString('id-ID')}</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl hover:scale-105 transition-all"
                >
                  <i className="fas fa-shopping-cart mr-2"></i> Pesan Sekarang
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f1219] rounded-3xl p-6 max-w-lg w-full border border-yellow-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-white">Pilih Metode Pembayaran</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white text-3xl">&times;</button>
            </div>

            <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mb-4">
              <p className="text-gray-400 text-sm">Paket:</p>
              <p className="text-white font-bold text-lg">{selectedPackage?.name}</p>
              <p className="text-gray-400 text-sm mt-2">Total:</p>
              <p className="text-yellow-400 font-bold text-2xl">Rp {selectedPackage?.price?.toLocaleString('id-ID')}</p>
            </div>

            {['QRIS', 'DANA', 'SeaBank'].map((method) => (
              <div
                key={method}
                className={`bg-[#14181e] rounded-xl p-4 mb-3 border-2 transition-all cursor-pointer
                  ${selectedPayment === method ? 'border-yellow-400 bg-yellow-500/10' : 'border-yellow-500/10 hover:border-yellow-400'}`}
                onClick={() => setSelectedPayment(method)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                      ${method === 'QRIS' ? 'bg-green-500/20' : 
                        method === 'DANA' ? 'bg-blue-500/20' : 
                        'bg-red-500/20'}`}>
                      {method === 'QRIS' ? '📱' : method === 'DANA' ? '💜' : '🏦'}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{method}</p>
                      <p className="text-gray-400 text-xs">
                        {method === 'QRIS' ? 'Gopay, OVO, DANA, dll' :
                         method === 'DANA' ? 'Dompet Digital DANA' :
                         'Transfer Bank SeaBank'}
                      </p>
                    </div>
                  </div>
                  {selectedPayment === method && (
                    <div className="w-6 h-6 rounded-full border-2 border-yellow-400 flex items-center justify-center">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={processPayment}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:scale-105 transition-all"
            >
              <i className="fab fa-whatsapp mr-2"></i> Lanjut ke WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f1219] rounded-3xl p-6 max-w-md w-full border border-yellow-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-white">💳 Pembayaran QRIS</h3>
              <button onClick={() => { setShowQRModal(false); if (statusInterval.current) clearInterval(statusInterval.current); }} className="text-gray-400 hover:text-white text-3xl">&times;</button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block w-12 h-12 border-4 border-yellow-400 rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-4">Mengenerate QR Code...</p>
              </div>
            ) : (
              <div className="text-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData.qr_string)}`}
                  alt="QR Code"
                  className="mx-auto rounded-xl border border-yellow-500/20 p-2 bg-white"
                  style={{ maxWidth: '200px' }}
                />
                <p className="text-gray-400 text-sm mt-3">Scan QR Code untuk membayar</p>

                <div className="mt-3 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                  <p className="text-gray-400 text-xs">Transaction ID</p>
                  <p className="text-white font-mono text-sm break-all">{qrData.transactionId}</p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="p-2 bg-white/5 rounded-xl">
                    <p className="text-gray-400 text-xs">Total</p>
                    <p className="text-yellow-400 font-bold">Rp {qrData.totalAmount.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl">
                    <p className="text-gray-400 text-xs">Status</p>
                    <p className={`px-2 py-1 rounded-full text-xs font-semibold inline-block ${getStatusColor(status)}`}>
                      {status.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => copyText(qrData.transactionId)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-2 rounded-xl transition-all text-sm"
                  >
                    <i className="fas fa-copy mr-1"></i> Copy ID
                  </button>
                  <button
                    onClick={checkStatus}
                    className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-semibold py-2 rounded-xl transition-all text-sm"
                  >
                    <i className="fas fa-sync mr-1"></i> Cek Status
                  </button>
                </div>

                <button
                  onClick={cancelTransaction}
                  className="w-full mt-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-2 rounded-xl transition-all text-sm"
                >
                  <i className="fas fa-times mr-1"></i> Batalkan Transaksi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0a0c10] border-t border-yellow-500/10 px-4 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400 text-sm">© 2026 WISH STORE · IMEI Premium Service</p>
          <p className="text-gray-500 text-xs mt-2">Made with ❤️ by WISNU MAHARDIKA</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}