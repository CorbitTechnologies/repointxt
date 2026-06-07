import React, { useMemo, useState, useCallback, memo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { getExtension } from '../utils/fileHelpers';
import Icon from './Icon';

const TreeItem = memo(({ item, level, isExpanded, onToggle, isSelected, onSelect, isMobile }) => {
  const { colors } = useTheme();
  const isFile = item.type === 'blob';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '4px 0', minHeight: 32 }}>
        {Array.from({ length: level }).map((_, i) => (
          <div key={`indent-${i}`} style={{ width: 16, height: '100%', borderLeftWidth: i > 0 ? 1 : 0, borderColor: colors.border, borderLeftStyle: 'solid' }} />
        ))}

        <button
          style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onClick={() => !isFile && onToggle(item.path)}
        >
          {!isFile && (
            <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={12} color={colors.textSecondary} />
          )}
        </button>

        <button
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1, padding: '4px 8px', borderRadius: 4, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          onClick={() => onSelect(item)}
        >
          <div style={{ width: 14, height: 14, borderRadius: 3, borderWidth: 1, borderColor: isSelected ? colors.primary : colors.border, borderStyle: 'solid', backgroundColor: isSelected ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center', display: 'flex', marginRight: 8 }}>
            {isSelected && <Icon name="check" size={10} color="#fff" />}
          </div>

          <div style={{ marginRight: 6, display: 'flex', alignItems: 'center' }}>
            <Icon name={isFile ? "file" : "folder"} size={14} color={isFile ? colors.textSecondary : colors.text} />
          </div>

          <span style={{ fontSize: 13, color: isFile ? colors.textSecondary : colors.text, fontWeight: isFile ? '500' : '600' }} className="truncate">
            {item.name}
          </span>
        </button>
      </div>
    </div>
  );
});

