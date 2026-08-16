/* ========================================================
   1. TOAST & AUDIO SYSTEM (WEB AUDIO API)
   ======================================================== */
let isAudioMuted = false;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function toggleAudio() {
  isAudioMuted = !isAudioMuted;
  document.getElementById('audioIcon').className = isAudioMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
  showToast(isAudioMuted ? "Efek Suara Dimatikan" : "Efek Suara Diaktifkan");
}

// Sintesis Suara Semboyan 41 & Semboyan 35
function playAudioSignal(type) {
  if (isAudioMuted) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 's41') {
    // Semboyan 41: Whistle High Pitch
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  } else if (type === 's35') {
    // Semboyan 35: Horn Dual-Tone Lokomotif
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc.frequency.setValueAtTime(311, audioCtx.currentTime); // Eb4
    osc2.frequency.setValueAtTime(370, audioCtx.currentTime); // F#4

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain2.gain.setValueAtTime(0.2, audioCtx.currentTime);

    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.5);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.5);

    osc.start(); osc2.start();
    osc.stop(audioCtx.currentTime + 2.5); osc2.stop(audioCtx.currentTime + 2.5);
  }
}

/* ========================================================
   2. TEMA & JAM REAL-TIME GAPEKA
   ======================================================== */
function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  showToast(`Mode Tampilan: ${newTheme.toUpperCase()}`);
}

function updateClock() {
  const now = new Date();
  document.getElementById('clock').innerText = now.toTimeString().split(' ')[0];
}
setInterval(updateClock, 1000);
updateClock();

function changeWeather(val) {
  const stage = document.getElementById('visualStage');
  stage.className = 'visual-stage ' + val;
  showToast(`Kondisi cuaca diubah: ${val.toUpperCase()}`);
}

/* ========================================================
   3. LOGIKA SIMULASI MEJA PPKA & LEMBAR LOK
   ======================================================== */
const ppkaState = { aspect: 'DANGER', s40: false, s41: false, s35: false };
let tripCounter = 1;

function appendLog(msg) {
  const logBox = document.getElementById('ppkaLog');
  const time = new Date().toLocaleTimeString();
  logBox.innerHTML += `<br>> [${time}] ${msg}`;
  logBox.scrollTop = logBox.scrollHeight;
}

function setSignal(aspect) {
  ppkaState.aspect = aspect;
  const light = document.getElementById('signalLight');
  const text = document.getElementById('signalText');
  const btnS40 = document.getElementById('btnS40');

  if (aspect === 'CLEAR') {
    light.className = 'light-indicator green';
    text.innerText = 'AMAN (GREEN)';
    btnS40.disabled = false;
    appendLog('PPKA mengubah aspek sinyal keluar menjadi AMAN.');
    showToast("Sinyal Keluar: AMAN");
  } else {
    light.className = 'light-indicator red';
    text.innerText = 'BAHAYA (RED)';
    btnS40.disabled = true;
    resetDispatch();
    appendLog('PPKA mengembalikan sinyal keluar ke BAHAYA.');
    showToast("Sinyal Keluar: BAHAYA");
  }
}

function triggerSemboyan40() {
  if (ppkaState.aspect !== 'CLEAR') return;
  ppkaState.s40 = true;
  document.getElementById('s40Visual').style.display = 'flex';
  appendLog('Semboyan 40: PPKA memberi izin berangkat dengan papan hijau.');
  setTimeout(triggerSemboyan41, 1200);
}

function triggerSemboyan41() {
  if (!ppkaState.s40) return;
  ppkaState.s41 = true;
  playAudioSignal('s41');
  appendLog('Semboyan 41: Kondektur menjawab dengan peluit panjang.');
  setTimeout(triggerSemboyan35, 1500);
}

function triggerSemboyan35() {
  if (!ppkaState.s41) return;
  ppkaState.s35 = true;
  playAudioSignal('s35');
  appendLog('Semboyan 35: Masinis membunyikan suling lokomotif!');

  const train = document.getElementById('trainSprite');
  train.style.transform = 'translateX(260px)';
  appendLog('Rangkaian Kereta Api bergerak melintasi emplasemen.');

  addLokRecord(`KA Extra #${tripCounter++}`, 'S40/41/35 Lengkap', 'Berangkat Lengkap');
  setTimeout(resetDispatch, 4000);
}

function resetDispatch() {
  ppkaState.s40 = false; ppkaState.s41 = false; ppkaState.s35 = false;
  document.getElementById('s40Visual').style.display = 'none';
  document.getElementById('trainSprite').style.transform = 'translateX(0px)';
}

