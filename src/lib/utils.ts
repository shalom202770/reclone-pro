import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  if (isNaN(bytes) || bytes < 0) return '--';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0 || isNaN(bytesPerSec)) return '0 B/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    // Format options matching macOS Finder style
    if (isToday) {
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function getFileCategory(name: string, isDir: boolean): 'folder' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'doc' | 'file' {
  if (isDir) return 'folder';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mkv', 'mov', 'avi', 'webm', 'wmv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) return 'archive';
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'go', 'rs', 'html', 'css', 'sh', 'yaml', 'yml'].includes(ext)) return 'code';
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'doc';
  return 'file';
}

export function formatRemainingTime(seconds: number | string | undefined | null, isEn: boolean = false): string {
  if (seconds === undefined || seconds === null || seconds === '' || seconds === '--') return '--';
  
  let secs: number;
  if (typeof seconds === 'string') {
    if (seconds.includes('הסתיים') || seconds.includes('מתחיל') || seconds.includes('מושהה') || seconds.includes('Completed') || seconds.includes('Starting') || seconds.includes('Paused')) return seconds;
    const num = parseInt(seconds.replace(/[^\d.]/g, ''), 10);
    if (isNaN(num)) return seconds;
    secs = num;
  } else {
    secs = Math.round(seconds);
  }

  if (isNaN(secs) || secs < 0) return '--';
  if (secs === 0) return isEn ? '< 1 min' : 'פחות מדקה';
  if (secs < 60) return isEn ? `${secs}s` : `${secs} שניות`;

  const totalMinutes = Math.floor(secs / 60);

  if (totalMinutes < 60) {
    return isEn ? `${totalMinutes}m` : `${totalMinutes} דקות`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (remainingMinutes === 0) {
    if (isEn) return `${hours}h`;
    return hours === 1 ? 'שעה אחת' : `${hours} שעות`;
  }

  if (isEn) return `${hours}h ${remainingMinutes}m`;
  const hoursStr = hours === 1 ? 'שעה אחת' : `${hours} שעות`;
  return `${hoursStr} ו-${remainingMinutes} דקות`;
}

export function formatETA(seconds: number, isEn: boolean = false): string {
  return formatRemainingTime(seconds, isEn);
}