const SelectionComponent = ({
  tree, sources, selectedFiles, setSelectedFiles,
  onGenerate, loading, removeSource, preamble, setPreamble, isMobile
}) => {
  const { colors, borderRadius, shadows } = useTheme();
  const [expandedDirs, setExpandedDirs] = useState(new Set(['']));
  const [selectedExtensions, setSelectedExtensions] = useState(new Set());

  const toggleDir = useCallback((path) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((item) => {
    if (item.type === 'blob') {
      setSelectedFiles(prev => {
        const isSelected = prev.some(f => f.path === item.path && f.sourceId === item.sourceId);
        if (isSelected) return prev.filter(f => !(f.path === item.path && f.sourceId === item.sourceId));
        return [...prev, item];
      });
    } else {
      // Folder select: select/deselect all descendant files
      const prefix = item.path + '/';
      const allChildren = tree.filter(f => f.type === 'blob' && f.path.startsWith(prefix) && f.sourceId === item.sourceId);
      
      setSelectedFiles(prev => {
        const selectedPaths = new Set(prev.map(f => `${f.sourceId}:${f.path}`));
        const allSelected = allChildren.every(c => selectedPaths.has(`${c.sourceId}:${c.path}`));
        if (allSelected) {
          const childPathsToRemove = new Set(allChildren.map(c => `${c.sourceId}:${c.path}`));
          return prev.filter(f => !childPathsToRemove.has(`${f.sourceId}:${f.path}`));
        } else {
          const toAdd = allChildren.filter(c => !selectedPaths.has(`${c.sourceId}:${c.path}`));
          return [...prev, ...toAdd];
        }
      });
    }
  }, [tree, setSelectedFiles]);

  const fileExtensions = useMemo(() => {
    if (!tree) return [];
    const exts = new Set();
    tree.forEach(item => {
      if (item.type === 'blob') {
        const ext = getExtension(item.name || item.path);
        if (ext && ext !== 'no extension') {
          exts.add(ext.toLowerCase());
        }
      }
    });
    return Array.from(exts).sort();
  }, [tree]);

  const toggleExtension = useCallback((ext) => {
    setSelectedExtensions(prev => {
      const next = new Set(prev);
      if (next.has(ext)) {
        next.delete(ext);
      } else {
        next.add(ext);
      }
      return next;
    });
  }, []);

  // Construct complete folder-based tree structure dynamically from flat file list
  const hierarchy = useMemo(() => {
    if (!tree) return [];

    let filteredFiles = tree.filter(f => f.type === 'blob');
    if (selectedExtensions.size > 0) {
      filteredFiles = filteredFiles.filter(f => {
        const ext = getExtension(f.name || f.path);
        return selectedExtensions.has(ext.toLowerCase());
      });
    }

    const itemsMap = new Map();

    filteredFiles.forEach(file => {
      const fileKey = `${file.sourceId}:${file.path}`;
      itemsMap.set(fileKey, {
        ...file,
        type: 'blob',
        name: file.path.split('/').pop(),
        level: file.path.split('/').length - 1
      });

      const parts = file.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        const folderPath = parts.slice(0, i).join('/');
        const folderKey = `${file.sourceId}:${folderPath}`;
        if (!itemsMap.has(folderKey)) {
          itemsMap.set(folderKey, {
            sourceId: file.sourceId,
            path: folderPath,
            name: parts[i - 1],
            type: 'tree',
            level: i - 1
          });
        }
      }
    });

    const allItems = Array.from(itemsMap.values());

    allItems.sort((a, b) => {
      if (a.sourceId !== b.sourceId) return a.sourceId.localeCompare(b.sourceId);
      
      const aParts = a.path.split('/');
      const bParts = b.path.split('/');
      const minLength = Math.min(aParts.length, bParts.length);

      for (let i = 0; i < minLength; i++) {
        if (aParts[i] !== bParts[i]) {
          const aIsDir = i < aParts.length - 1 || a.type === 'tree';
          const bIsDir = i < bParts.length - 1 || b.type === 'tree';
          if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
          return aParts[i].localeCompare(bParts[i]);
        }
      }
      return aParts.length - bParts.length;
    });

    return allItems;
  }, [tree, selectedExtensions]);

  const treeStructure = useMemo(() => {
    return hierarchy.filter(item => {
      const parts = item.path.split('/');
      if (parts.length === 1) return true;
      const parentPath = parts.slice(0, -1).join('/');
      return expandedDirs.has(`${item.sourceId}:${parentPath}`);
    });
  }, [hierarchy, expandedDirs]);

  const isFolderSelected = useCallback((item) => {
    const prefix = item.path + '/';
    const allChildren = tree.filter(f => f.type === 'blob' && f.path.startsWith(prefix) && f.sourceId === item.sourceId);
    if (allChildren.length === 0) return false;
    return allChildren.every(c => selectedFiles.some(sf => sf.path === c.path && sf.sourceId === c.sourceId));
  }, [tree, selectedFiles]);

  const selectedCount = selectedFiles?.length || 0;
  const totalCount = tree?.filter(i => i.type === 'blob').length || 0;

  if (!tree) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: colors.card, borderRadius: 12, padding: isMobile ? 12 : 20, ...shadows.lg, boxSizing: 'border-box', border: `1px solid ${colors.border}` }}>
        
        {/* Header section with Selection and All / None buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="menu" size={16} color={colors.text} />
              <span style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Selection</span>
            </div>
            <span style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Manage added codebases</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <button 
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                padding: '4px 12px',
                color: colors.text,
                fontSize: 12,
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onClick={() => setSelectedFiles(tree.filter(f => f.type === 'blob'))}
            >
              All
            </button>
            <button 
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                padding: '4px 12px',
                color: colors.text,
                fontSize: 12,
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onClick={() => setSelectedFiles([])}
            >
              None
            </button>
          </div>
        </div>

        {/* Codebases / Sources tags list */}
        {sources.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {sources.map(source => (
              <div 
                key={source.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 8, 
                  backgroundColor: colors.surface, 
                  padding: '6px 12px', 
                  borderRadius: 6, 
                  border: `1px solid ${colors.border}` 
                }}
              >
                <Icon name={source.type === 'github' ? 'github' : 'folder'} size={13} color={colors.primary} />
                <span style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{source.name}</span>
                <button 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    padding: 0, 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 4
                  }} 
                  onClick={() => removeSource(source.id)}
                >
                  <Icon name="trash" size={13} color={colors.error} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Filter by Type section (with horizontal scroll, no wrap) */}
        {fileExtensions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="filter" size={12} color={colors.textSecondary} />
              <span style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textSecondary }}>Filter by type</span>
            </div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              flexWrap: 'nowrap', 
              gap: 8, 
              overflowX: 'auto', 
              paddingBottom: 8,
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin'
            }}>
              {fileExtensions.map(ext => {
                const isActive = selectedExtensions.has(ext);
                return (
                  <button
                    key={ext}
                    onClick={() => toggleExtension(ext)}
                    style={{
                      backgroundColor: isActive ? '#ffffff' : colors.surface,
                      color: isActive ? '#000000' : colors.text,
                      border: `1px solid ${isActive ? '#ffffff' : colors.border}`,
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 13,
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease-in-out',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {ext}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Expand / Collapse All section */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <button 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} 
            onClick={() => {
              const allDirs = new Set(['']);
              tree.forEach(f => {
                let p = f.path;
                while (p.includes('/')) {
                  p = p.substring(0, p.lastIndexOf('/'));
                  allDirs.add(`${f.sourceId}:${p}`);
                }
              });
              setExpandedDirs(allDirs);
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="plus" size={12} color={colors.text} />
              <span style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Expand All</span>
            </div>
          </button>

          <span style={{ color: colors.border }}>—</span>

          <button 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} 
            onClick={() => setExpandedDirs(new Set(['']))}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Collapse All</span>
            </div>
          </button>
        </div>

        {/* Tree View Container */}
        <div style={{ backgroundColor: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 8px' }}>
            {treeStructure.length > 0 ? (
              treeStructure.map((item, idx) => (
                <TreeItem
                  key={`${item.sourceId}-${item.path}-${idx}`}
                  item={item}
                  level={item.level}
                  isExpanded={expandedDirs.has(`${item.sourceId}:${item.path}`)}
                  onToggle={(p) => toggleDir(`${item.sourceId}:${p}`)}
                  isSelected={item.type === 'blob'
                    ? selectedFiles.some(f => f.path === item.path && f.sourceId === item.sourceId)
                    : isFolderSelected(item)
                  }
                  onSelect={toggleSelect}
                  isMobile={isMobile}
                />
              ))
            ) : (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: colors.textSecondary, fontSize: 13 }}>
                No files match the active filters
              </div>
            )}
          </div>
        </div>

        {/* System Instructions / Preamble */}
        <div style={{ marginTop: 24 }}>
          <span style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, display: 'block', textTransform: 'uppercase' }}>
            System Instructions (Optional)
          </span>
          <textarea
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderStyle: 'solid',
              borderRadius: 8,
              padding: 12,
              color: colors.text,
              fontSize: 13,
              minHeight: 80,
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none'
            }}
            placeholder="e.g., 'Analyze this codebase and find security vulnerabilities...'"
            value={preamble}
            onChange={(e) => setPreamble(e.target.value)}
          />
        </div>

        {/* Action Button */}
        <button
          style={{
            backgroundColor: colors.primary,
            borderRadius: borderRadius.md,
            padding: 16,
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: loading || selectedCount === 0 ? 'default' : 'pointer',
            opacity: loading || selectedCount === 0 ? 0.6 : 1,
            ...shadows.md
          }}
          onClick={onGenerate}
          disabled={loading || selectedCount === 0}
        >
          {loading ? (
            <span style={{ color: '#fff' }}>Generating...</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="rocket" size={18} color="#fff" />
              <span style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>Generate Context Bundle</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default memo(SelectionComponent);
