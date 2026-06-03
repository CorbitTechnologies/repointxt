import React, { useMemo, useState, useCallback, memo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { getExtension } from '../utils/fileHelpers';
import Icon from './Icon';

const getFileIcon = (filename) => {
  const ext = getExtension(filename);
  switch (ext) {
    case 'js': case 'jsx': case 'ts': case 'tsx': return '#F7DF1E';
    case 'py': return '#3776AB';
    case 'html': case 'css': return '#E34F26';
    case 'json': return '#000000';
    case 'md': return '#083fa1';
    default: return '#888888';
  }
};

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
  const { colors, borderRadius, shadows, isDark } = useTheme();
  const [expandedDirs, setExpandedDirs] = useState(new Set(['']));
  const [filterText, setFilterText] = useState('');

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
      const allChildren = tree.filter(f => f.type === 'blob' && f.path.startsWith(item.path + '/') && f.sourceId === item.sourceId);
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

  const treeStructure = useMemo(() => {
    if (!tree) return [];

    let filtered = tree;
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = tree.filter(f => f.path.toLowerCase().includes(lowerFilter));
      const parents = new Set();
      filtered.forEach(f => {
        let p = f.path;
        while (p.includes('/')) {
          p = p.substring(0, p.lastIndexOf('/'));
          parents.add(`${f.sourceId}:${p}`);
        }
      });
      filtered = tree.filter(f => filtered.includes(f) || (f.type !== 'blob' && parents.has(`${f.sourceId}:${f.path}`)));
    }

    const structure = [];
    const pathMap = new Map();

    const sortedTree = [...filtered].sort((a, b) => {
      if (a.sourceId !== b.sourceId) return a.sourceId.localeCompare(b.sourceId);
      const aParts = a.path.split('/');
      const bParts = b.path.split('/');
      for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) {
          const aIsDir = i < aParts.length - 1 || a.type === 'tree';
          const bIsDir = i < bParts.length - 1 || b.type === 'tree';
          if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
          return aParts[i].localeCompare(bParts[i]);
        }
      }
      return aParts.length - bParts.length;
    });

    sortedTree.forEach(item => {
      const parts = item.path.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');

      const node = { ...item, name, level: parts.length - 1 };

      if (filterText) {
        structure.push(node);
      } else {
        if (parentPath === '') {
          structure.push(node);
        } else if (expandedDirs.has(`${item.sourceId}:${parentPath}`)) {
          structure.push(node);
        }
      }
    });

    return structure;
  }, [tree, expandedDirs, filterText]);

  const selectedCount = selectedFiles?.length || 0;
  const totalCount = tree?.filter(i => i.type === 'blob').length || 0;

  if (!tree) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {sources.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sources.map(source => (
            <div key={source.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, padding: '10px 16px', borderRadius: 8, borderWidth: 1, borderColor: colors.border, borderStyle: 'solid' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name={source.type === 'github' ? 'github' : 'folder'} size={14} color={colors.primary} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{source.name}</span>
                  <span style={{ fontSize: 11, color: colors.textSecondary }}>{source.selectedFiles.length} files selected</span>
                </div>
              </div>
              <button style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => removeSource(source.id)}>
                <Icon name="trash" size={14} color={colors.error} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: colors.card, borderRadius: 12, padding: isMobile ? 12 : 20, ...shadows.lg, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: 16, gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Selected Files</span>
            <div style={{ backgroundColor: colors.primary + '15', padding: '2px 8px', borderRadius: 12 }}>
              <span style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{selectedCount} / {totalCount}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 6, padding: '6px 12px', borderWidth: 1, borderColor: colors.border, borderStyle: 'solid', width: isMobile ? '100%' : 200, boxSizing: 'border-box' }}>
            <Icon name="filter" size={14} color={colors.textSecondary} />
            <input
              style={{ flex: 1, marginLeft: 8, fontSize: 13, color: colors.text, background: 'transparent', border: 'none', outline: 'none' }}
              placeholder="Filter by file types (.js, .ts)..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => {
            setSelectedFiles(tree.filter(f => f.type === 'blob'));
          }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Select All</span></div>
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => {
            setSelectedFiles([]);
          }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Select None</span></div>
          </button>

          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => {
            const allDirs = new Set(['']);
            tree.forEach(f => {
              let p = f.path;
              while (p.includes('/')) {
                p = p.substring(0, p.lastIndexOf('/'));
                allDirs.add(`${f.sourceId}:${p}`);
              }
            });
            setExpandedDirs(allDirs);
          }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="plus" size={14} color={colors.text} /><span style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Expand All</span></div>
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => setExpandedDirs(new Set(['']))}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="minus" size={14} color={colors.textSecondary} /><span style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Collapse All</span></div>
          </button>
        </div>

        <div style={{ backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, borderStyle: 'solid', overflow: 'hidden' }}>
          <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
            {treeStructure.map((item, idx) => (
              <TreeItem
                key={`${item.sourceId}-${item.path}-${idx}`}
                item={item}
                level={item.level}
                isExpanded={expandedDirs.has(`${item.sourceId}:${item.path}`)}
                onToggle={(p) => toggleDir(`${item.sourceId}:${p}`)}
                isSelected={item.type === 'blob'
                  ? selectedFiles.some(f => f.path === item.path && f.sourceId === item.sourceId)
                  : tree.filter(f => f.type === 'blob' && f.path.startsWith(item.path + '/') && f.sourceId === item.sourceId)
                        .every(c => selectedFiles.some(sf => sf.path === c.path && sf.sourceId === c.sourceId)) &&
                    tree.filter(f => f.type === 'blob' && f.path.startsWith(item.path + '/') && f.sourceId === item.sourceId).length > 0
                }
                onSelect={toggleSelect}
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>

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
            <span style={{ color: isDark ? '#000' : '#fff' }}>Generating...</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="rocket" size={18} color={isDark ? '#000' : '#fff'} />
              <span style={{ color: isDark ? '#000' : '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>Generate Context Bundle</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default memo(SelectionComponent);
