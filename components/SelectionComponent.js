import React, { useMemo, useState, useCallback, memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getExtension } from '../utils/fileHelpers';

const SelectionComponent = ({ tree, selectedFiles, setSelectedFiles, onGenerate, loading, preamble, setPreamble, isMobile }) => {
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

    // Single pass to build tree and extension map
    tree.forEach(item => {
      const parts = item.path.split('/');
      let current = root;
      let currentPath = '';

      if (item.type === 'blob') {
        const ext = getExtension(item.path);
        extensions.add(ext);
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

    // Optimized folder files map (O(N) instead of O(N^2))
    tree.forEach(item => {
      if (item.type === 'blob') {
        const parts = item.path.split('/');
        let pathAcc = '';
        for (let i = 0; i < parts.length - 1; i++) {
          pathAcc = pathAcc ? `${pathAcc}/${parts[i]}` : parts[i];
          if (!folderMap[pathAcc]) folderMap[pathAcc] = [];
          folderMap[pathAcc].push(item);
        }
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

  const TreeNode = useCallback(({ node, depth }) => {
    const isFile = node.type === 'blob';
    const checked = isFile ? isSelected(node.path) : isFolderSelected(node.path);
    const partial = !isFile && isFolderPartial(node.path);
    const hasChildren = Object.keys(node.children).length > 0;
    const isExpanded = expandedFolders.has(node.path);

    return (
      <View style={{ marginLeft: depth * (isMobile ? 8 : 12) }}>
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
              {node.name}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Only render children if folder is expanded */}
        {!isFile && hasChildren && isExpanded && (
          <View>
            {Object.entries(node.children)
              .sort(([aName, aNode], [bName, bNode]) => {
                if (aNode.type !== bNode.type) {
                  return aNode.type === 'tree' ? -1 : 1;
                }
                return aName.localeCompare(bName);
              })
              .map(([key, childNode]) => (
                <TreeNode key={childNode.path} node={childNode} depth={depth + 1} />
              ))}
          </View>
        )}
      </View>
    );
  }, [isSelected, isFolderSelected, isFolderPartial, expandedFolders, toggleFolder, toggleSelect, colors, isMobile]);

  const treeContent = useMemo(() => {
    return Object.entries(treeObj)
      .sort(([aName, aNode], [bName, bNode]) => {
        if (aNode.type !== bNode.type) {
          return aNode.type === 'tree' ? -1 : 1;
        }
        return aName.localeCompare(bName);
      })
      .map(([key, node]) => (
        <TreeNode key={node.path} node={node} depth={0} />
      ));
  }, [treeObj, TreeNode]);

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.card,
        borderRadius: isMobile ? borderRadius.lg : borderRadius.xl,
        padding: isMobile ? spacing.sm : spacing.md,
        ...shadows.lg
      }
    ]}>
      <View style={[styles.header, { flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }]}>
        <View style={{ marginBottom: isMobile ? 8 : 10 }}>
          <Text style={[styles.title, { color: colors.text, fontSize: isMobile ? 18 : 20 }]}>Selection</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: isMobile ? 11 : 12 }]}>Choose files to include in output</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.miniAction, { backgroundColor: colors.surface }]}
            onPress={() => setSelectedFiles(tree.filter(i => i.type === 'blob'))}
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.miniAction, { backgroundColor: colors.surface }]}
            onPress={() => setSelectedFiles([])}
          >
            <Text style={[styles.actionText, { color: colors.error }]}>None</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={[styles.filterTitle, { color: colors.textSecondary }]}>Filter by Type</Text>
          <TouchableOpacity onPress={() => setWrapFilters(!wrapFilters)}>
            <Text style={[styles.toggleText, { color: colors.primary }]}>
              {wrapFilters ? 'View Less' : 'View All'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[wrapFilters ? styles.extensionFilterWrapped : styles.extensionFilter]}>
          {wrapFilters ? (
            allExtensions.map(ext => {
              const active = extensionActiveStates[ext];
              return (
                <TouchableOpacity
                  key={ext}
                  style={[
                    styles.extChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
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
            })
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {allExtensions.map(ext => {
                const active = extensionActiveStates[ext];
                return (
                  <TouchableOpacity
                    key={ext}
                    style={[
                      styles.extChip,
                      {
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderColor: active ? colors.primary : colors.border
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
        </View>
      </View>

      <View style={styles.treeSection}>
        <View style={styles.treeHeader}>
          <TouchableOpacity onPress={expandAll} style={styles.treeActionButton}>
            <Text style={[styles.treeAction, { color: colors.primary }]}>📂 Expand All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={collapseAll} style={[styles.treeActionButton, { marginLeft: 16 }]}>
            <Text style={[styles.treeAction, { color: colors.textSecondary }]}>📁 Collapse All</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.treeWrapper, { backgroundColor: colors.surface, borderColor: colors.border, height: isMobile ? 320 : 480 }]}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
            <View style={styles.treeContainer}>
              {treeContent}
            </View>
          </ScrollView>
        </View>
      </View>

      <View style={styles.preambleContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Preamble & Custom Instructions</Text>
        <TextInput
          style={[styles.preambleInput, {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
          }]}
          value={preamble}
          onChangeText={setPreamble}
          placeholder="e.g. 'You are an AI assistant. Analyze the following code for bugs...'"
          placeholderTextColor={colors.textPlaceholder}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }]}>
        <View style={{ marginBottom: isMobile ? 16 : 0, alignItems: isMobile ? 'center' : 'flex-start' }}>
          <Text style={[styles.countText, { color: colors.text, fontSize: isMobile ? 14 : 16 }]}>
            {selectedFiles.length} <Text style={{ fontWeight: '500', color: colors.textSecondary }}>files selected</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.generateButton,
            {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.lg,
              opacity: loading || selectedFiles.length === 0 ? 0.6 : 1,
              paddingVertical: isMobile ? 16 : 14,
              ...shadows.md
            }
          ]}
          onPress={() => onGenerate()}
          disabled={loading || selectedFiles.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.generateButtonContent}>
              <Text style={styles.generateButtonText}>Generate Bundle</Text>
              <Text style={styles.generateButtonIcon}>⚡</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  extensionFilter: {
    height: 40,
  },
  extensionFilterWrapped: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  extChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 10,
    justifyContent: 'center',
  },
  extChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  treeSection: {
    marginBottom: 24,
  },
  treeHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  treeActionButton: {
    paddingVertical: 4,
  },
  treeAction: {
    fontSize: 12,
    fontWeight: '700',
  },
  treeWrapper: {
    height: 380,
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  treeContainer: {
    padding: 16,
  },
  treeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandPlaceholder: {
    width: 24,
  },
  expandIcon: {
    fontSize: 10,
  },
  selectableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCheckmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  treeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  treeText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  preambleContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  preambleInput: {
    borderWidth: 1.5,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 24,
    borderTopWidth: 1,
  },
  countText: {
    fontSize: 16,
    fontWeight: '800',
  },
  generateButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  generateButtonIcon: {
    fontSize: 16,
  },
});

// Export with React.memo for performance
export default memo(SelectionComponent);