function addLokRecord(kaNo, semboyanStatus, status) {
  const tbody = document.getElementById('lokTableBody');
  if (tripCounter === 2) tbody.innerHTML = ''; // Hapus baris default

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${new Date().toLocaleTimeString()}</td>
    <td><strong>${kaNo}</strong></td>
    <td>${semboyanStatus}</td>
    <td><span style="color:var(--success-color); font-weight:bold;">${status}</span></td>
  `;
  tbody.prepend(row);
}

/* ========================================================
   4. TRANSAKSI DIGITAL, KALKULATOR ESCROW & WA
   ======================================================== */
let lastGeneratedInvoice = null;

function calculateFee() {
  const itemVal = document.getElementById('itemSelect').value.split('|');
  const category = itemVal[2];
  const container = document.getElementById('escrowFeeContainer');
  
  if (category === 'escrow') {
    container.style.display = 'block';
    const nominal = parseFloat(document.getElementById('escrowNominal').value) || 0;
    let fee = 5000;
    if (nominal > 500000) fee = 15000;
    if (nominal > 2000000) fee = 25000;
    document.getElementById('feeBadge').innerText = `Biaya Admin Escrow: Rp ${fee.toLocaleString('id-ID')}`;
  } else {
    container.style.display = 'none';
  }
}

function getFinalPrice() {
  const itemVal = document.getElementById('itemSelect').value.split('|');
  let basePrice = parseInt(itemVal[1]);
  if (itemVal[2] === 'escrow') {
    const nominal = parseFloat(document.getElementById('escrowNominal').value) || 0;
    let fee = 5000;
    if (nominal > 500000) fee = 15000;
    if (nominal > 2000000) fee = 25000;
    return basePrice + fee;
  }
  return basePrice;
}

function handleCheckout(e) {
  e.preventDefault();
  const custName = document.getElementById('custName').value;
  const targetId = document.getElementById('targetId').value;
  const itemName = document.getElementById('itemSelect').value.split('|')[0];
  const finalPrice = getFinalPrice();

  const invoiceId = 'INV-' + Math.floor(100000 + Math.random() * 900000);
  lastGeneratedInvoice = { invoiceId, custName, targetId, itemName, finalPrice };

  // Generate QR Code di Modal
  document.getElementById('qrcode').innerHTML = "";
  new QRCode(document.getElementById('qrcode'), {
    text: `https://qris.payment.engine/pay?inv=${invoiceId}&amount=${finalPrice}`,
    width: 160,
    height: 160
  });

  document.getElementById('qrisTotal').innerText = `Total: Rp ${finalPrice.toLocaleString('id-ID')}`;
  document.getElementById('qrisModal').style.display = 'flex';
}

function confirmQrisPayment() {
  document.getElementById('qrisModal').style.display = 'none';
  showToast("Pembayaran Dikonfirmasi! Mengunduh Invoice...");
  downloadPDFInvoice(lastGeneratedInvoice);
}

function downloadPDFInvoice(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString('id-ID');

  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("INVOICE TRANSAKSI DIGITAL & SERVICES", 20, 20);

  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`No. Invoice : ${data.invoiceId}`, 20, 32);
  doc.text(`Tanggal     : ${dateStr}`, 20, 38);
  doc.text(`Pelanggan   : ${data.custName}`, 20, 44);
  doc.text(`Target ID   : ${data.targetId}`, 20, 50);

  doc.line(20, 55, 190, 55);

  doc.setFont("helvetica", "bold");
  doc.text("Deskripsi Produk", 20, 65);
  doc.text("Subtotal", 160, 65);

  doc.setFont("helvetica", "normal");
  doc.text(data.itemName, 20, 75);
  doc.text(`Rp ${data.finalPrice.toLocaleString('id-ID')}`, 160, 75);

  doc.line(20, 82, 190, 82);
  doc.setFont("helvetica", "bold");
  doc.text("Total Pembayaran", 20, 92);
  doc.text(`Rp ${data.finalPrice.toLocaleString('id-ID')}`, 160, 92);

  doc.setFontSize(8); doc.setFont("helvetica", "italic");
  doc.text("Dokumen ini diterbitkan sah secara komputerisasi.", 20, 110);

  doc.save(`${data.invoiceId}.pdf`);
}

function sendToWhatsApp() {
  const custName = document.getElementById('custName').value || '-';
  const targetId = document.getElementById('targetId').value || '-';
  const itemName = document.getElementById('itemSelect').value.split('|')[0];
  const price = getFinalPrice();

  if (!custName || targetId === '-') {
    showToast("Isi nama dan Target ID sebelum WhatsApp Order");
    return;
  }

  const adminPhone = "6281234567890"; // Nomor WhatsApp tujuan admin Anda
  const textMsg = `Halo Admin, saya ingin konfirmasi pesanan:\n\n` +
                  `*Nama:* ${custName}\n` +
                  `*Layanan:* ${itemName}\n` +
                  `*Target ID:* ${targetId}\n` +
                  `*Total Harga:* Rp ${price.toLocaleString('id-ID')}\n\n` +
                  `Mohon diproses, terima kasih!`;

  window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(textMsg)}`, '_blank');
}
