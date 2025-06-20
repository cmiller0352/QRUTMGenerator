// src/CanvasUtils.js
import QRCode from 'qrcode-generator';

export function drawQrWithLogo({
  canvas,
  text,
  foregroundColor = '#000000',
  backgroundColor = '#ffffff',
  logoFile = null,
  logoScale = 0.2
}) {
  if (!canvas || !text) {
    console.warn('Missing required parameters to draw QR');
    return;
  }

  const qr = QRCode(0, 'H');
  qr.addData(text);
  qr.make();

  const ctx = canvas.getContext('2d');
  const moduleCount = qr.getModuleCount();
  const canvasSize = canvas.width;
  const cellSize = canvasSize / moduleCount;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Draw QR modules
  ctx.fillStyle = foregroundColor;
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(Math.round(col * cellSize), Math.round(row * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
  }

  if (logoFile instanceof Blob) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const logoSize = canvasSize * logoScale;
        const padding = logoSize * 0.0001; // Add slight padding
        const dx = (canvasSize - logoSize) / 2;
        const dy = (canvasSize - logoSize) / 2;

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(dx - padding, dy - padding, logoSize + 2 * padding, logoSize + 2 * padding);
        ctx.drawImage(img, dx, dy, logoSize, logoSize);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(logoFile);
  }
}

export function copyCanvasImageToClipboard(canvasRef) {
  if (!canvasRef || !canvasRef.current) return;
  canvasRef.current.toBlob((blob) => {
    if (blob) navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  });
}

export function exportSvg(canvasRef) {
  if (!canvasRef || !canvasRef.current) return;
  const dataUrl = canvasRef.current.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'qr-code.svg';
  link.click();
}

export function exportPng(canvasRef) {
  if (!canvasRef || !canvasRef.current) return;
  const dataUrl = canvasRef.current.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'qr-code.png';
  link.click();
}
