import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { 
  Folder, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileArchive, 
  FileCode, 
  File, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  FolderOpen,
  X as XIcon
} from 'lucide-react';
import type { RcloneItem, ViewMode, SortField, SortOrder } from '../types';
import { formatBytes, formatDate, getFileCategory } from '../lib/utils';
import { useTranslation } from '../i18n/context';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'heic']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma']);
const ARCHIVE_EXTENSIONS = new Set(['zip', '7z', 'rar', 'tar', 'gz', 'tgz']);
const PDF_EXTENSIONS = new Set(['pdf']);
const THUMBNAIL_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...PDF_EXTENSIONS]);

interface ContextMenuState {
  x: number;
  y: number;
  item: RcloneItem;
}

interface FilePaneProps {
  paneId: 'left' | 'right';
  remote: string;
  path: string;
  items: RcloneItem[];
  selectedItems: Set<string>;
  searchQuery: string;
  sortField: SortField;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  loading: boolean;
  error: string | null;
  targetPaneRemote?: string;
  onSelectItem: (itemPath: string, multi: boolean, rangeSelect?: boolean) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpenFolder: (folderPath: string) => void;
  onSort: (field: SortField) => void;
  onTransferItem: (item: RcloneItem) => void;
  onDeleteItem: (item: RcloneItem) => void;
  onDropTransfer?: (items: RcloneItem[]) => void;
  onRefresh?: () => void;
  gridIconSize: number;
  onGetInfo?: (item: RcloneItem) => void;
  onChecksum?: (item: RcloneItem, algo: 'md5' | 'sha256') => void;
  onNewFolderWithSelection?: (selectedItems: RcloneItem[]) => void;
  onBatchRename?: (selectedItems: RcloneItem[]) => void;
}

