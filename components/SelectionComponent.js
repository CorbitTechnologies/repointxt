import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Checkbox from './Checkbox';

const SelectionComponent = ({ tree, selectedFiles, setSelectedFiles, onGenerate, loading }) => {
  if (!tree || tree.length === 0) return null;
  const buildTree = (items) => {
    const tree = {};
    items.forEach(item => {
      const parts = item.path.split('/');
      let current = tree;
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = { type: item.type, children: {}, item };
        }
        if (index < parts.length - 1) {
          current = current[part].children;
        } else {
          // For the last part, ensure item is set
          current[part].item = item;
        }
      });
    });
    return tree;
  };

  const treeObj = buildTree(tree);

  const isSelected = (path) => selectedFiles.some(f => f.path === path);

  const toggleSelect = (item, select) => {
    if (item.type === 'blob') {
      if (select) {
        setSelectedFiles(prev => [...prev, item]);
      } else {
        setSelectedFiles(prev => prev.filter(f => f.path !== item.path));
      }
    } else {
      // For dir, select all files in it
      const files = getAllFiles(item, tree);
      if (select) {
        setSelectedFiles(prev => [...prev, ...files.filter(f => !prev.some(p => p.path === f.path))]);
      } else {
        setSelectedFiles(prev => prev.filter(f => !files.some(ff => ff.path === f.path)));
      }
    }
  };

  const getAllFiles = (dirItem, allItems) => {
    return allItems.filter(item => item.path.startsWith(dirItem.path + '/') && item.type === 'blob');
  };

  const renderTree = (obj, prefix = '') => {
    return Object.entries(obj).map(([key, value]) => (
      <View key={prefix + key}>
        <Checkbox
          label={`${value.type === 'tree' ? '📁' : '📄'} ${key}`}
          checked={value.type === 'blob' ? isSelected(value.item.path) : getAllFiles(value.item, tree).every(f => isSelected(f.path))}
          onPress={() => toggleSelect(value.item, !(value.type === 'blob' ? isSelected(value.item.path) : getAllFiles(value.item, tree).every(f => isSelected(f.path))))}
        />
        {value.children && Object.keys(value.children).length > 0 && (
          <View style={styles.children}>
            {renderTree(value.children, prefix + key + '/')}
          </View>
        )}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Files and Directories</Text>
      <ScrollView style={styles.tree}>
        {renderTree(treeObj)}
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={() => onGenerate()} disabled={loading || selectedFiles.length === 0}>
        <Text style={styles.buttonText}>Convert to Text</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    height: 300, // Reduced fixed height
    backgroundColor: '#fff',
    padding: 6, // Reduced padding
    borderRadius: 6,
    marginBottom: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  title: { 
    fontSize: 14, // Reduced font size
    fontWeight: 'bold', 
    marginBottom: 4, // Reduced margin
    color: '#333'
  },
  tree: { 
    flex: 1,
    maxHeight: 200, // Reduced height for scrolling
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 2, // Reduced padding
    backgroundColor: '#f9f9f9'
  },
  children: { 
    marginLeft: 12 // Reduced margin
  },
  button: { 
    backgroundColor: '#007AFF', 
    padding: 6, // Reduced padding
    borderRadius: 4, 
    alignItems: 'center', 
    marginTop: 4 // Reduced margin
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 12, // Reduced font size
    fontWeight: '600'
  },
});

export default SelectionComponent;