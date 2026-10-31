import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Icon from './Icon';
import Checkbox from './Checkbox';
import { FileItem, Source } from '../types';
import { trackFileFryerOutbound } from '../services/firebase';

interface Props {
  tree: FileItem[];
  sources: Source[];
  removeSource: (id: string) => void;
  onClearAll?: () => void;
  selectedFiles: FileItem[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  onGenerate: () => Promise<void> | void;
  loading: boolean;
  isMobile?: boolean;
  maxContextTokens?: number;
}

export interface VisibleTreeRow {
  key: string;
  sourceId: string;
  path: string;
  name: string;
  isFolder: boolean;
  depth: number;
  item?: FileItem; // Present if blob
  totalFiles?: number;
  totalBytes?: number;
}

export const SelectionComponent: React.FC<Props> = ({
  tree,
  sources,
  removeSource,
  onClearAll,
  selectedFiles,
  setSelectedFiles,
  onGenerate,
  loading,
  isMobile = false,
  maxContextTokens = 1000000,
}) => {
  // Compute all folders in tree
  const getAllFolderKeys = useCallback((treeItems: FileItem[]) => {
    const folders = new Set<string>();
    for (const item of treeItems) {
      if (item.type !== 'blob') continue;
      const parts = item.path.split('/');
      let cur = '';
      for (let i = 0; i < parts.length - 1; i++) {
        cur = cur ? `${cur}/${parts[i]}` : parts[i];
        folders.add(`${item.sourceId}:${cur}`);
      }
    }
    return folders;
  }, []);

  const [filterQuery, setFilterQuery] = useState('');
  // All folders collapsed by default
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => getAllFolderKeys(tree));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [activePreset, setActivePreset] = useState<'core' | 'all' | 'none' | null>('core');

  // Collapse all folders when tree changes (e.g. after a new scan or new source loaded)
  const lastTreeRef = useRef(tree);
  useEffect(() => {
    if (lastTreeRef.current !== tree) {
      lastTreeRef.current = tree;
      setCollapsedFolders(getAllFolderKeys(tree));
    }
  }, [tree, getAllFolderKeys]);

  // Detect if current codebase contains Flutter / Dart
  const isFlutterProject = useMemo(() => {
    return tree.some(i => i.path.toLowerCase().endsWith('pubspec.yaml') || i.path.toLowerCase().endsWith('.dart'));
  }, [tree]);

  // Fast Set for O(1) selection lookup
  const selectedKeys = useMemo(() => {
    return new Set(selectedFiles.map(f => `${f.sourceId}:${f.path}`));
  }, [selectedFiles]);

  // Static folder structural hierarchy (computed ONCE per tree, independent of selections)
  const folderHierarchy = useMemo(() => {
    const stats = new Map<string, { total: number; bytes: number }>();
    const descendants = new Map<string, FileItem[]>();

    for (const item of tree) {
      if (item.type !== 'blob') continue;
      const parts = item.path.split('/');
      const size = item.size || 0;

      let current = '';
      for (let i = 0; i < parts.length - 1; i++) {
        current = current ? `${current}/${parts[i]}` : parts[i];
        const key = `${item.sourceId}:${current}`;
        const entry = stats.get(key) || { total: 0, bytes: 0 };
        entry.total += 1;
        entry.bytes += size;
        stats.set(key, entry);

        let list = descendants.get(key);
        if (!list) {
          list = [];
          descendants.set(key, list);
        }
        list.push(item);
      }
    }
    return { folderTotals: stats, folderDescendants: descendants };
  }, [tree]);

