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
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import SelectionComponent from './components/SelectionComponent';
import { useRepoManager } from './hooks/useRepoManager';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const theme = useTheme();
  const { colors, borderRadius, spacing, shadows } = theme;
  const scrollViewRef = React.useRef(null);

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
    respectGitignore, setRespectGitignore,

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

  // Auto-scroll to bottom when output is generated
  React.useEffect(() => {
    if (activeOutput) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeOutput]);

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
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isMobile ? spacing.sm : spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.xl
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { marginTop: isMobile ? 8 : 12 }]}>
          <View style={[styles.badge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>v1.0.0</Text>
          </View>
          <Text style={[styles.logo, { color: colors.text, fontSize: isMobile ? 28 : 36 }]}>
            repo<Text style={{ color: colors.primary }}>2</Text>txt
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary, fontSize: isMobile ? 14 : 15 }]}>
            Convert codebases into LLM-optimized prompts in seconds
          </Text>
        </View>
        <View style={styles.mainContent}>
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
            respectGitignore={respectGitignore}
            setRespectGitignore={setRespectGitignore}
            isMobile={isMobile}
          />
          {showSelection && (
            <View style={styles.selectionWrapper}>
              <SelectionComponent
                tree={activeTab === 'github' ? treeData?.tree : localTreeData?.tree}
                selectedFiles={activeTab === 'github' ? githubSelectedFiles : localSelectedFiles}
                setSelectedFiles={activeTab === 'github' ? setGithubSelectedFiles : setLocalSelectedFiles}
                onGenerate={activeTab === 'github' ? generateGitHubText : generateLocalText}
                loading={loading}
                preamble={preamble}
                setPreamble={setPreamble}
                isMobile={isMobile}
              />
            </View>
          )}
          {activeOutput ? (
            <View style={styles.outputContainer}>
              <OutputSection
                output={activeOutput}
                tokenCount={activeTokenCount}
                onCopy={() => copyToClipboard(activeOutput)}
                onDownload={() => downloadText(activeOutput)}
                isMobile={isMobile}
              />
            </View>
          ) : null}
        </View>
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: isMobile ? 12 : 14 }]}>
            Built with ❤️ for the AI community • Privacy First • No Data Stored
          </Text>
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
    marginBottom: 24,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logo: {
    fontWeight: '900',
    letterSpacing: -1,
  },
  tagline: {
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 400,
    opacity: 0.8,
    lineHeight: 18,
  },
  mainContent: {
    width: '100%',
  },
  selectionWrapper: {
    marginTop: 20,
  },
  outputContainer: {
    marginTop: 20,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontWeight: '500',
    opacity: 0.5,
    textAlign: 'center',
  },
});
