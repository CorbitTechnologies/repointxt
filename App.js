import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Alert,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import SelectionComponent from './components/SelectionComponent';
import { useRepoManager } from './hooks/useRepoManager';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const theme = useTheme();
  const { colors, borderRadius, spacing, shadows } = theme;

  const {
    githubUrl, setGithubUrl,
    githubToken, setGithubToken,
    treeData,
    repoInfo,
    dirStructure, setDirStructure,
    githubSelectedFiles, setGithubSelectedFiles,
    githubOutput, setGithubOutput,
    githubTokenCount,
    showGithubSelection, setShowGithubSelection,
    urlHistory,

    localTreeData,
    localSelectedFiles, setLocalSelectedFiles,
    localOutput, setLocalOutput,
    localTokenCount,
    showLocalSelection, setShowLocalSelection,
    isDragging,

    loading,
    ignorePatterns, setIgnorePatterns,
    preamble, setPreamble,
    removeComments, setRemoveComments,
    removeExtraWhitespace, setRemoveExtraWhitespace,
    includeOnlyCode, setIncludeOnlyCode,
    maxFileSize, setMaxFileSize,
    activeTab, setActiveTab,
    tokenOptimizationLevel, setTokenOptimizationLevel,
    disabledExtensions, setDisabledExtensions,

    fetchGitHubRepo,
    generateGitHubText,
    generateLocalText,
    pickLocalDirectory,
    pickLocalFiles,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
  } = useRepoManager();

  const activeOutput = activeTab === 'github' ? githubOutput : localOutput;
  const activeTokenCount = activeTab === 'github' ? githubTokenCount : localTokenCount;
  const showSelection = activeTab === 'github' ? showGithubSelection : showLocalSelection;

  const copyToClipboard = async (text, successMsg = 'Copied to clipboard!') => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Success', successMsg);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy');
    }
  };

  const downloadText = (text) => {
    if (!text) return;
    if (Platform.OS === 'web') {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repo2txt_${activeTab}_output.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      copyToClipboard(text);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.text }]}>repo<Text style={{ color: colors.primary }}>2</Text>txt</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Optimized repository conversion for LLMs</Text>
        </View>
        <InputSection
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          githubUrl={githubUrl}
          setGithubUrl={setGithubUrl}
          githubToken={githubToken}
          setGithubToken={setGithubToken}
          urlHistory={urlHistory}
          ignorePatterns={ignorePatterns}
          setIgnorePatterns={setIgnorePatterns}
          removeComments={removeComments}
          setRemoveComments={setRemoveComments}
          removeExtraWhitespace={removeExtraWhitespace}
          setRemoveExtraWhitespace={setRemoveExtraWhitespace}
          includeOnlyCode={includeOnlyCode}
          setIncludeOnlyCode={setIncludeOnlyCode}
          maxFileSize={maxFileSize}
          setMaxFileSize={setMaxFileSize}
          loading={loading}
          fetchGitHubRepo={fetchGitHubRepo}
          copyDirectoryStructure={() => copyToClipboard(dirStructure, 'Structure copied!')}
          pickLocalFiles={pickLocalFiles}
          pickLocalDirectory={pickLocalDirectory}
          output={activeOutput}
          dirStructure={activeTab === 'github' ? dirStructure : ''}
          isDragging={isDragging}
          handleDragEnter={handleDragEnter}
          handleDragLeave={handleDragLeave}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          tokenOptimizationLevel={tokenOptimizationLevel}
          setTokenOptimizationLevel={setTokenOptimizationLevel}
        />
        {showSelection && (
          <SelectionComponent
            tree={activeTab === 'github' ? treeData?.tree : localTreeData?.tree}
            selectedFiles={activeTab === 'github' ? githubSelectedFiles : localSelectedFiles}
            setSelectedFiles={activeTab === 'github' ? setGithubSelectedFiles : setLocalSelectedFiles}
            onGenerate={activeTab === 'github' ? generateGitHubText : generateLocalText}
            loading={loading}
            preamble={preamble}
            setPreamble={setPreamble}
          />
        )}
        {activeOutput ? (
          <View style={styles.outputContainer}>
            <OutputSection
              output={activeOutput}
              tokenCount={activeTokenCount}
              onCopy={() => copyToClipboard(activeOutput)}
              onDownload={() => downloadText(activeOutput)}
            />
          </View>
        ) : null}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Made for AI developers • GitHub • Privacy First</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  outputContainer: {
    marginTop: 32,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
