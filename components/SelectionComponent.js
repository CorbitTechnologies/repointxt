import React, { useMemo, useState, useCallback, memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getExtension } from '../utils/fileHelpers';

const SelectionComponent = ({ tree, selectedFiles, setSelectedFiles, onGenerate, loading, preamble, setPreamble }) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [wrapFilters, setWrapFilters] = useState(false);

  if (!tree || tree.length === 0) return null;

  // Build nested tree structure, folder files map, extension files map, and all extensions
  const { treeObj, folderFilesMap, extensionFilesMap, allExtensions } = useMemo(() => {
    const root = {};
    const folderMap = {};
    const extMap = {};
    const extensions = new Set();

    const sortedItems = [...tree].sort((a, b) => a.path.length - b.path.length);

    sortedItems.forEach(item => {
      const parts = item.path.split('/');
      let current = root;
      let currentPath = '';

      if (item.type === 'blob') {
        const ext = getExtension(item.path);
        extensions.add(ext);

        // Build extension map
        if (!extMap[ext]) extMap[ext] = [];
        extMap[ext].push(item);
      }

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (!current[part]) {
          current[part] = {
            name: part,
            path: currentPath,
            type: (isLast && item.type === 'blob') ? 'blob' : 'tree',
            children: {},
            item: isLast ? item : { path: currentPath, type: 'tree' }
          };
        } else if (isLast) {
          current[part].item = item;
          current[part].type = item.type;
        }

        if (!isLast) {
          current = current[part].children;
        }
      });
    });

    // Build folder files map
    const blobs = tree.filter(i => i.type === 'blob');
    const allPaths = new Set();

    tree.forEach(i => {
      const parts = i.path.split('/');
      let p = '';
      parts.slice(0, -1).forEach(part => {
        p = p ? `${p}/${part}` : part;
        allPaths.add(p);
      });
    });

    allPaths.forEach(p => {
      folderMap[p] = blobs.filter(b => b.path.startsWith(p + '/'));
    });

    tree.forEach(item => {
      if (item.type === 'tree' && !folderMap[item.path]) {
        folderMap[item.path] = blobs.filter(b => b.path.startsWith(item.path + '/'));
      }
    });

    return {
      treeObj: root,
      folderFilesMap: folderMap,
      extensionFilesMap: extMap,
      allExtensions: Array.from(extensions).sort()
    };
  }, [tree]);

  // Pre-compute selected paths set
  const selectedPaths = useMemo(() => new Set(selectedFiles.map(f => f.path)), [selectedFiles]);

  const isSelected = useCallback((path) => selectedPaths.has(path), [selectedPaths]);

  const isFolderSelected = useCallback((path) => {
    const files = folderFilesMap[path] || [];
    if (files.length === 0) return false;
    return files.every(f => selectedPaths.has(f.path));
  }, [folderFilesMap, selectedPaths]);

  const isFolderPartial = useCallback((path) => {
    const files = folderFilesMap[path] || [];
    if (files.length === 0) return false;
    const selectedCount = files.filter(f => selectedPaths.has(f.path)).length;
    return selectedCount > 0 && selectedCount < files.length;
  }, [folderFilesMap, selectedPaths]);

  const toggleSelect = useCallback((node, select) => {
    if (node.type === 'blob') {
      const item = node.item;
      if (select) {
        setSelectedFiles(prev => {
          if (prev.some(f => f.path === item.path)) return prev;
          return [...prev, item];
        });
      } else {
        setSelectedFiles(prev => prev.filter(f => f.path !== item.path));
      }
    } else {
      const files = folderFilesMap[node.path] || [];
      if (select) {
        setSelectedFiles(prev => {
          const existingPaths = new Set(prev.map(f => f.path));
          const newFiles = files.filter(f => !existingPaths.has(f.path));
          return [...prev, ...newFiles];
        });
      } else {
        const filePathsToRemove = new Set(files.map(f => f.path));
        setSelectedFiles(prev => prev.filter(f => !filePathsToRemove.has(f.path)));
      }
    }
  }, [folderFilesMap, setSelectedFiles]);

  // Pre-computed extension active states
  const extensionActiveStates = useMemo(() => {
    const states = {};
    allExtensions.forEach(ext => {
      const files = extensionFilesMap[ext] || [];
      states[ext] = files.length > 0 && files.every(f => selectedPaths.has(f.path));
    });
    return states;
  }, [allExtensions, extensionFilesMap, selectedPaths]);

  const toggleExtension = useCallback((ext, select) => {
    const affectedFiles = extensionFilesMap[ext] || [];

    if (select) {
      setSelectedFiles(prev => {
        const existingPaths = new Set(prev.map(f => f.path));
        const newFiles = affectedFiles.filter(f => !existingPaths.has(f.path));
        return [...prev, ...newFiles];
      });
    } else {
      const pathsToRemove = new Set(affectedFiles.map(f => f.path));
      setSelectedFiles(prev => prev.filter(f => !pathsToRemove.has(f.path)));
    }
  }, [extensionFilesMap, setSelectedFiles]);

  const toggleFolder = useCallback((path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allFolderPaths = new Set();
    tree.forEach(item => {
      const parts = item.path.split('/');
      let p = '';
      parts.slice(0, -1).forEach(part => {
        p = p ? `${p}/${part}` : part;
        allFolderPaths.add(p);
      });
    });
    setExpandedFolders(allFolderPaths);
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const renderTree = useCallback((obj, depth = 0) => {
    return Object.entries(obj)
      .sort(([aName, aNode], [bName, bNode]) => {
        if (aNode.type !== bNode.type) {
          return aNode.type === 'tree' ? -1 : 1;
        }
        return aName.localeCompare(bName);
      })
      .map(([key, node]) => {
        const isFile = node.type === 'blob';
        const checked = isFile ? isSelected(node.path) : isFolderSelected(node.path);
        const partial = !isFile && isFolderPartial(node.path);
        const hasChildren = Object.keys(node.children).length > 0;
        const isExpanded = expandedFolders.has(node.path);

        return (
          <View key={node.path} style={{ marginLeft: depth * 12 }}>
            <View style={styles.treeItem}>
              {/* Expand/Collapse for folders */}
              {!isFile && hasChildren ? (
                <TouchableOpacity
                  onPress={() => toggleFolder(node.path)}
                  style={styles.expandButton}
                >
                  <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
                    {isExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.expandPlaceholder} />
              )}

              <TouchableOpacity
                style={styles.selectableRow}
                onPress={() => toggleSelect(node, !checked)}
                activeOpacity={0.6}
              >
                <View style={[
                  styles.miniCheckbox,
                  {
                    borderColor: checked || partial ? colors.primary : colors.border,
                    backgroundColor: checked ? colors.primary : partial ? colors.primaryLight || colors.primary + '40' : 'transparent',
                    borderRadius: 4
                  }
                ]}>
                  {checked && <Text style={styles.miniCheckmark}>✓</Text>}
                  {partial && !checked && <Text style={[styles.miniCheckmark, { color: colors.primary }]}>–</Text>}
                </View>
                <Text style={[styles.treeIcon, { color: isFile ? colors.textSecondary : colors.warning }]}>
                  {isFile ? '📄' : isExpanded ? '📂' : '📁'}
                </Text>
                <Text style={[styles.treeText, { color: colors.text }]} numberOfLines={1}>
                  {key}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Only render children if folder is expanded */}
            {!isFile && hasChildren && isExpanded && renderTree(node.children, depth + 1)}
          </View>
        );
      });
  }, [isSelected, isFolderSelected, isFolderPartial, expandedFolders, toggleFolder, toggleSelect, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, ...shadows.md }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>File Selection</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setSelectedFiles(tree.filter(i => i.type === 'blob'))}>
            <Text style={[styles.actionText, { color: colors.primary, marginRight: 12 }]}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedFiles([])}>
            <Text style={[styles.actionText, { color: colors.error }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterHeader}>
        <Text style={[styles.filterTitle, { color: colors.textSecondary }]}>Filter by format:</Text>
        <TouchableOpacity onPress={() => setWrapFilters(!wrapFilters)}>
          <Text style={[styles.toggleText, { color: colors.primary }]}>
            {wrapFilters ? 'Scroll View' : 'Show All'}
          </Text>
        </TouchableOpacity>
      </View>

      {wrapFilters ? (
        <View style={styles.extensionFilterWrapped}>
          {allExtensions.map(ext => {
            const active = extensionActiveStates[ext];
            return (
              <TouchableOpacity
                key={ext}
                style={[
                  styles.extChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: colors.border,
                    marginBottom: 8
                  }
                ]}
                onPress={() => toggleExtension(ext, !active)}
              >
                <Text style={[styles.extChipText, { color: active ? '#fff' : colors.text }]}>
                  {ext}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extensionFilter}>
          {allExtensions.map(ext => {
            const active = extensionActiveStates[ext];
            return (
              <TouchableOpacity
                key={ext}
                style={[
                  styles.extChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => toggleExtension(ext, !active)}
              >
                <Text style={[styles.extChipText, { color: active ? '#fff' : colors.text }]}>
                  {ext}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.treeHeader}>
        <TouchableOpacity onPress={expandAll}>
          <Text style={[styles.treeAction, { color: colors.primary }]}>Expand All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={collapseAll}>
          <Text style={[styles.treeAction, { color: colors.textSecondary, marginLeft: 16 }]}>Collapse All</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.treeWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
          <View style={styles.treeContainer}>
            {renderTree(treeObj)}
          </View>
        </ScrollView>
      </View>

      <View style={styles.preambleContainer}>
        <Text style={[styles.preambleTitle, { color: colors.text }]}>System Instructions (Preamble)</Text>
        <TextInput
          style={[styles.preambleInput, {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border,
            borderRadius: borderRadius.md
          }]}
          value={preamble}
          onChangeText={setPreamble}
          placeholder="Pre-fill your request, e.g. 'You are an expert React developer. Analyze this code for performance...'"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {selectedFiles.length} files selected
        </Text>
        <TouchableOpacity
          style={[styles.generateButton, { backgroundColor: colors.primary, borderRadius: borderRadius.md, opacity: loading || selectedFiles.length === 0 ? 0.6 : 1 }]}
          onPress={() => onGenerate()}
          disabled={loading || selectedFiles.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Text</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    letterSpacing: 1,
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  extensionFilter: {
    flexDirection: 'row',
    marginBottom: 16,
    maxHeight: 40,
  },
  extensionFilterWrapped: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  extChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    height: 32,
    justifyContent: 'center',
  },
  extChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  treeHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  treeAction: {
    fontSize: 12,
    fontWeight: '600',
  },
  treeWrapper: {
    height: 350,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  treeContainer: {
    padding: 12,
  },
  treeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandPlaceholder: {
    width: 20,
  },
  expandIcon: {
    fontSize: 10,
  },
  selectableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  miniCheckbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCheckmark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  treeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  treeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  generateButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  preambleContainer: {
    marginBottom: 20,
  },
  preambleTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  preambleInput: {
    borderWidth: 1,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 13,
  },
});

// Export with React.memo for performance
export default memo(SelectionComponent);