export const FilePane: React.FC<FilePaneProps> = ({
  paneId,
  remote,
  path,
  items,
  selectedItems,
  searchQuery,
  sortField,
  sortOrder,
  viewMode,
  loading,
  error,
  targetPaneRemote,
  onSelectItem,
  onSelectAll,
  onClearSelection,
  onOpenFolder,
  onSort,
  onTransferItem,
  onDeleteItem,
  onDropTransfer,
  onRefresh,
  gridIconSize,
  onGetInfo,
  onChecksum,
  onNewFolderWithSelection,
  onBatchRename,
}) => {
  const { t, isRtl } = useTranslation();
  const [quickLookItem, setQuickLookItem] = useState<RcloneItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Close context menu smoothly when clicking outside
  useEffect(() => {
    const handleDismiss = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-context-menu]')) return;
      setContextMenu(null);
    };
    window.addEventListener('mousedown', handleDismiss);
    return () => window.removeEventListener('mousedown', handleDismiss);
  }, []);

  const isLocalRemote = remote === 'Local Mac' || remote.startsWith('/');

  // Fast & responsive context menu - zero delay
  const handleContextMenu = useCallback((e: React.MouseEvent, item: RcloneItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedItems.has(item.Path)) {
      onSelectItem(item.Path, false);
    }
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 340);
    setContextMenu({ x, y, item });
  }, [selectedItems, onSelectItem]);

  const handleOpenFile = (item: RcloneItem) => {
    if (!isLocalRemote || !window.electronAPI?.openPath) return;
    window.electronAPI.openPath(item.Path, remote);
  };

  const handleCompress = async (item: RcloneItem) => {
    if (!isLocalRemote || !window.electronAPI?.archiveCompress) return;
    const outPath = item.Path.replace(/\/?$/, '') + '.zip';
    const res = await window.electronAPI.archiveCompress(item.Path, outPath, remote);
    if (res?.success && onRefresh) {
      onRefresh();
    }
  };

  const handleExtract = async (item: RcloneItem) => {
    if (!isLocalRemote || !window.electronAPI?.archiveExtract) return;
    const outDir = item.Path.replace(/\.[^.]+$/, '');
    const res = await window.electronAPI.archiveExtract(item.Path, outDir, remote);
    if (res?.success && onRefresh) {
      onRefresh();
    }
  };

  const handleImageConvert = async (item: RcloneItem, targetFormat: 'jpeg' | 'png') => {
    if (!isLocalRemote || !window.electronAPI?.imageConvert) return;
    const res = await window.electronAPI.imageConvert(item.Path, targetFormat, remote);
    if (res?.success && onRefresh) {
      onRefresh();
    }
  };

  const handleConvert = async (item: RcloneItem, preset: 'mp4' | 'mp3' | 'web') => {
    if (!isLocalRemote || !window.electronAPI?.mediaConvert) return;
    const ext = preset === 'mp3' ? '.mp3' : '.mp4';
    const outPath = item.Path.replace(/\.[^.]+$/, `_converted${ext}`);
    const res = await window.electronAPI.mediaConvert(item.Path, outPath, preset, remote);
    if (res?.success && onRefresh) {
      onRefresh();
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.Name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  // Thumbnail cache: Map<filePath, thumbnailUrl>
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());
  const thumbObserverRef = useRef<IntersectionObserver | null>(null);
  const loadingThumbsRef = useRef<Set<string>>(new Set());

  // Reset thumbnail cache when remote or path changes
  useEffect(() => {
    setThumbnails(new Map());
    setFailedThumbs(new Set());
    loadingThumbsRef.current = new Set();
  }, [remote, path]);

  // Continuous thumbnail loading on scroll using IntersectionObserver
  useEffect(() => {
    if (viewMode !== 'grid' || !window.electronAPI?.getThumbnailUrl) return;

    thumbObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          const itemPath = target.getAttribute('data-thumb-path');
          const itemId = target.getAttribute('data-thumb-id') || undefined;
          if (!itemPath || loadingThumbsRef.current.has(itemPath)) return;

          loadingThumbsRef.current.add(itemPath);
          thumbObserverRef.current?.unobserve(target);

          window.electronAPI!.getThumbnailUrl(remote, itemPath, itemId)
            .then((url) => {
              if (url) {
                setThumbnails((prev) => {
                  const next = new Map(prev);
                  next.set(itemPath, url);
                  return next;
                });
              }
            })
            .catch(() => {});
        });
      },
      {
        root: gridContainerRef.current,
        rootMargin: '300px 0px',
        threshold: 0.01,
      }
    );

    return () => {
      thumbObserverRef.current?.disconnect();
      thumbObserverRef.current = null;
    };
  }, [viewMode, remote, path]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (a.IsDir !== b.IsDir) {
        return a.IsDir ? -1 : 1;
      }
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'Name') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortField, sortOrder]);

  const renderFileIcon = (item: RcloneItem, sizeClass: string = 'w-4 h-4', style?: React.CSSProperties) => {
    if (item.IsDir) {
      return (
        <Folder
          className={`${sizeClass} text-[var(--folder-icon-color,#f59e0b)] fill-[var(--folder-icon-fill,rgba(245,158,11,0.2))] shrink-0`}
          style={style}
        />
      );
    }
    const cat = getFileCategory(item.Name, false);
    switch (cat) {
      case 'image':
        return <FileImage className={`${sizeClass} text-mac-purple shrink-0`} style={style} />;
      case 'video':
        return <FileVideo className={`${sizeClass} text-mac-danger shrink-0`} style={style} />;
      case 'audio':
        return <FileAudio className={`${sizeClass} text-mac-cyan shrink-0`} style={style} />;
      case 'archive':
        return <FileArchive className={`${sizeClass} text-amber-500 shrink-0`} style={style} />;
      case 'code':
        return <FileCode className={`${sizeClass} text-mac-accent shrink-0`} style={style} />;
      case 'doc':
        return <FileText className={`${sizeClass} text-amber-400 shrink-0`} style={style} />;
      default:
        return <File className={`${sizeClass} text-gray-400 shrink-0`} style={style} />;
    }
  };

  const getHebrewType = (item: RcloneItem): string => {
    if (item.IsDir) return 'תיקייה';
    const ext = item.Name.split('.').pop()?.toUpperCase() || 'קובץ';
    return `קובץ ${ext}`;
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-mac-accent" />
    ) : (
      <ArrowDown className="w-3 h-3 text-mac-accent" />
    );
  };

  const handleDragStart = (e: React.DragEvent, item: RcloneItem) => {
    const transferItems = selectedItems.has(item.Path)
      ? items.filter((i) => selectedItems.has(i.Path))
      : [item];
    e.dataTransfer.setData('application/json', JSON.stringify(transferItems));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data && onDropTransfer) {
        const droppedItems = JSON.parse(data) as RcloneItem[];
        onDropTransfer(droppedItems);
      }
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (sortedItems.length === 0) return;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
      e.preventDefault();

      const selectedPaths = Array.from(selectedItems);
      const lastSelectedPath = selectedPaths[selectedPaths.length - 1];
      const currentIndex = sortedItems.findIndex((item) => item.Path === lastSelectedPath);

      if (e.key === 'Enter') {
        if (currentIndex >= 0) {
          const item = sortedItems[currentIndex];
          if (item.IsDir) {
            onOpenFolder(item.Path);
          } else {
            handleOpenFile(item);
          }
        }
        return;
      }

      let cols = 1;
      if (viewMode === 'grid' && gridContainerRef.current) {
        const containerWidth = gridContainerRef.current.clientWidth - 32;
        cols = Math.max(1, Math.floor(containerWidth / (gridIconSize + 12)));
      }

      let nextIndex = currentIndex;
      if (currentIndex === -1) {
        nextIndex = 0;
      } else {
        switch (e.key) {
          case 'ArrowDown':
            nextIndex = viewMode === 'grid' ? currentIndex + cols : currentIndex + 1;
            break;
          case 'ArrowUp':
            nextIndex = viewMode === 'grid' ? currentIndex - cols : currentIndex - 1;
            break;
          case 'ArrowLeft':
            // In RTL layout, ArrowLeft moves forward to the next item
            nextIndex = currentIndex + 1;
            break;
          case 'ArrowRight':
            // In RTL layout, ArrowRight moves backward to previous item
            nextIndex = currentIndex - 1;
            break;
        }
      }

      nextIndex = Math.max(0, Math.min(sortedItems.length - 1, nextIndex));
      const targetItem = sortedItems[nextIndex];
      if (targetItem) {
        onSelectItem(targetItem.Path, false, e.shiftKey);
        try {
          const escapedPath = targetItem.Path.replace(/["\\]/g, '\\$&');
          const element = containerRef.current?.querySelector(`[data-item-path="${escapedPath}"]`);
          if (element) {
            element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        } catch {}
      }
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`flex-1 flex flex-col bg-surface overflow-hidden relative ${isRtl ? 'text-right' : 'text-left'} select-none outline-none focus:outline-none`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      onClick={() => containerRef.current?.focus()}
    >
      {/* Error Banner */}
      {error && (
        <div className="bg-mac-danger/15 border-b border-mac-danger/30 text-mac-danger px-4 py-2 text-xs flex items-center justify-between">
          <span>{t('common.error', 'שגיאה')}: {error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="absolute inset-0 bg-surface/75 backdrop-blur-xs flex flex-col p-4 space-y-3 z-20">
          <div className="flex items-center space-x-2 space-x-reverse text-xs text-gray-400 mb-2">
            <div className="w-3.5 h-3.5 border-2 border-mac-accent border-t-transparent rounded-full animate-spin" />
            <span>{t('filePane.loadingFiles', 'סורק קבצים ותיקיות ב-')} {remote}...</span>
          </div>
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="h-8 rounded bg-surface-muted animate-pulse flex items-center px-3 space-x-4 space-x-reverse"
            >
              <div className="w-4 h-4 bg-surface-border rounded" />
              <div className="h-3 w-48 bg-surface-border rounded" />
              <div className="h-3 w-16 bg-surface-border rounded mr-auto" />
              <div className="h-3 w-28 bg-surface-border rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        <div className="flex-1 overflow-auto flex flex-col">
          {/* Table Header */}
          <div className="h-7 border-b border-surface-border bg-surface-muted/80 text-[11px] font-semibold text-gray-400 grid grid-cols-12 items-center px-3 select-none sticky top-0 z-10">
            <div
              className="col-span-8 sm:col-span-6 flex items-center space-x-1 space-x-reverse cursor-pointer group min-w-0"
              onClick={() => onSort('Name')}
            >
              <span className="truncate">{t('filePane.name', 'שם הפריט')}</span>
              {renderSortIndicator('Name')}
            </div>
            <div
              className="col-span-4 sm:col-span-2 flex items-center space-x-1 space-x-reverse cursor-pointer group justify-start font-mono"
              onClick={() => onSort('Size')}
            >
              <span>{t('filePane.size', 'גודל')}</span>
              {renderSortIndicator('Size')}
            </div>
            <div className="hidden sm:block sm:col-span-2 pr-2 truncate">{t('filePane.type', 'סוג')}</div>
            <div
              className="hidden sm:flex sm:col-span-2 items-center space-x-1 space-x-reverse cursor-pointer group justify-start"
              onClick={() => onSort('ModTime')}
            >
              <span>{t('filePane.modified', 'תאריך')}</span>
              {renderSortIndicator('ModTime')}
            </div>
          </div>

          {/* Table Rows */}
          <div className="flex-1">
            {sortedItems.length === 0 && !loading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                <FolderOpen className="w-12 h-12 stroke-[1.2] mb-3 text-gray-600" />
                <p className="text-sm font-medium text-gray-400">{t('filePane.emptyFolder', 'התיקייה ריקה')}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {t('filePane.dragDropHint', 'גרור קבצים לכאן או השתמש בסרגל הכלים להעלאה או יצירת תיקייה')}
                </p>
              </div>
            ) : (
              sortedItems.map((item) => {
                const isSelected = selectedItems.has(item.Path);
                return (
                  <div
                    key={item.Path}
                    data-item-path={item.Path}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={(e) => onSelectItem(item.Path, e.metaKey || e.ctrlKey, e.shiftKey)}
                    onMouseDown={(e) => {
                      if (e.button === 2) {
                        handleContextMenu(e, item);
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    onDoubleClick={() => {
                      if (item.IsDir) {
                        onOpenFolder(item.Path);
                      } else {
                        handleOpenFile(item);
                      }
                    }}
                    className={`h-8 grid grid-cols-12 items-center px-3 text-xs border-b border-surface-border/40 cursor-default transition-colors ${
                      isSelected
                        ? 'bg-[var(--selection-bg)] text-foreground font-semibold border-r-2 border-r-[var(--selection-border)]'
                        : 'text-foreground/80 hover:bg-surface-hover/70'
                    }`}
                  >
                    {/* Name + Icon */}
                    <div className="col-span-8 sm:col-span-6 flex items-center space-x-2.5 space-x-reverse truncate pl-2 min-w-0">
                      {renderFileIcon(item)}
                      <span className="truncate">{item.Name}</span>
                    </div>

                    {/* Size */}
                    <div className="col-span-4 sm:col-span-2 font-mono text-[11px] text-gray-400 truncate">
                      {item.IsDir ? '--' : formatBytes(item.Size)}
                    </div>

                    {/* Type */}
                    <div className="hidden sm:block sm:col-span-2 pr-2 truncate text-[11px] text-gray-400">
                      {getHebrewType(item)}
                    </div>

                    {/* Date Modified */}
                    <div className="hidden sm:block sm:col-span-2 text-[11px] text-gray-400 truncate font-mono">
                      {formatDate(item.ModTime)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Grid / Cards View */
        <div ref={gridContainerRef} className="flex-1 overflow-auto p-4">
          {sortedItems.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
              <FolderOpen className="w-12 h-12 stroke-[1.2] mb-3 text-gray-600" />
              <p className="text-sm font-medium text-gray-400">התיקייה ריקה</p>
            </div>
          ) : (
            <div
              className="grid gap-3 select-none"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${gridIconSize}px, 1fr))`,
              }}
            >
              {sortedItems.map((item) => {
                const isSelected = selectedItems.has(item.Path);
                const thumbUrl = thumbnails.get(item.Path);
                const isFailed = failedThumbs.has(item.Path);
                const showThumb = !!thumbUrl && !isFailed;
                const ext = item.Name.split('.').pop()?.toLowerCase() || '';
                const isVideo = !item.IsDir && VIDEO_EXTENSIONS.has(ext);
                const isPdf = !item.IsDir && ext === 'pdf';
                const isThumbCandidate = !item.IsDir && THUMBNAIL_EXTENSIONS.has(ext);
                const iconSvgSize = Math.max(24, Math.min(52, Math.round(gridIconSize * 0.36)));

                return (
                  <div
                    key={item.Path}
                    data-item-path={item.Path}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={(e) => onSelectItem(item.Path, e.metaKey || e.ctrlKey, e.shiftKey)}
                    onMouseDown={(e) => {
                      if (e.button === 2) {
                        handleContextMenu(e, item);
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    onDoubleClick={() => {
                      if (item.IsDir) {
                        onOpenFolder(item.Path);
                      } else {
                        handleOpenFile(item);
                      }
                    }}
                    title={item.Name}
                    className={`group relative p-1.5 rounded-lg flex flex-col items-center justify-start cursor-default transition-all duration-150 select-none ${
                      isSelected
                        ? 'bg-[var(--selection-bg)] ring-1 ring-[var(--selection-border)]/30'
                        : 'hover:bg-surface-hover/60'
                    }`}
                  >
                    {/* Top/Center: Dedicated Proportional Preview Container */}
                    <div
                      ref={(el) => {
                        if (
                          el &&
                          thumbObserverRef.current &&
                          isThumbCandidate &&
                          !thumbnails.has(item.Path) &&
                          !loadingThumbsRef.current.has(item.Path)
                        ) {
                          thumbObserverRef.current.observe(el);
                        }
                      }}
                      data-thumb-path={item.Path}
                      data-thumb-id={item.ID || ''}
                      className={`w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden relative mb-1.5 transition-all ${
                        isSelected
                          ? 'border-2 border-[var(--selection-border)] shadow-md bg-surface'
                          : item.IsDir
                            ? 'border-[1.5px] border-[var(--folder-border)] shadow-[var(--folder-shadow)] bg-surface/50 group-hover:border-[var(--folder-border-hover)] group-hover:bg-surface/80'
                            : 'border-[1.5px] border-[var(--icon-container-border)] bg-surface/50 group-hover:border-[var(--icon-container-border-hover)] group-hover:bg-surface/80'
                      }`}
                    >
                      {showThumb ? (
                        <div className="w-full h-full p-1.5 flex items-center justify-center relative">
                          <img
                            src={thumbUrl}
                            alt={item.Name}
                            className="max-w-full max-h-full object-contain rounded drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                            loading="lazy"
                            onError={() => {
                              setFailedThumbs((prev) => new Set(prev).add(item.Path));
                            }}
                          />
                          {isVideo && (
                            <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[9px] text-white/90 font-mono flex items-center gap-0.5 pointer-events-none shadow-sm">
                              <FileVideo className="w-2.5 h-2.5" />
                            </div>
                          )}
                          {isPdf && (
                            <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-rose-950/80 border border-rose-500/30 text-[8px] font-bold text-rose-300 pointer-events-none shadow-sm">
                              PDF
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                          {renderFileIcon(item, '', { width: `${iconSvgSize}px`, height: `${iconSvgSize}px` })}
                        </div>
                      )}
                    </div>

                    {/* Bottom: Cleanly truncated name & muted metadata without container box */}
                    <div className="w-full flex flex-col items-center text-center px-0.5">
                      <span className={`text-xs font-medium truncate max-w-full leading-tight ${isSelected ? 'text-[var(--selection-border)] font-semibold' : 'text-foreground'}`}>
                        {item.Name}
                      </span>
                      <span className="text-[11px] text-gray-400 font-normal truncate max-w-full mt-0.5 font-mono">
                        {item.IsDir ? 'תיקייה' : formatBytes(item.Size)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pane Footer Info Bar */}
      <div className="h-6 bg-surface-muted border-t border-surface-border px-3 flex items-center justify-between text-[11px] text-gray-400 select-none">
        <div>
          <span>{t('filePane.totalItems', { count: items.length })}</span>
          {selectedItems.size > 0 && (
            <span className="text-mac-accent mx-2 font-medium">
              ({t('filePane.itemsSelected', { count: selectedItems.size })})
            </span>
          )}
        </div>
        <div className="font-mono text-[10px] text-gray-500" dir="ltr">
          {remote}:/{path}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (() => {
        const item = contextMenu.item;
        const ext = item.Name.split('.').pop()?.toLowerCase() || '';
        const isArchive = ARCHIVE_EXTENSIONS.has(ext);
        const isImage = !item.IsDir && IMAGE_EXTENSIONS.has(ext);
        const isHeic = ext === 'heic' || ext === 'heif';
        const isJpeg = ext === 'jpg' || ext === 'jpeg';
        const isPng = ext === 'png';
        const isMedia = !item.IsDir && (VIDEO_EXTENSIONS.has(ext) || AUDIO_EXTENSIONS.has(ext));
        const isVideo = !item.IsDir && VIDEO_EXTENSIONS.has(ext);

        return (
          <div
            data-context-menu="true"
            className="fixed z-[999] min-w-[210px] py-1.5 rounded-xl bg-[#1c1917]/95 backdrop-blur-xl border border-white/10 shadow-2xl text-xs text-gray-200 select-none animate-in fade-in duration-75"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Open */}
            {isLocalRemote && !item.IsDir && (
              <button
                className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                onClick={() => { handleOpenFile(item); setContextMenu(null); }}
              >
                <span>📄</span>
                <span>{t('filePane.openFile', 'פתח קובץ')}</span>
              </button>
            )}
            {item.IsDir && (
              <button
                className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                onClick={() => { onOpenFolder(item.Path); setContextMenu(null); }}
              >
                <span>📂</span>
                <span>{t('filePane.openFolder', 'פתח תיקייה')}</span>
              </button>
            )}

            <div className="h-px bg-white/10 mx-2 my-1" />

            {/* New Folder with Selection (macOS style) */}
            {selectedItems.size > 1 && onNewFolderWithSelection && (
              <button
                className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2 text-mac-accent font-medium`}
                onClick={() => {
                  const selList = items.filter((i) => selectedItems.has(i.Path));
                  onNewFolderWithSelection(selList);
                  setContextMenu(null);
                }}
              >
                <span>📁</span>
                <span>{t('filePane.newFolderWithSelection', { count: selectedItems.size })}</span>
              </button>
            )}

            {/* Batch Renaming */}
            {selectedItems.size > 1 && onBatchRename && (
              <button
                className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                onClick={() => {
                  const selList = items.filter((i) => selectedItems.has(i.Path));
                  onBatchRename(selList);
                  setContextMenu(null);
                }}
              >
                <span>✏️</span>
                <span>{t('filePane.batchRename', 'שינוי שמות מרוכז...')}</span>
              </button>
            )}

            {/* Properties / Get Info */}
            {onGetInfo && (
              <button
                className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                onClick={() => {
                  onGetInfo(item);
                  setContextMenu(null);
                }}
              >
                <span>ℹ️</span>
                <span>{t('filePane.getInfo', 'הצג מידע (Get Info / Properties)')}</span>
              </button>
            )}

            <div className="h-px bg-white/10 mx-2 my-1" />

            {/* Compress */}
            {isLocalRemote && (
              <button
                className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                onClick={() => { handleCompress(item); setContextMenu(null); }}
              >
                <span>📦</span>
                <span>{item.IsDir ? t('filePane.compressFolderToZip', 'דחוס תיקייה ל-ZIP') : t('filePane.compressToZip', 'דחוס ל-ZIP')}</span>
              </button>
            )}

            {/* Extract */}
            {isLocalRemote && isArchive && (
              <button
                className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                onClick={() => { handleExtract(item); setContextMenu(null); }}
              >
                <span>📂</span>
                <span>{t('filePane.extractArchive', 'חלץ ארכיון כאן')}</span>
              </button>
            )}

            {/* Image Format Conversion */}
            {isLocalRemote && isImage && (
              <>
                <div className="h-px bg-white/10 mx-2 my-1" />
                {isHeic ? (
                  <>
                    <button
                      className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                      onClick={() => { handleImageConvert(item, 'jpeg'); setContextMenu(null); }}
                    >
                      <span>📱</span>
                      <span>{t('filePane.convertHeicToJpeg', 'המר HEIC ל-JPEG')}</span>
                    </button>
                    <button
                      className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                      onClick={() => { handleImageConvert(item, 'png'); setContextMenu(null); }}
                    >
                      <span>📱</span>
                      <span>{t('filePane.convertHeicToPng', 'המר HEIC ל-PNG')}</span>
                    </button>
                  </>
                ) : (
                  <>
                    {!isJpeg && (
                      <button
                        className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                        onClick={() => { handleImageConvert(item, 'jpeg'); setContextMenu(null); }}
                      >
                        <span>🖼️</span>
                        <span>{t('filePane.convertToJpeg', 'המר ל-JPEG')}</span>
                      </button>
                    )}
                    {!isPng && (
                      <button
                        className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                        onClick={() => { handleImageConvert(item, 'png'); setContextMenu(null); }}
                      >
                        <span>🖼️</span>
                        <span>{t('filePane.convertToPng', 'המר ל-PNG')}</span>
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {/* Media Conversion */}
            {isLocalRemote && isMedia && (
              <>
                <div className="h-px bg-white/10 mx-2 my-1" />
                {isVideo && (
                  <button
                    className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                    onClick={() => { handleConvert(item, 'mp4'); setContextMenu(null); }}
                  >
                    <span>🎬</span>
                    <span>{t('filePane.convertToMp4', 'המר ל-MP4 (H.264)')}</span>
                  </button>
                )}
                <button
                  className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                  onClick={() => { handleConvert(item, 'mp3'); setContextMenu(null); }}
                >
                  <span>🎵</span>
                  <span>{t('filePane.extractAudioMp3', 'חלץ שמע ל-MP3')}</span>
                </button>
                {isVideo && (
                  <button
                    className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-white/10 transition-colors flex items-center gap-2`}
                    onClick={() => { handleConvert(item, 'web'); setContextMenu(null); }}
                  >
                    <span>🌐</span>
                    <span>{t('filePane.compressForWeb', 'דחוס לאינטרנט (720p)')}</span>
                  </button>
                )}
              </>
            )}

            <div className="h-px bg-white/10 mx-2 my-1" />

            {/* Delete */}
            <button
              className={`w-full px-3 py-1.5 ${isRtl ? 'text-right' : 'text-left'} hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-2`}
              onClick={() => { onDeleteItem(item); setContextMenu(null); }}
            >
              <span>🗑️</span>
              <span>{t('filePane.deleteItem', 'מחק')}</span>
            </button>
          </div>
        );
      })()}
    </div>
  );
};
