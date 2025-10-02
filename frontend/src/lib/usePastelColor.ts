import { useEffect, useState } from "react";

const cache = new Map<string, string>();

function toPastelHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb.map((value) => value / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  // Push the colour into a soft pastel range
  const pastelL = Math.min(0.85, 0.6 + l * 0.25);
  const pastelS = Math.min(0.45, s * 0.6 + 0.2);

  const c = (1 - Math.abs(2 * pastelL - 1)) * pastelS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = pastelL - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (h >= 0 && h < 60) {
    r1 = c;
    g1 = x;
  } else if (h >= 60 && h < 120) {
    r1 = x;
    g1 = c;
  } else if (h >= 120 && h < 180) {
    g1 = c;
    b1 = x;
  } else if (h >= 180 && h < 240) {
    g1 = x;
    b1 = c;
  } else if (h >= 240 && h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const toHex = (value: number) => {
    const channel = Math.round((value + m) * 255);
    return channel.toString(16).padStart(2, "0");
  };

  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

function averageColorFromImage(src: string): Promise<[number, number, number]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src.startsWith("http") ? src : `${window.location.origin}${src}`;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Unable to create canvas context"));
        return;
      }
      const width = 20;
      const height = 20;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(img, 0, 0, width, height);
      const { data } = context.getImageData(0, 0, width, height);
      let r = 0;
      let g = 0;
      let b = 0;
      const pixelCount = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      resolve([r / pixelCount, g / pixelCount, b / pixelCount]);
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
  });
}

export function usePastelColor(src: string | undefined, fallback = "#f5f5f5") {
  const [color, setColor] = useState(() => (src ? cache.get(src) ?? fallback : fallback));

  useEffect(() => {
    if (!src) return;
    if (cache.has(src)) {
      setColor(cache.get(src)!);
      return;
    }

    let cancelled = false;
    averageColorFromImage(src)
      .then((rgb) => {
        if (cancelled) return;
        const pastel = toPastelHex(rgb);
        cache.set(src, pastel);
        setColor(pastel);
      })
      .catch(() => {
        if (!cancelled) cache.set(src, fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  return color;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return [r, g, b];
}

export function mixWithWhite(hex: string, weight = 0.75): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  const blend = (channel: number) => Math.round(channel * (1 - weight) + 255 * weight)
    .toString(16)
    .padStart(2, "0");
  return `#${blend(r)}${blend(g)}${blend(b)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  const [r, g, b] = rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
