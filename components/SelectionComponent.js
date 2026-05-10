import React, { useMemo, useState, useCallback, memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getExtension } from '../utils/fileHelpers';
import Icon from './Icon';

const SelectionComponent = ({ tree, sources = [], removeSource, selectedFiles, setSelectedFiles, onGenerate, loading, preamble, setPreamble, isMobile }) => {
  const { colors, borderRadius, spacing, shadows, isDark } = useTheme();
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  if (!tree || tree.length === 0) return null;

  const { treeObj, folderFilesMap, extensionFilesMap, allExtensions } = useMemo(() => {
    const root = {};
    const folderMap = {};
    const extMap = {};
    const extensions = new Set();

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
        if (!isLast) current = current[part].children;
      });
    });

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

    return { treeObj: root, folderFilesMap: folderMap, extensionFilesMap: extMap, allExtensions: Array.from(extensions).sort() };
  }, [tree]);

  const selectedPaths = useMemo(() => new Set(selectedFiles.map(f => f.path)), [selectedFiles]);
  const isSelected = useCallback((path) => selectedPaths.has(path), [selectedPaths]);
  const isFolderSelected = useCallback((path) => {
    const files = folderFilesMap[path] || [];
    return files.length > 0 && files.every(f => selectedPaths.has(f.path));
  }, [folderFilesMap, selectedPaths]);

  const isFolderPartial = useCallback((path) => {
    const files = folderFilesMap[path] || [];
    const selectedCount = files.filter(f => selectedPaths.has(f.path)).length;
    return selectedCount > 0 && selectedCount < files.length;
  }, [folderFilesMap, selectedPaths]);

  const toggleSelect = useCallback((node, select) => {
    if (node.type === 'blob') {
      const item = node.item;
      setSelectedFiles(prev => select ? (prev.some(f => f.path === item.path) ? prev : [...prev, item]) : prev.filter(f => f.path !== item.path));
    } else {
      const files = folderFilesMap[node.path] || [];
      setSelectedFiles(prev => {
        if (select) {
          const existing = new Set(prev.map(f => f.path));
          return [...prev, ...files.filter(f => !existing.has(f.path))];
        }
        const toRemove = new Set(files.map(f => f.path));
        return prev.filter(f => !toRemove.has(f.path));
      });
    }
  }, [folderFilesMap, setSelectedFiles]);

  const toggleExtension = useCallback((ext, select) => {
    const files = extensionFilesMap[ext] || [];
    setSelectedFiles(prev => {
      if (select) {
        const existing = new Set(prev.map(f => f.path));
        return [...prev, ...files.filter(f => !existing.has(f.path))];
      }
      const toRemove = new Set(files.map(f => f.path));
      return prev.filter(f => !toRemove.has(f.path));
    });
  }, [extensionFilesMap, setSelectedFiles]);

  const toggleFolder = useCallback((path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const paths = new Set();
    tree.forEach(item => {
      const parts = item.path.split('/');
      let p = '';
      parts.slice(0, -1).forEach(part => { p = p ? `${p}/${part}` : part; paths.add(p); });
    });
    setExpandedFolders(paths);
  }, [tree]);

  const TreeNode = useCallback(({ node, depth }) => {
    const isFile = node.type === 'blob';
    const checked = isFile ? isSelected(node.path) : isFolderSelected(node.path);
    const partial = !isFile && isFolderPartial(node.path);
    const isExpanded = expandedFolders.has(node.path);
    const hasChildren = Object.keys(node.children).length > 0;

    return (
      <View style={{ marginLeft: depth * 12 }}>
        <View style={styles.treeItem}>
          {!isFile && hasChildren ? (
            <TouchableOpacity onPress={() => toggleFolder(node.path)} style={styles.expandButton}>
              <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={12} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : <View style={styles.expandPlaceholder} />}

          <TouchableOpacity style={styles.selectableRow} onPress={() => toggleSelect(node, !checked)} activeOpacity={0.6}>
            <View style={[styles.miniCheckbox, { borderColor: colors.text, backgroundColor: checked ? colors.text : 'transparent' }]}>
              {checked && <Icon name="check" size={10} color={isDark ? '#000' : '#fff'} />}
              {partial && !checked && <View style={{ width: 6, height: 1.5, backgroundColor: colors.text }} />}
            </View>
            <View style={styles.treeIconWrapper}>
              <Icon name={isFile ? "file" : "folder"} size={14} color={isFile ? colors.textSecondary : colors.text} />
            </View>
            <Text style={[styles.treeText, { color: colors.text }]} numberOfLines={1}>{node.name}</Text>
          </TouchableOpacity>
        </View>
        {!isFile && isExpanded && (
          <View>
            {Object.entries(node.children).sort(([aN, aNode], [bN, bNode]) => aNode.type === bNode.type ? aN.localeCompare(bN) : (aNode.type === 'tree' ? -1 : 1)).map(([k, c]) => <TreeNode key={c.path} node={c} depth={depth + 1} />)}
          </View>
        )}
      </View>
    );
  }, [isSelected, isFolderSelected, isFolderPartial, expandedFolders, toggleFolder, toggleSelect, colors, isDark]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.lg, ...shadows.md }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="menu" size={18} color={colors.text} />
            <Text style={[styles.title, { color: colors.text }]}>Selection</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage added codebases</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.miniAction, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setSelectedFiles(tree.filter(i => i.type === 'blob'))}>
            <Text style={[styles.actionText, { color: colors.text }]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.miniAction, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setSelectedFiles([])}>
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>None</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sourcesContainer}>
        {sources.map(source => (
          <View key={source.id} style={[styles.sourceBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name={source.type === 'github' ? 'github' : 'folder'} size={12} color={colors.primary} />
            <Text style={[styles.sourceName, { color: colors.text }]} numberOfLines={1}>{source.name}</Text>
            <TouchableOpacity onPress={() => removeSource(source.id)} style={styles.removeSourceBtn}>
              <Icon name="trash" size={12} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="filter" size={12} color={colors.textSecondary} />
            <Text style={[styles.filterTitle, { color: colors.textSecondary }]}>Filter by Type</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extensionFilter}>
          {allExtensions.map(ext => (
            <TouchableOpacity key={ext} style={[styles.extChip, { backgroundColor: (extensionFilesMap[ext] || []).every(f => selectedPaths.has(f.path)) ? colors.text : colors.surface, borderColor: colors.border }]} onPress={() => toggleExtension(ext, !(extensionFilesMap[ext] || []).every(f => selectedPaths.has(f.path)))}>
              <Text style={[styles.extChipText, { color: (extensionFilesMap[ext] || []).every(f => selectedPaths.has(f.path)) ? (isDark ? '#000' : '#fff') : colors.text }]}>{ext}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.treeSection}>
        <View style={styles.treeHeader}>
          <TouchableOpacity onPress={expandAll} style={styles.treeActionButton}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="plus" size={14} color={colors.text} /><Text style={[styles.treeAction, { color: colors.text }]}>Expand All</Text></View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setExpandedFolders(new Set())} style={[styles.treeActionButton, { marginLeft: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="minus" size={14} color={colors.textSecondary} /><Text style={[styles.treeAction, { color: colors.textSecondary }]}>Collapse All</Text></View>
          </TouchableOpacity>
        </View>
        <View style={[styles.treeWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView style={styles.scrollView}>{Object.entries(treeObj).sort(([aN, aNode], [bN, bNode]) => aNode.type === bNode.type ? aN.localeCompare(bN) : (aNode.type === 'tree' ? -1 : 1)).map(([k, n]) => <TreeNode key={n.path} node={n} depth={0} />)}</ScrollView>
        </View>
      </View>

      <View style={styles.preambleContainer}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Instructions</Text>
        <TextInput style={[styles.preambleInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, borderRadius: 8, padding: 10 }]} value={preamble} onChangeText={setPreamble} placeholder="e.g. 'Analyze for bugs...'" placeholderTextColor={colors.textPlaceholder} multiline numberOfLines={2} />
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.countText, { color: colors.text }]}>{selectedFiles.length} <Text style={{ fontWeight: '400', color: colors.textSecondary }}>files</Text></Text>
        <TouchableOpacity style={[styles.generateButton, { backgroundColor: colors.primary, borderRadius: 8, opacity: loading || selectedFiles.length === 0 ? 0.6 : 1 }]} onPress={onGenerate} disabled={loading || selectedFiles.length === 0}>
          {loading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} size="small" /> : <Text style={[styles.generateButtonText, { color: isDark ? '#000' : '#fff' }]}>Generate Bundle</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontWeight: '500', opacity: 0.8, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  miniAction: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '700' },
  sourcesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  sourceName: { fontSize: 12, fontWeight: '700', maxWidth: 150 },
  removeSourceBtn: { marginLeft: 4 },
  filterSection: { marginBottom: 16 },
  filterHeader: { marginBottom: 8 },
  filterTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  extensionFilter: { height: 34 },
  extChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, marginRight: 8, justifyContent: 'center' },
  extChipText: { fontSize: 12, fontWeight: '700' },
  treeSection: { marginBottom: 20 },
  treeHeader: { flexDirection: 'row', marginBottom: 12 },
  treeActionButton: { paddingVertical: 4 },
  treeAction: { fontSize: 12, fontWeight: '700' },
  treeWrapper: { height: 320, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  scrollView: { flex: 1, padding: 12 },
  treeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  expandButton: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  expandPlaceholder: { width: 24 },
  selectableRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingVertical: 2 },
  miniCheckbox: { width: 16, height: 16, borderWidth: 1, marginRight: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  treeIconWrapper: { marginRight: 8 },
  treeText: { fontSize: 13, fontWeight: '500', flex: 1 },
  preambleContainer: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  preambleInput: { borderWidth: 1, minHeight: 60, textAlignVertical: 'top', fontSize: 13, padding: 12, borderRadius: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1 },
  countText: { fontSize: 14, fontWeight: '700' },
  generateButton: { paddingHorizontal: 24, paddingVertical: 12 },
  generateButtonText: { fontSize: 14, fontWeight: '800' },
});

export default memo(SelectionComponent);