  // Pre-map file paths to parent folder keys once when tree changes, NOT on every selection change
  const fileToFoldersMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of tree) {
      if (item.type !== 'blob') continue;
      const parts = item.path.split('/');
      const folders: string[] = [];
      let cur = '';
      for (let i = 0; i < parts.length - 1; i++) {
        cur = cur ? `${cur}/${parts[i]}` : parts[i];
        folders.push(`${item.sourceId}:${cur}`);
      }
      map.set(`${item.sourceId}:${item.path}`, folders);
    }
    return map;
  }, [tree]);

  // Fast count updates using cached folder keys without repeated path split string operations
  const folderSelectedCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of selectedFiles) {
      const parentFolders = fileToFoldersMap.get(`${f.sourceId}:${f.path}`);
      if (parentFolders) {
        for (const folderKey of parentFolders) {
          counts.set(folderKey, (counts.get(folderKey) || 0) + 1);
        }
      }
    }
    return counts;
  }, [selectedFiles, fileToFoldersMap]);

  const folderDescendantsMap = folderHierarchy.folderDescendants;

  // Build hierarchical visible rows (only recomputed when tree, filter, or collapsed state changes)
  const visibleRows = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const rows: VisibleTreeRow[] = [];

    // Group blobs by sourceId
    const sourceMap = new Map<string, FileItem[]>();
    for (const item of tree) {
      if (item.type !== 'blob') continue;
      if (q && !item.path.toLowerCase().includes(q)) continue;
      let list = sourceMap.get(item.sourceId);
      if (!list) {
        list = [];
        sourceMap.set(item.sourceId, list);
      }
      list.push(item);
    }

    // Build hierarchical items for each source
    for (const [sourceId, files] of sourceMap.entries()) {
      // Collect unique folder prefixes
      const folderSet = new Set<string>();
      for (const f of files) {
        const parts = f.path.split('/');
        let cur = '';
        for (let i = 0; i < parts.length - 1; i++) {
          cur = cur ? `${cur}/${parts[i]}` : parts[i];
          folderSet.add(cur);
        }
      }

      // Sort folders hierarchically
      const allPaths: Array<{ path: string; isFolder: boolean; item?: FileItem }> = [];
      folderSet.forEach(fp => {
        allPaths.push({ path: fp, isFolder: true });
      });
      files.forEach(f => {
        allPaths.push({ path: f.path, isFolder: false, item: f });
      });

      // Natural path sorting
      allPaths.sort((a, b) => a.path.localeCompare(b.path));

      for (const entry of allPaths) {
        const parts = entry.path.split('/');
        const depth = parts.length - 1;

        // If not searching, check if any parent folder is collapsed
        if (!q && depth > 0) {
          let hasCollapsedParent = false;
          let checkPrefix = '';
          for (let p = 0; p < parts.length - 1; p++) {
            checkPrefix = checkPrefix ? `${checkPrefix}/${parts[p]}` : parts[p];
            if (collapsedFolders.has(`${sourceId}:${checkPrefix}`)) {
              hasCollapsedParent = true;
              break;
            }
          }
          if (hasCollapsedParent) continue;
        }

        const name = parts[parts.length - 1];
        const rowKey = `${sourceId}:${entry.path}`;
        const fTotal = entry.isFolder ? folderHierarchy.folderTotals.get(rowKey) : undefined;

        rows.push({
          key: rowKey,
          sourceId,
          path: entry.path,
          name,
          isFolder: entry.isFolder,
          depth,
          item: entry.item,
          totalFiles: fTotal?.total,
          totalBytes: fTotal?.bytes,
        });
      }
    }

    return rows;
  }, [tree, filterQuery, collapsedFolders, folderHierarchy]);

  // Expand / Collapse all folders helper
  const collapseAllFolders = useCallback(() => {
    setCollapsedFolders(getAllFolderKeys(tree));
  }, [tree, getAllFolderKeys]);

  const expandAllFolders = useCallback(() => {
    setCollapsedFolders(new Set());
  }, []);

  // Total selected metrics
  const totalSelectedBytes = useMemo(() => {
    return selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [selectedFiles]);

  const totalEstimatedTokens = useMemo(() => {
    return Math.ceil(totalSelectedBytes / 3.8);
  }, [totalSelectedBytes]);

  const tokenLimit = maxContextTokens || 200000;
  const tokenPercentage = Math.min(100, Math.round((totalEstimatedTokens / tokenLimit) * 100));
  const isTokenWarning = totalEstimatedTokens > tokenLimit * 0.8;
  const isTokenExceeded = totalEstimatedTokens > tokenLimit;

  const [justGenerated, setJustGenerated] = useState(false);
  const [lastElapsedMs, setLastElapsedMs] = useState<number | null>(null);
  const [elapsedRunningSec, setElapsedRunningSec] = useState<number>(0);

  useEffect(() => {
    let timer: any;
    if (loading) {
      const tStart = Date.now();
      setElapsedRunningSec(0);
      timer = setInterval(() => {
        setElapsedRunningSec(Number(((Date.now() - tStart) / 1000).toFixed(1)));
      }, 100);
    } else {
      setElapsedRunningSec(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const handleGenerateClick = useCallback(async () => {
    if (selectedFiles.length === 0 || loading) return;
    const t0 = performance.now();
    try {
      await onGenerate();
      const duration = Math.round(performance.now() - t0);
      setLastElapsedMs(duration);
      setJustGenerated(true);
      setCopiedNotification(true);
      setTimeout(() => {
        setJustGenerated(false);
      }, 2500);
      setTimeout(() => {
        setCopiedNotification(false);
      }, 3500);
    } catch (e) {
      console.error(e);
    }
  }, [onGenerate, selectedFiles.length, loading]);

  // Global shortcut: Cmd+Enter or Ctrl+Enter to generate and copy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerateClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerateClick]);

  // Toggle folder open/closed
  const toggleFolderCollapse = useCallback((folderKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderKey)) {
        next.delete(folderKey);
      } else {
        next.add(folderKey);
      }
      return next;
    });
  }, []);

  // Select / Unselect entire folder
  const toggleFolderSelection = useCallback((row: VisibleTreeRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActivePreset(null);
    const descendants = folderDescendantsMap.get(row.key) || [];
    if (descendants.length === 0) return;

    const allSelected = descendants.every(f => selectedKeys.has(`${f.sourceId}:${f.path}`));

    if (allSelected) {
      // Unselect entire folder
      const toRemove = new Set(descendants.map(f => `${f.sourceId}:${f.path}`));
      setSelectedFiles(prev => prev.filter(f => !toRemove.has(`${f.sourceId}:${f.path}`)));
    } else {
      // Select entire folder
      const existing = new Set(selectedFiles.map(f => `${f.sourceId}:${f.path}`));
      const toAdd = descendants.filter(f => !existing.has(`${f.sourceId}:${f.path}`));
      setSelectedFiles(prev => [...prev, ...toAdd]);
    }
  }, [folderDescendantsMap, selectedKeys, selectedFiles, setSelectedFiles]);

  // Toggle file selection
  const toggleFileSelection = useCallback((file: FileItem) => {
    setActivePreset(null);
    const key = `${file.sourceId}:${file.path}`;
    setSelectedFiles(prev =>
      selectedKeys.has(key)
        ? prev.filter(f => `${f.sourceId}:${f.path}` !== key)
        : [...prev, file]
    );
  }, [selectedKeys, setSelectedFiles]);

  // Presets
  const applyPreset = (type: 'core' | 'all' | 'none') => {
    setActivePreset(type);
    if (type === 'none') {
      setSelectedFiles([]);
      return;
    }
    if (type === 'all') {
      setSelectedFiles(tree.filter(i => i.type === 'blob'));
      return;
    }
    if (type === 'core') {
      const nonCode = /\.(png|jpe?g|gif|svg|ico|pdf|zip|lock|lockb|min\.js|map)$/i;
      const coreDir = /(^|\/)(src|lib|app|components|pages|hooks|services|core|api)\//i;
      setSelectedFiles(
        tree.filter(i => {
          if (i.type !== 'blob' || nonCode.test(i.path)) return false;
          // De-prioritize ios/ and android/ boilerplate by default unless key manifests
          const p = i.path.toLowerCase();
          if ((p.startsWith('ios/') || p.startsWith('android/')) && !p.endsWith('androidmanifest.xml') && !p.endsWith('build.gradle') && !p.endsWith('podfile')) {
            return false;
          }
          return coreDir.test(i.path) || !i.path.includes('/');
        })
      );
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10,
  });

  // Tree keyboard navigation: ArrowUp, ArrowDown, ArrowRight (expand), ArrowLeft (collapse), Space (toggle)
  const handleTreeKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (visibleRows.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const next = Math.min(prev + 1, visibleRows.length - 1);
        rowVirtualizer.scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const next = Math.max(prev - 1, 0);
        rowVirtualizer.scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const currRow = visibleRows[focusedIndex];
      if (currRow && currRow.isFolder && collapsedFolders.has(currRow.key)) {
        setCollapsedFolders(prev => {
          const next = new Set(prev);
          next.delete(currRow.key);
          return next;
        });
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const currRow = visibleRows[focusedIndex];
      if (currRow && currRow.isFolder && !collapsedFolders.has(currRow.key)) {
        setCollapsedFolders(prev => {
          const next = new Set(prev);
          next.add(currRow.key);
          return next;
        });
      }
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      const currRow = visibleRows[focusedIndex];
      if (currRow) {
        if (currRow.isFolder) {
          toggleFolderSelection(currRow);
        } else if (currRow.item) {
          toggleFileSelection(currRow.item);
        }
      }
    }
  }, [visibleRows, focusedIndex, collapsedFolders, rowVirtualizer, toggleFolderSelection, toggleFileSelection]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
      {/* ── TOP HEADER & STATS ── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: 8
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px', color: '#f0f6fc' }}>
              Codebase Selection
            </h2>
            <span style={{
              fontSize: '10.5px',
              backgroundColor: 'rgba(56, 139, 253, 0.1)',
              border: '1px solid rgba(56, 139, 253, 0.3)',
              padding: '1px 8px',
              borderRadius: '10px',
              color: '#58a6ff',
              fontWeight: 600,
              letterSpacing: '0.1px'
            }}>
              {selectedFiles.length.toLocaleString()} of {tree.filter(i => i.type === 'blob').length.toLocaleString()} files
            </span>
            {isFlutterProject && (
              <span style={{
                fontSize: '10.5px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '1px 7px',
                borderRadius: '10px',
                color: '#38bdf8',
                fontWeight: 600
              }}>
                Flutter / Mobile
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: isMobile ? '11px' : '11.5px', color: '#8b949e' }}>
            <span>{formatSize(totalSelectedBytes)}</span>
            <span>•</span>
            <span style={{ color: isTokenExceeded ? '#f85149' : isTokenWarning ? '#e3b341' : '#c9d1d9', fontWeight: 500 }}>
              ~{totalEstimatedTokens.toLocaleString()} tokens estimated
            </span>
            {isTokenExceeded && (
              <span style={{
                fontSize: '9.5px',
                backgroundColor: 'rgba(248, 81, 73, 0.15)',
                color: '#f85149',
                border: '1px solid rgba(248, 81, 73, 0.3)',
                padding: '1px 6px',
                borderRadius: '8px',
                fontWeight: 700
              }}>
                EXCEEDS MODEL CONTEXT
              </span>
            )}
          </div>
        </div>

        {/* ── PRESET ACTION BUTTONS WITH ACTIVE STATE ── */}
        <div style={{
          display: 'flex',
          gap: 5,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          overflowX: isMobile ? 'auto' : 'visible',
          paddingBottom: isMobile ? 2 : 0,
          WebkitOverflowScrolling: 'touch'
        }}>
          <button
            onClick={() => applyPreset('core')}
            className="btn-secondary"
            style={{
              flexShrink: 0,
              backgroundColor: activePreset === 'core' ? 'rgba(31, 111, 235, 0.2)' : 'var(--bg-surface)',
              borderColor: activePreset === 'core' ? '#388bfd' : 'var(--border)',
              color: activePreset === 'core' ? '#58a6ff' : '#c9d1d9',
              fontWeight: activePreset === 'core' ? 600 : 500,
              padding: '4px 9px',
              borderRadius: '5px',
              transition: 'all 0.15s ease'
            }}
          >
            🎯 Core Code
          </button>
          <button
            onClick={() => applyPreset('all')}
            className="btn-secondary"
            style={{
              flexShrink: 0,
              backgroundColor: activePreset === 'all' ? 'rgba(31, 111, 235, 0.2)' : 'var(--bg-surface)',
              borderColor: activePreset === 'all' ? '#388bfd' : 'var(--border)',
              color: activePreset === 'all' ? '#58a6ff' : '#c9d1d9',
              fontWeight: activePreset === 'all' ? 600 : 500,
              padding: '4px 9px',
              borderRadius: '5px',
              transition: 'all 0.15s ease'
            }}
          >
            Select All
          </button>
          <button
            onClick={() => applyPreset('none')}
            className="btn-secondary"
            style={{
              flexShrink: 0,
              color: '#8b949e',
              padding: '4px 9px',
              borderRadius: '5px',
              transition: 'all 0.15s ease'
            }}
            title="Uncheck all files"
          >
            Deselect All
          </button>
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="btn-secondary"
              style={{
                flexShrink: 0,
                color: '#f85149',
                borderColor: 'rgba(248, 81, 73, 0.3)',
                backgroundColor: 'rgba(248, 81, 73, 0.08)',
                padding: '4px 9px',
                borderRadius: '5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s ease'
              }}
              title="Remove loaded files and output"
            >
              <Icon name="x" size={11} color="#f85149" />
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>

      {/* ── VISUAL TOKEN BUDGET CONSUMPTION BAR ── */}
      <div style={{
        backgroundColor: 'rgba(22, 27, 34, 0.75)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '6px 10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#8b949e', marginBottom: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontWeight: 500, color: '#c9d1d9' }}>Token Budget Consumption</span>
            <span style={{ fontSize: '9.5px', backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '1px 5px', borderRadius: '3px', color: '#8b949e' }}>
              {tokenLimit >= 1000000 ? `${(tokenLimit / 1000000).toFixed(1)}M limit` : `${Math.round(tokenLimit / 1000)}k limit`}
            </span>
          </div>
          <span style={{ color: isTokenExceeded ? '#f85149' : isTokenWarning ? '#e3b341' : '#58a6ff', fontWeight: 600, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '11px' }}>
            {totalEstimatedTokens.toLocaleString()} / {tokenLimit >= 1000000 ? `${(tokenLimit / 1000000).toFixed(1)}M` : `${Math.round(tokenLimit / 1000)}k`} ({tokenPercentage}%)
          </span>
        </div>
        <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${tokenPercentage}%`,
            height: '100%',
            backgroundColor: isTokenExceeded ? '#f85149' : isTokenWarning ? '#e3b341' : '#238636',
            borderRadius: '3px',
            transition: 'width 0.25s ease-out'
          }} />
        </div>
      </div>

      {/* ── ACTIVE SOURCE BADGES (Visible for all loaded sources) ── */}
      {sources.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sources.map(s => (
            <div key={s.id} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '11.5px',
              color: '#c9d1d9'
            }}>
              <Icon name="folder" size={12} color="#58a6ff" />
              <span>{s.name}</span>
              <button
                onClick={() => removeSource(s.id)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#f85149', display: 'flex', alignItems: 'center' }}
                title={`Remove ${s.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── SEARCH & FOLDER CONTROLS TOOLBAR ── */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filter files by name or path (e.g. lib, .dart, auth)..."
            style={{
              width: '100%',
              backgroundColor: '#0d1117',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 10px 6px 28px',
              color: '#f0f6fc',
              fontSize: '12.5px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease'
            }}
          />
          <div style={{ position: 'absolute', left: '9px', top: '7px', pointerEvents: 'none' }}>
            <Icon name="search" size={12} color="#6e7681" />
          </div>
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '6px',
                background: 'none',
                border: 'none',
                color: '#8b949e',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Global Expand / Collapse Folder Toggle Buttons */}
        <button
          onClick={expandAllFolders}
          className="btn-secondary"
          style={{ padding: '5px 9px', flexShrink: 0, fontSize: '11.5px', borderRadius: '5px' }}
          title="Expand all folders"
        >
          <Icon name="chevron-down" size={11} color="#8b949e" />
          <span>Expand</span>
        </button>
        <button
          onClick={collapseAllFolders}
          className="btn-secondary"
          style={{ padding: '5px 9px', flexShrink: 0, fontSize: '11.5px', borderRadius: '5px' }}
          title="Collapse all folders"
        >
          <Icon name="chevron-right" size={11} color="#8b949e" />
          <span>Collapse</span>
        </button>
      </div>

      {/* ── VIRTUALIZED HIERARCHICAL TREE VIEW ── */}
      <div
        ref={parentRef}
        role="tree"
        aria-label="Repository File Tree"
        tabIndex={0}
        onKeyDown={handleTreeKeyDown}
        className="tree-container"
        style={{
          backgroundColor: '#090d13',
          border: '1px solid var(--border)',
          borderRadius: '7px',
          maxHeight: '340px',
          overflowY: 'auto',
          position: 'relative',
          outline: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {visibleRows.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
            No files match "{filterQuery}"
          </div>
        ) : (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const rowIndex = virtualRow.index;
              const row = visibleRows[rowIndex];
              const isFolder = row.isFolder;
              const isCollapsed = isFolder && collapsedFolders.has(row.key);
              const isFocused = rowIndex === focusedIndex;

              // Folder selection state
              const totalInFolder = isFolder ? (folderHierarchy.folderTotals.get(row.key)?.total || 0) : 0;
              const selectedInFolder = isFolder ? (folderSelectedCount.get(row.key) || 0) : 0;
              const isChecked = isFolder
                ? Boolean(totalInFolder > 0 && selectedInFolder === totalInFolder)
                : selectedKeys.has(row.key);
              const isIndeterminate = Boolean(isFolder && selectedInFolder > 0 && selectedInFolder < totalInFolder);

              // Responsive indentation
              const indentPx = isMobile ? Math.min(row.depth * 10, 24) : row.depth * 16;

              // Highlighting specific frameworks
              const isFlutterLib = isFolder && (row.path === 'lib' || row.path.endsWith('/lib'));
              const isMobileWrapper = isFolder && (row.path === 'ios' || row.path === 'android');

              return (
                <div
                  key={row.key}
                  role="treeitem"
                  aria-expanded={isFolder ? !isCollapsed : undefined}
                  aria-selected={Boolean(isChecked)}
                  tabIndex={isFocused ? 0 : -1}
                  className="tree-row"
                  onClick={() => {
                    setFocusedIndex(rowIndex);
                    if (isFolder) {
                      toggleFolderSelection(row);
                    } else if (row.item) {
                      toggleFileSelection(row.item);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingLeft: `${8 + indentPx}px`,
                    paddingRight: '12px',
                    boxSizing: 'border-box',
                    backgroundColor: isFocused
                      ? 'rgba(56, 139, 253, 0.15)'
                      : isFolder
                        ? 'rgba(255, 255, 255, 0.015)'
                        : 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.025)',
                    outline: isFocused ? '1px solid rgba(56, 139, 253, 0.4)' : 'none',
                    outlineOffset: '-1px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    {/* Folder Expand/Collapse Chevron Button */}
                    {isFolder ? (
                      <button
                        type="button"
                        onClick={(e) => toggleFolderCollapse(row.key, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          width: 18,
                          height: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#8b949e',
                          borderRadius: '4px',
                          flexShrink: 0
                        }}
                        title={isCollapsed ? 'Expand folder' : 'Collapse folder'}
                      >
                        <Icon name={isCollapsed ? 'chevron-right' : 'chevron-down'} size={12} color="#8b949e" />
                      </button>
                    ) : (
                      <div style={{ width: 18, flexShrink: 0 }} />
                    )}

                    {/* Checkbox (Click toggles item or entire folder) */}
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <Checkbox
                        checked={Boolean(isChecked)}
                        indeterminate={Boolean(isIndeterminate)}
                        onChange={() => {
                          if (isFolder) {
                            toggleFolderSelection(row);
                          } else if (row.item) {
                            toggleFileSelection(row.item);
                          }
                        }}
                      />
                    </div>

                    {/* Icon & Label */}
                    {isFolder ? (
                      <div
                        onClick={(e) => toggleFolderCollapse(row.key, e)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          minWidth: 0,
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        <Icon
                          name="folder"
                          size={14}
                          color={isFlutterLib ? '#38bdf8' : isMobileWrapper ? '#e3b341' : '#58a6ff'}
                        />
                        <span style={{
                          fontWeight: 600,
                          fontSize: isMobile ? '12.5px' : '13px',
                          color: '#f0f6fc',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {row.name}
                        </span>
                        {isMobileWrapper && (
                          <span style={{
                            fontSize: '9px',
                            backgroundColor: 'rgba(227, 179, 65, 0.12)',
                            color: '#e3b341',
                            border: '1px solid rgba(227, 179, 65, 0.25)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            letterSpacing: '0.2px'
                          }}>
                            native
                          </span>
                        )}
                        {isFlutterLib && (
                          <span style={{
                            fontSize: '9px',
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            letterSpacing: '0.2px'
                          }}>
                            core
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                        <Icon name="file" size={13} color="#6e7681" />
                        <span style={{
                          fontSize: isMobile ? '12px' : '12.5px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: isChecked ? '#f0f6fc' : '#c9d1d9',
                          fontWeight: isChecked ? 500 : 400
                        }}>
                          {row.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Size & Token Badges */}
                  <div style={{ fontSize: '11px', color: '#8b949e', flexShrink: 0, marginLeft: '8px' }}>
                    {isFolder ? (
                      <span style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '10.5px',
                        color: selectedInFolder > 0 ? '#58a6ff' : '#8b949e',
                        fontWeight: 500
                      }}>
                        {totalInFolder > 0 ? `${selectedInFolder}/${totalInFolder} f` : `${row.totalFiles || 0} f`}
                      </span>
                    ) : (
                      <span style={{ color: isChecked ? '#8b949e' : '#6e7681' }}>
                        {isMobile
                          ? `~${Math.ceil((row.item?.size || 0) / 3.8)}t`
                          : `${formatSize(row.item?.size || 0)} · ~${Math.ceil((row.item?.size || 0) / 3.8)} tokens`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── AUTO-COPY BANNER NOTIFICATION ── */}
      {copiedNotification && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          backgroundColor: 'rgba(35, 134, 54, 0.15)',
          border: '1px solid rgba(35, 134, 54, 0.4)',
          borderRadius: '8px',
          padding: '10px 16px',
          color: '#3fb950',
          fontSize: '13px',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <Icon name="check" size={16} color="#3fb950" />
          <span>Context bundle copied directly to clipboard! (~{totalEstimatedTokens.toLocaleString()} tokens)</span>
        </div>
      )}

      {/* ── CORBIT PRIVACY ECOSYSTEM: FILEFRYER CROSS-PROMOTION ── */}
      <div style={{
        marginTop: 10,
        marginBottom: 8,
        padding: '7px 12px',
        backgroundColor: 'rgba(255, 255, 255, 0.025)',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '11.5px',
        color: '#8b949e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <span>Need to convert or compress non-code PDFs, images, or media in this repository?</span>
        <a
          href="https://filefryer.com/?utm_source=repointxt&utm_medium=asset_banner&utm_campaign=privacy_ecosystem"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackFileFryerOutbound('selection_banner')}
          style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}
        >
          <span>Open FileFryer (100% In-Browser &amp; Private)</span>
          <span style={{ fontSize: '10px' }}>↗</span>
        </a>
      </div>

      {/* ── STICKY PRIMARY ACTION BAR ── */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        backgroundColor: 'var(--bg-card)',
        paddingTop: '6px',
        borderTop: '1px solid var(--border)'
      }}>
        <button
          onClick={handleGenerateClick}
          disabled={selectedFiles.length === 0 || loading}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '6px',
            backgroundColor: justGenerated ? '#238636' : loading ? 'rgba(31, 111, 235, 0.7)' : 'var(--primary)',
            boxShadow: justGenerated ? '0 0 15px rgba(35, 134, 54, 0.4)' : selectedFiles.length > 0 ? '0 2px 8px rgba(31, 111, 235, 0.3)' : 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <Icon name={justGenerated ? "check" : "zap"} size={16} color={selectedFiles.length === 0 ? 'var(--text-muted)' : '#ffffff'} />
          <span>
            {loading
              ? `Packing Prompt Context... (${elapsedRunningSec.toFixed(1)}s)`
              : justGenerated
                ? `Bundle Ready & Copied! (${lastElapsedMs && lastElapsedMs < 1000 ? `${lastElapsedMs}ms` : `${((lastElapsedMs || 0) / 1000).toFixed(1)}s`} ⚡)`
                : `Generate LLM Context Bundle (${selectedFiles.length.toLocaleString()} files · ~${totalEstimatedTokens.toLocaleString()} tokens)`}
          </span>
          {!loading && !justGenerated && (
            <span style={{
              fontSize: '10.5px',
              opacity: 0.85,
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              padding: '1px 5px',
              borderRadius: '3px',
              marginLeft: '5px',
              fontFamily: 'ui-monospace, monospace'
            }}>
              ⌘↵
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default SelectionComponent;
