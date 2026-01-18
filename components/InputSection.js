import React, { useRef, useEffect, memo } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import TabSwitcher from './TabSwitcher';
import ProcessingOptions from './ProcessingOptions';
import GitHubTab from './GitHubTab';
import LocalTab from './LocalTab';

const InputSection = (props) => {
  const { activeTab, colors, borderRadius, spacing, shadows } = { ...props, ...useTheme() };
  const containerRef = useRef(null);

  // Attach native drag/drop event listeners for web platform
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    const element = containerRef.current;

    const handleDragEnter = (e) => {
      if (activeTab === 'local' && props.handleDragEnter) {
        props.handleDragEnter(e);
      }
    };

    const handleDragOver = (e) => {
      if (activeTab === 'local' && props.handleDragOver) {
        props.handleDragOver(e);
      }
    };

    const handleDragLeave = (e) => {
      if (activeTab === 'local' && props.handleDragLeave) {
        props.handleDragLeave(e);
      }
    };

    const handleDrop = (e) => {
      if (activeTab === 'local' && props.handleDrop) {
        props.handleDrop(e);
      }
    };

    element.addEventListener('dragenter', handleDragEnter);
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    return () => {
      element.removeEventListener('dragenter', handleDragEnter);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
    };
  }, [activeTab, props.handleDragEnter, props.handleDragOver, props.handleDragLeave, props.handleDrop]);

  return (
    <View
      ref={containerRef}
      style={[
        styles.container,
        {
          backgroundColor: props.isDragging ? colors.surface : colors.card,
          borderRadius: borderRadius.xl,
          padding: props.isMobile ? spacing.sm : spacing.md,
          borderColor: props.isDragging ? colors.primary : colors.border,
          ...shadows.md
        }
      ]}
    >
      <TabSwitcher activeTab={activeTab} setActiveTab={props.setActiveTab} />

      <View style={styles.tabContent}>
        {activeTab === 'github' ? (
          <GitHubTab {...props} />
        ) : (
          <LocalTab {...props} />
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <ProcessingOptions
        removeComments={props.removeComments}
        setRemoveComments={props.setRemoveComments}
        removeExtraWhitespace={props.removeExtraWhitespace}
        setRemoveExtraWhitespace={props.setRemoveExtraWhitespace}
        includeOnlyCode={props.includeOnlyCode}
        setIncludeOnlyCode={props.setIncludeOnlyCode}
        maxFileSize={props.maxFileSize}
        setMaxFileSize={props.setMaxFileSize}
        ignorePatterns={props.ignorePatterns}
        setIgnorePatterns={props.setIgnorePatterns}
        tokenOptimizationLevel={props.tokenOptimizationLevel}
        setTokenOptimizationLevel={props.setTokenOptimizationLevel}
        respectGitignore={props.respectGitignore}
        setRespectGitignore={props.setRespectGitignore}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
  },
  tabContent: {
    marginBottom: 24,
  },
  divider: {
    height: 1,
    marginVertical: 16,
    width: '100%',
  },
});

export default memo(InputSection);