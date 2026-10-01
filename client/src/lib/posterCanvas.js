const size = 1080;

export async function readProductPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error('Choose a JPG, PNG, or WebP photo smaller than 5 MB.');
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 20000000)
      throw new Error('Choose a photo with fewer than 20 million pixels.');
    return { image, url };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw new Error(
      error.message.includes('million')
        ? error.message
        : 'This photo could not be opened. Try another JPG, PNG, or WebP.',
      { cause: error },
    );
  }
}

function wrapText(context, text, width) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let line = '';
  // Break long words too, so Tamil/Sinhala text and long names stay inside the poster.
  for (const word of words) {
    const proposed = line ? `${line} ${word}` : word;
    if (context.measureText(proposed).width <= width) {
      line = proposed;
      continue;
    }
    if (line) {
      lines.push(line);
      line = '';
    }
    const letters = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word);
    for (const { segment: letter } of letters) {
      if (line && context.measureText(line + letter).width > width) {
        lines.push(line);
        line = '';
      }
      line += letter;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawText(
  context,
  text,
  { x, y, width, maxLines, fontSize, color, weight = 600, centered = false },
) {
  let lines;
  let currentSize = fontSize;
  do {
    context.font = `${weight} ${currentSize}px "Segoe UI", "Nirmala UI", sans-serif`;
    lines = wrapText(context, text, width);
    if (lines.length <= maxLines) break;
    currentSize -= 2;
  } while (currentSize >= 18);
  if (lines.length > maxLines)
    throw new Error(
      'The text is too long for this layout. Shorten your headline or call to action.',
    );
  context.fillStyle = color;
  context.textBaseline = 'top';
  context.textAlign = centered ? 'center' : 'left';
  const lineHeight = currentSize * 1.3;
  lines.forEach((line, index) =>
    context.fillText(line, centered ? x + width / 2 : x, y + index * lineHeight),
  );
}

function readableColor(hex) {
  const values = hex
    .slice(1)
    .match(/../g)
    .map((value) => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
  const luminance = values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  return luminance > 0.179 ? '#172b26' : '#ffffff';
}

export function createPoster({
  photo,
  businessName,
  productName,
  headline,
  callToAction,
  brandColor,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser cannot create posters. Try a recent Chrome or Edge.');
  context.fillStyle = '#faf7ef';
  context.fillRect(0, 0, size, size);
  context.fillStyle = brandColor;
  context.fillRect(0, 0, 16, size);
  context.beginPath();
  context.arc(982, 82, 30, 0, Math.PI * 2);
  context.fill();
  drawText(context, businessName, {
    x: 64,
    y: 60,
    width: 820,
    maxLines: 2,
    fontSize: 32,
    color: '#365047',
  });
  drawText(context, headline, {
    x: 64,
    y: 160,
    width: 952,
    maxLines: 2,
    fontSize: 64,
    color: '#172b26',
    weight: 700,
  });
  drawText(context, productName, {
    x: 64,
    y: 330,
    width: 952,
    maxLines: 1,
    fontSize: 28,
    color: '#56645b',
    weight: 400,
  });

  // Crop around the center without stretching the product photo.
  const x = 64,
    y = 396,
    width = 952,
    height = 448;
  const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
  const photoWidth = photo.naturalWidth * scale;
  const photoHeight = photo.naturalHeight * scale;
  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, 28);
  context.clip();
  context.drawImage(
    photo,
    x + (width - photoWidth) / 2,
    y + (height - photoHeight) / 2,
    photoWidth,
    photoHeight,
  );
  context.restore();
  context.fillStyle = brandColor;
  context.beginPath();
  context.roundRect(64, 898, 952, 120, 24);
  context.fill();
  drawText(context, callToAction, {
    x: 100,
    y: 922,
    width: 880,
    maxLines: 2,
    fontSize: 32,
    color: readableColor(brandColor),
    centered: true,
  });
  return canvas.toDataURL('image/png');
}
