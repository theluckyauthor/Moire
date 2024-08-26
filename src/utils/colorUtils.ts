import { ClothingItem } from '../types/outfit';

export function generateColorFromItems(items: ClothingItem[], existingColor?: string): string {
  if (existingColor) return existingColor;

  // This is a simple implementation. You might want to use a more sophisticated algorithm.
  const colors = items.map(item => item.color);
  const averageColor = colors.reduce((acc, color) => {
    const rgb = hexToRgb(color);
    return [acc[0] + rgb[0], acc[1] + rgb[1], acc[2] + rgb[2]];
  }, [0, 0, 0]).map(val => Math.round(val / colors.length));
  
  // Ensure the color is dark enough for white text
  const luminance = (0.299 * averageColor[0] + 0.587 * averageColor[1] + 0.114 * averageColor[2]) / 255;
  if (luminance > 0.5) {
    // If too light, darken it
    averageColor[0] = Math.max(0, averageColor[0] - 50);
    averageColor[1] = Math.max(0, averageColor[1] - 50);
    averageColor[2] = Math.max(0, averageColor[2] - 50);
  }
  
  return rgbToHex(averageColor[0], averageColor[1], averageColor[2]);
}

function hexToRgb(hex: string): number[] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}