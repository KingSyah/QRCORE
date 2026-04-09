/**
 * QR Code Generator — client-side only
 * Uses qrcode-generator library for QR data, renders to canvas for PNG export.
 */
(function () {
  'use strict';

  // --- DOM refs ---
  const textInput    = document.getElementById('text-input');
  const charCount    = document.getElementById('char-count');
  const errorMessage = document.getElementById('error-message');
  const sizeSelect   = document.getElementById('qr-size');
  const fgColor      = document.getElementById('qr-fg');
  const bgColor      = document.getElementById('qr-bg');
  const fgHex        = document.getElementById('fg-hex');
  const bgHex        = document.getElementById('bg-hex');
  const generateBtn  = document.getElementById('generate-btn');
  const resultSection= document.getElementById('result-section');
  const qrOutput     = document.getElementById('qr-output');
  const downloadBtn  = document.getElementById('download-btn');

  let currentCanvas = null;

  // --- Character counter ---
  textInput.addEventListener('input', function () {
    charCount.textContent = this.value.length + ' / 2000';
    clearError();
  });

  // --- Color hex display ---
  fgColor.addEventListener('input', function () {
    fgHex.textContent = this.value;
  });
  bgColor.addEventListener('input', function () {
    bgHex.textContent = this.value;
  });

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

  // Enter key in textarea (Ctrl/Cmd + Enter to generate)
  textInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateBtn.click();
    }
  });

  // --- Download ---
  downloadBtn.addEventListener('click', function () {
    if (!currentCanvas) return;
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = currentCanvas.toDataURL('image/png');
    link.click();
  });

  // --- Core QR generation ---
  function generateQR(text) {
    const size = parseInt(sizeSelect.value, 10);
    const fg   = fgColor.value;
    const bg   = bgColor.value;

    // Determine best QR version & error correction
    // TypeNumber 0 = auto-detect, correction level M
    const typeNumber = 0;
    const errorCorrectionLevel = 'M';

    let qr;
    try {
      // eslint-disable-next-line no-undef
      qr = qrcode(typeNumber, errorCorrectionLevel);
      qr.addData(text);
      qr.make();
    } catch (e) {
      showError('Could not generate QR code. Text may be too long or contain unsupported characters.');
      return;
    }

    // Render to canvas
    const moduleCount = qr.getModuleCount();
    const cellSize = Math.floor(size / moduleCount);
    const canvasSize = cellSize * moduleCount;

    const canvas = document.createElement('canvas');
    canvas.width  = canvasSize;
    canvas.height = canvasSize;
    canvas.style.width  = canvasSize + 'px';
    canvas.style.height = canvasSize + 'px';

    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Modules
    ctx.fillStyle = fg;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
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

    // Smooth scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
