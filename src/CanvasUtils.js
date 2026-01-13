// src/CanvasUtils.js
import QRCode from 'qrcode-generator';

const MAX_FOOTPRINT_RATIO = 0.35;
const logoAssetCache = new Map();

const readBlobAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });

const loadImage = (src, tryAnonymous = true) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (tryAnonymous && !src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });

const getLogoCacheKey = (source) => {
  if (!source) return null;
  if (source instanceof Blob) {
    const name = source.name || 'blob';
    return `blob:${name}:${source.size}:${source.lastModified || 0}`;
  }
  if (typeof source === 'string') {
    return `url:${source}`;
  }
  return null;
};

const getTrimmedAlphaBounds = (img, alphaThreshold = 10, pad = 2) => {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4 + 3;
        if (data[idx] > alphaThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) {
      return { sx: 0, sy: 0, sw: width, sh: height };
    }
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(width - sx, maxX - minX + 1 + pad * 2);
    const sh = Math.min(height - sy, maxY - minY + 1 + pad * 2);
    return { sx, sy, sw, sh };
  } catch {
    return { sx: 0, sy: 0, sw: width, sh: height };
  }
};

const createTrimmedDataUrl = (img, bounds) => {
  const canvas = document.createElement('canvas');
  canvas.width = bounds.sw;
  canvas.height = bounds.sh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    img,
    bounds.sx,
    bounds.sy,
    bounds.sw,
    bounds.sh,
    0,
    0,
    bounds.sw,
    bounds.sh
  );
  return canvas.toDataURL('image/png');
};

const prepareLogoAsset = async (source) => {
  if (!source) return null;
  const key = getLogoCacheKey(source) || `temp-${Date.now()}`;
  if (!logoAssetCache.has(key)) {
    const promise = (async () => {
      let dataUrl = null;
      let rawSrc = null;
      let editable = true;
      if (source instanceof Blob) {
        dataUrl = await readBlobAsDataUrl(source);
      } else if (typeof source === 'string') {
        if (source.startsWith('data:')) {
          dataUrl = source;
        } else {
          try {
            const response = await fetch(source, { mode: 'cors' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            dataUrl = await readBlobAsDataUrl(blob);
          } catch (err) {
            editable = false;
            rawSrc = source;
          }
        }
      } else {
        editable = false;
      }

      const img = await loadImage(editable ? dataUrl : rawSrc || dataUrl || '');
      const bounds = editable
        ? getTrimmedAlphaBounds(img, 10, 2)
        : {
            sx: 0,
            sy: 0,
            sw: img.naturalWidth || img.width,
            sh: img.naturalHeight || img.height,
          };
      const trimmedDataUrl =
        editable && bounds
          ? createTrimmedDataUrl(img, bounds)
          : dataUrl || rawSrc || '';
      return { img, bounds, trimmedDataUrl };
    })().catch((err) => {
      console.warn('Failed to prepare logo asset', err);
      throw err;
    });
    logoAssetCache.set(key, promise);
  }
  return logoAssetCache.get(key);
};

export function drawQrWithLogo({
  canvas,
  text,
  foregroundColor = '#000000',
  backgroundColor = '#ffffff',
  logoFile = null,
  logoScale = 0.2,
  moduleScale = 10,
  quietZoneModules = 4,
  logoPaddingPx = 1,
}) {
  if (!canvas || !text) {
    console.warn('Missing required parameters to draw QR');
    return;
  }

  const qr = QRCode(0, 'H');
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const totalModules = moduleCount + quietZoneModules * 2;
  const canvasSizePx = totalModules * moduleScale;
  canvas.width = canvasSizePx;
  canvas.height = canvasSizePx;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasSizePx, canvasSizePx);

  ctx.fillStyle = foregroundColor;
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.isDark(row, col)) continue;
      const x = (col + quietZoneModules) * moduleScale;
      const y = (row + quietZoneModules) * moduleScale;
      ctx.fillRect(x, y, moduleScale, moduleScale);
    }
  }

  if (!logoFile) return;

  const safeLogoScale =
    typeof logoScale === 'number' && Number.isFinite(logoScale) && logoScale > 0
      ? logoScale
      : 0.2;

  let logoModules = Math.max(1, Math.round(moduleCount * safeLogoScale));
  if (logoModules % 2 !== 0) logoModules += 1;

  const padPx = Math.min(Math.max(logoPaddingPx ?? 0, 0), 2);
  const paddingModulesApprox = padPx / moduleScale;
  const maxFootprintModules = Math.max(
    1,
    Math.floor(moduleCount * MAX_FOOTPRINT_RATIO)
  );
  const requestedFootprint = logoModules + 2 * paddingModulesApprox;
  if (requestedFootprint > maxFootprintModules) {
    const reducedLogoModules = Math.max(
      1,
      Math.floor(maxFootprintModules - 2 * paddingModulesApprox)
    );
    if (reducedLogoModules < logoModules) {
      console.warn('Logo size clamped for scannability.');
      logoModules = reducedLogoModules;
    }
  }

  logoModules = Math.min(totalModules, logoModules);
  if (logoModules <= 0) return;

  const logoSizePx = logoModules * moduleScale;
  const coord =
    Math.round((canvasSizePx - logoSizePx) / 2 / moduleScale) * moduleScale;
  const dx = coord;
  const dy = coord;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(
    dx - padPx,
    dy - padPx,
    logoSizePx + 2 * padPx,
    logoSizePx + 2 * padPx
  );

  prepareLogoAsset(logoFile)
    .then((asset) => {
      if (!asset) return;
      const { img, bounds } = asset;
      ctx.drawImage(
        img,
        bounds.sx,
        bounds.sy,
        bounds.sw,
        bounds.sh,
        dx,
        dy,
        logoSizePx,
        logoSizePx
      );
    })
    .catch(() => {
      // Already logged; no further action needed.
    });
}

