/**
 * QR & Barcode Generator — client-side only
 * QR: qrcode-generator → canvas
 * Barcode: JsBarcode → SVG → canvas (for PNG export)
 */
(function () {
  'use strict';

  // =============================================
  // TAB SWITCHING
  // =============================================
  var tabs = document.querySelectorAll('.tab');
  var panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = this.getAttribute('data-tab');

      // Update tab buttons
      tabs.forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');

      // Update panels
      panels.forEach(function (p) {
        p.classList.remove('active');
      });
      document.getElementById('panel-' + target).classList.add('active');

      // Reset results when switching tabs
      resetResults();
    });
  });

  function resetResults() {
    // Hide QR result
    document.getElementById('qr-result').classList.add('hidden');
    document.getElementById('qr-output').innerHTML = '';
    currentQrCanvas = null;

    // Hide barcode result
    document.getElementById('barcode-result').classList.add('hidden');
    document.getElementById('barcode-output').innerHTML = '';

    // Clear errors
    document.getElementById('qr-error').textContent = '';
    document.getElementById('barcode-error').textContent = '';
  }

  // =============================================
  // QR CODE SECTION
  // =============================================
  var qrInput     = document.getElementById('qr-input');
  var qrCharCount = document.getElementById('qr-char-count');
  var qrError     = document.getElementById('qr-error');
  var qrSizeSel   = document.getElementById('qr-size');
  var qrFg        = document.getElementById('qr-fg');
  var qrBg        = document.getElementById('qr-bg');
  var qrFgHex     = document.getElementById('qr-fg-hex');
  var qrBgHex     = document.getElementById('qr-bg-hex');
  var qrGenBtn    = document.getElementById('qr-generate-btn');
  var qrResult    = document.getElementById('qr-result');
  var qrOutput    = document.getElementById('qr-output');

  var currentQrCanvas = null;

  // Character counter
  qrInput.addEventListener('input', function () {
    qrCharCount.textContent = this.value.length + ' / 2000';
    qrError.textContent = '';
  });

  // Color hex display
  qrFg.addEventListener('input', function () { qrFgHex.textContent = this.value; });
  qrBg.addEventListener('input', function () { qrBgHex.textContent = this.value; });

  // Generate QR
  qrGenBtn.addEventListener('click', function () {
    var text = qrInput.value.trim();

    if (!text) {
      qrError.textContent = 'Please enter some text or a URL.';
      qrResult.classList.add('hidden');
      currentQrCanvas = null;
      return;
    }

    if (text.length > 2000) {
      qrError.textContent = 'Text is too long. Maximum 2000 characters.';
      return;
    }

    qrError.textContent = '';
    generateQR(text);
  });

  // Ctrl/Cmd + Enter shortcut
  qrInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      qrGenBtn.click();
    }
  });

  function generateQR(text) {
    var size = parseInt(qrSizeSel.value, 10);
    var fg = qrFg.value;
    var bg = qrBg.value;

    var qr;
    try {
      qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
    } catch (e) {
      qrError.textContent = 'Could not generate QR code. Text may be too long or contain unsupported characters.';
      return;
    }

    var moduleCount = qr.getModuleCount();
    var cellSize = Math.floor(size / moduleCount);
    var canvasSize = cellSize * moduleCount;

    var canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    canvas.style.width = canvasSize + 'px';
    canvas.style.height = canvasSize + 'px';

    var ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = fg;

    for (var row = 0; row < moduleCount; row++) {
      for (var col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    qrOutput.innerHTML = '';
    qrOutput.appendChild(canvas);
    currentQrCanvas = canvas;
    qrResult.classList.remove('hidden');
    qrResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // QR Downloads
  document.getElementById('qr-download-png').addEventListener('click', function () {
    if (!currentQrCanvas) return;
    triggerDownload(currentQrCanvas.toDataURL('image/png'), 'qrcode.png');
  });

  document.getElementById('qr-download-jpg').addEventListener('click', function () {
    if (!currentQrCanvas) return;
    var jpgCanvas = document.createElement('canvas');
    jpgCanvas.width = currentQrCanvas.width;
    jpgCanvas.height = currentQrCanvas.height;
    var ctx = jpgCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
    ctx.drawImage(currentQrCanvas, 0, 0);
    triggerDownload(jpgCanvas.toDataURL('image/jpeg', 0.95), 'qrcode.jpg');
  });

  document.getElementById('qr-download-pdf').addEventListener('click', function () {
    if (!currentQrCanvas) return;
    downloadAsPdf(currentQrCanvas);
  });

  // =============================================
  // BARCODE SECTION
  // =============================================
  var barcodeInput  = document.getElementById('barcode-input');
  var barcodeHint   = document.getElementById('barcode-hint');
  var barcodeError  = document.getElementById('barcode-error');
  var barcodeType   = document.getElementById('barcode-type');
  var barcodeWidth  = document.getElementById('barcode-width');
  var barcodeHeight = document.getElementById('barcode-height');
  var barcodeGenBtn = document.getElementById('barcode-generate-btn');
  var barcodeResult = document.getElementById('barcode-result');
  var barcodeOutput = document.getElementById('barcode-output');

  // Update hint when format changes
  barcodeType.addEventListener('change', function () {
    barcodeError.textContent = '';
    if (this.value === 'EAN13') {
      barcodeHint.textContent = 'EAN-13: enter exactly 13 digits';
      barcodeInput.placeholder = 'e.g. 5901234123457';
      barcodeInput.setAttribute('inputmode', 'numeric');
      barcodeInput.setAttribute('pattern', '[0-9]*');
    } else {
      barcodeHint.textContent = 'Code 128: any text or numbers';
      barcodeInput.placeholder = 'e.g. HELLO-12345';
      barcodeInput.removeAttribute('inputmode');
      barcodeInput.removeAttribute('pattern');
    }
  });

  // Clear error on input
  barcodeInput.addEventListener('input', function () {
    barcodeError.textContent = '';
  });

  // Generate barcode
  barcodeGenBtn.addEventListener('click', function () {
    var value = barcodeInput.value.trim();
    var format = barcodeType.value;
    var width = parseInt(barcodeWidth.value, 10);
    var height = parseInt(barcodeHeight.value, 10);

    // Validation
    if (format === 'EAN13') {
      if (!value) {
        barcodeError.textContent = 'Please enter a barcode value.';
        barcodeResult.classList.add('hidden');
        return;
      }
      if (!/^\d+$/.test(value)) {
        barcodeError.textContent = 'EAN-13 must contain only digits (0-9).';
        barcodeResult.classList.add('hidden');
        return;
      }
      if (value.length !== 13) {
        barcodeError.textContent = 'EAN-13 must be exactly 13 digits. You entered ' + value.length + '.';
        barcodeResult.classList.add('hidden');
        return;
      }
    } else {
      // Code 128
      if (!value) {
        barcodeError.textContent = 'Please enter a barcode value.';
        barcodeResult.classList.add('hidden');
        return;
      }
    }

    barcodeError.textContent = '';
    generateBarcode(value, format, width, height);
  });

  // Enter key shortcut
  barcodeInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      barcodeGenBtn.click();
    }
  });

  function generateBarcode(value, format, width, height) {
    // Create SVG element
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    try {
      JsBarcode(svg, value, {
        format: format,
        width: width,
        height: height,
        displayValue: true,
        font: 'monospace',
        fontSize: 14,
        margin: 10,
        background: '#ffffff',
        lineColor: '#1a1a2e'
      });
    } catch (e) {
      barcodeError.textContent = 'Invalid value for ' + format + '. Please check your input.';
      barcodeResult.classList.add('hidden');
      return;
    }

    barcodeOutput.innerHTML = '';
    barcodeOutput.appendChild(svg);
    barcodeResult.classList.remove('hidden');
    barcodeResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Barcode download as PNG
  document.getElementById('barcode-download-png').addEventListener('click', function () {
    var svg = barcodeOutput.querySelector('svg');
    if (!svg) return;

    var svgData = new XMLSerializer().serializeToString(svg);
    var svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(svgBlob);

    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      // Scale up for crisp output
      var scale = 3;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      triggerDownload(canvas.toDataURL('image/png'), 'barcode.png');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  // =============================================
  // SHARED HELPERS
  // =============================================
  function triggerDownload(dataUrl, filename) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadAsPdf(canvas) {
    var jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
    if (!jsPDF) {
      qrError.textContent = 'PDF library not loaded. Please refresh and try again.';
      return;
    }

    var imgData = canvas.toDataURL('image/png');
    var pdfW = Math.max(canvas.width * 0.264583, 50);
    var pdfH = Math.max(canvas.height * 0.264583, 50);
    var orientation = canvas.width > canvas.height ? 'l' : 'p';

    var doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [pdfW + 20, pdfH + 20]
    });

    var x = ((pdfW + 20) - pdfW) / 2;
    var y = ((pdfH + 20) - pdfH) / 2;
    doc.addImage(imgData, 'PNG', x, y, pdfW, pdfH);
    doc.save('qrcode.pdf');
  }

  // =============================================
  // COPYRIGHT
  // =============================================
  var el = document.getElementById('copyright-text');
  if (el) el.textContent = '\u00A9 ' + new Date().getFullYear() + ' KingSyah';

})();
