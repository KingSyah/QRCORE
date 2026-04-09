/**
 * QR Code Generator — client-side only
 * Uses qrcode-generator for QR data, renders to canvas for PNG/JPG/PDF export.
 */
(function () {
  'use strict';

  // --- DOM refs ---
  const textInput     = document.getElementById('text-input');
  const charCount     = document.getElementById('char-count');
  const errorMessage  = document.getElementById('error-message');
  const sizeSelect    = document.getElementById('qr-size');
  const fgColor       = document.getElementById('qr-fg');
  const bgColor       = document.getElementById('qr-bg');
  const fgHex         = document.getElementById('fg-hex');
  const bgHex         = document.getElementById('bg-hex');
  const generateBtn   = document.getElementById('generate-btn');
  const resultSection = document.getElementById('result-section');
  const qrOutput      = document.getElementById('qr-output');
  const downloadPng   = document.getElementById('download-png');
  const downloadJpg   = document.getElementById('download-jpg');
  const downloadPdf   = document.getElementById('download-pdf');

  let currentCanvas = null;

  // --- Copyright auto-year ---
  const el = document.getElementById('copyright-text');
  if (el) el.textContent = '\u00A9 ' + new Date().getFullYear() + ' KingSyah';

  // --- Character counter ---
  textInput.addEventListener('input', function () {
    charCount.textContent = this.value.length + ' / 2000';
    clearError();
  });

  // --- Color hex display ---
  fgColor.addEventListener('input', function () { fgHex.textContent = this.value; });
  bgColor.addEventListener('input', function () { bgHex.textContent = this.value; });

  // --- Generate ---
  generateBtn.addEventListener('click', function () {
    const text = textInput.value.trim();

    if (!text) {
      showError('Please enter some text or a URL.');
      return;
    }

    if (text.length > 2000) {
      showError('Text is too long. Maximum 2000 characters.');
      return;
    }

    clearError();
    generateQR(text);
  });

  // Ctrl/Cmd + Enter shortcut
  textInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateBtn.click();
    }
  });

  // --- Download handlers ---
  downloadPng.addEventListener('click', function () {
    if (!currentCanvas) return;
    triggerDownload(currentCanvas.toDataURL('image/png'), 'qrcode.png');
  });

  downloadJpg.addEventListener('click', function () {
    if (!currentCanvas) return;
    // JPG needs white background behind transparency
    var jpgCanvas = document.createElement('canvas');
    jpgCanvas.width = currentCanvas.width;
    jpgCanvas.height = currentCanvas.height;
    var ctx = jpgCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
    ctx.drawImage(currentCanvas, 0, 0);
    triggerDownload(jpgCanvas.toDataURL('image/jpeg', 0.95), 'qrcode.jpg');
  });

  downloadPdf.addEventListener('click', function () {
    if (!currentCanvas) return;
    downloadAsPdf(currentCanvas);
  });

  // --- Core QR generation ---
  function generateQR(text) {
    var size = parseInt(sizeSelect.value, 10);
    var fg   = fgColor.value;
    var bg   = bgColor.value;

    var qr;
    try {
      // TypeNumber 0 = auto-detect, correction level M
      qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
    } catch (e) {
      showError('Could not generate QR code. Text may be too long or contain unsupported characters.');
      return;
    }

    // Render to canvas
    var moduleCount = qr.getModuleCount();
    var cellSize = Math.floor(size / moduleCount);
    var canvasSize = cellSize * moduleCount;

    var canvas = document.createElement('canvas');
    canvas.width  = canvasSize;
    canvas.height = canvasSize;
    canvas.style.width  = canvasSize + 'px';
    canvas.style.height = canvasSize + 'px';

    var ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Modules
    ctx.fillStyle = fg;
    for (var row = 0; row < moduleCount; row++) {
      for (var col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    // Swap in result
    qrOutput.innerHTML = '';
    qrOutput.appendChild(canvas);
    currentCanvas = canvas;
    resultSection.classList.remove('hidden');

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // --- Download helpers ---
  function triggerDownload(dataUrl, filename) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadAsPdf(canvas) {
    // jsPDF is loaded as UMD — access via window.jspdf
    var jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
    if (!jsPDF) {
      showError('PDF library not loaded. Please refresh and try again.');
      return;
    }

    var imgData = canvas.toDataURL('image/png');
    var canvasW = canvas.width;
    var canvasH = canvas.height;

    // Determine orientation
    var orientation = canvasW > canvasH ? 'l' : 'p';

    // PDF dimensions in mm (A4-ish, fit to content)
    var pdfW = Math.max(canvasW * 0.264583, 50); // px to mm
    var pdfH = Math.max(canvasH * 0.264583, 50);

    var doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [pdfW + 20, pdfH + 20] // 10mm padding each side
    });

    // Center QR in page
    var x = ((pdfW + 20) - pdfW) / 2;
    var y = ((pdfH + 20) - pdfH) / 2;

    doc.addImage(imgData, 'PNG', x, y, pdfW, pdfH);
    doc.save('qrcode.pdf');
  }

  // --- Helpers ---
  function showError(msg) {
    errorMessage.textContent = msg;
    resultSection.classList.add('hidden');
    currentCanvas = null;
  }

  function clearError() {
    errorMessage.textContent = '';
  }
})();