export function copyCanvasImageToClipboard(canvasRef) {
  if (!canvasRef || !canvasRef.current) return;
  canvasRef.current.toBlob((blob) => {
    if (blob) navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  });
}

export function exportPng(canvasRef) {
  if (!canvasRef || !canvasRef.current) return;
  const dataUrl = canvasRef.current.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'qr-code.png';
  link.click();
}

export async function exportQrSvg({
  text,
  foregroundColor = '#000000',
  backgroundColor = '#ffffff',
  logoFileOrUrl = null,
  logoScale = 0.2,
  size = 1024,
}) {
  if (!text) {
    console.warn('Cannot export SVG without QR text.');
    return;
  }

  const qr = QRCode(0, 'H');
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${moduleCount} ${moduleCount}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="${backgroundColor}" />`,
  ];

  const rects = [];
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.isDark(row, col)) {
        rects.push(`<rect x="${col}" y="${row}" width="1" height="1" />`);
      }
    }
  }
  if (rects.length) {
    svgParts.push(`<g fill="${foregroundColor}">${rects.join('')}</g>`);
  }

  try {
    if (logoFileOrUrl) {
      const asset = await prepareLogoAsset(logoFileOrUrl);
      if (asset && asset.trimmedDataUrl) {
        const safeScale =
          typeof logoScale === 'number' && logoScale > 0 ? logoScale : 0.2;
        const logoSize = moduleCount * safeScale;
        if (logoSize < moduleCount) {
          const dx = (moduleCount - logoSize) / 2;
          const dy = (moduleCount - logoSize) / 2;
          const padding = logoSize * 0.0001;
          svgParts.push(
            `<rect x="${dx - padding}" y="${dy - padding}" width="${
              logoSize + 2 * padding
            }" height="${logoSize + 2 * padding}" fill="${backgroundColor}" />`
          );
          svgParts.push(
            `<image href="${asset.trimmedDataUrl}" x="${dx}" y="${dy}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />`
          );
        }
      }
    }
  } catch (err) {
    console.warn('Unable to embed logo in SVG export:', err);
  }

  svgParts.push('</svg>');

  const blob = new Blob(svgParts, { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'qr-code.svg';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
