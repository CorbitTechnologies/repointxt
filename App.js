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
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import SelectionComponent from './components/SelectionComponent';
import Icon from './components/Icon';
import { useRepoManager } from './hooks/useRepoManager';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const theme = useTheme();
  const { colors, borderRadius, spacing, shadows } = theme;
  const scrollViewRef = React.useRef(null);

  const {
    loading, sources, githubUrl, setGithubUrl, githubToken, setGithubToken, urlHistory,
    combinedOutput, isDragging, ignorePatterns, setIgnorePatterns, preamble, setPreamble,
    removeComments, setRemoveComments, removeExtraWhitespace, setRemoveExtraWhitespace,
    includeOnlyCode, setIncludeOnlyCode, maxFileSize, setMaxFileSize, activeTab, setActiveTab,
    tokenOptimizationLevel, setTokenOptimizationLevel, respectGitignore, setRespectGitignore,
    fetchGitHubRepo, pickLocalDirectory, generateText, removeSource,
    treeData, selectedFiles, setSelectedFiles, githubTokenCount,
    pickLocalFiles,
    handleDragEnter, handleDragLeave, handleDragOver, handleDrop
  } = useRepoManager();

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = 'repointxt | Repository to AI Context';
    const ensureMeta = (selector, attrs) => {
      let el = document.head.querySelector(selector);
      if (!el) { el = document.createElement('meta'); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); document.head.appendChild(el); }
      return el;
    };

    ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', 'The ultimate developer tool to convert GitHub repositories and local folders into optimized AI context. Build comprehensive prompts for LLMs with smart filtering and token management.');
    ensureMeta('meta[name="keywords"]', { name: 'keywords' }).setAttribute('content', 'repointxt, repository context, ai prompt engineering, codebase to text, github to prompt, token optimization, developer productivity');
    ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', 'repointxt | Repository to AI Context Builder');
    ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', 'Instantly convert codebases into high-quality AI prompts with smart filtering and token optimization.');
    ensureMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website');
  }, []);

  React.useEffect(() => {
    if (combinedOutput) setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [combinedOutput]);

  const copyToClipboard = async (text, successMsg = 'Copied!') => {
    if (!text) return;
    try { await Clipboard.setStringAsync(text); Alert.alert('Success', successMsg); } catch (e) { Alert.alert('Error', 'Failed to copy'); }
  };

  const downloadText = (text) => {
    if (!text || Platform.OS !== 'web') return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repointxt_bundle.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isMobile ? 12 : 20, paddingTop: 20, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.text, fontSize: isMobile ? 32 : 40 }]}>
            repoin<Text style={{ color: colors.primary }}>t</Text>xt
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Icon name="zap" size={14} color={colors.primary} />
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Professional AI Context Builder</Text>
          </View>
        </View>

        <View style={styles.mainContent}>
          <InputSection
            activeTab={activeTab} setActiveTab={setActiveTab}
            githubUrl={githubUrl} setGithubUrl={setGithubUrl}
            githubToken={githubToken} setGithubToken={setGithubToken}
            urlHistory={urlHistory} ignorePatterns={ignorePatterns} setIgnorePatterns={setIgnorePatterns}
            removeComments={removeComments} setRemoveComments={setRemoveComments}
            removeExtraWhitespace={removeExtraWhitespace} setRemoveExtraWhitespace={setRemoveExtraWhitespace}
            includeOnlyCode={includeOnlyCode} setIncludeOnlyCode={setIncludeOnlyCode}
            maxFileSize={maxFileSize} setMaxFileSize={setMaxFileSize}
            loading={loading} fetchGitHubRepo={fetchGitHubRepo}
            pickLocalFiles={pickLocalFiles} pickLocalDirectory={pickLocalDirectory}
            addLocalDirectory={() => pickLocalDirectory(true)}
            isDragging={isDragging} handleDragEnter={handleDragEnter} handleDragLeave={handleDragLeave}
            handleDragOver={handleDragOver} handleDrop={handleDrop}
            tokenOptimizationLevel={tokenOptimizationLevel} setTokenOptimizationLevel={setTokenOptimizationLevel}
            respectGitignore={respectGitignore} setRespectGitignore={setRespectGitignore}
            isMobile={isMobile}
          />

          {sources.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <SelectionComponent
                tree={treeData?.tree}
                sources={sources}
                removeSource={removeSource}
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                onGenerate={generateText}
                loading={loading}
                preamble={preamble}
                setPreamble={setPreamble}
                isMobile={isMobile}
              />
            </View>
          )}

          {combinedOutput ? (
            <View style={{ marginTop: 20 }}>
              <OutputSection
                output={combinedOutput}
                tokenCount={githubTokenCount}
                onCopy={() => copyToClipboard(combinedOutput)}
                onDownload={() => downloadText(combinedOutput)}
                isMobile={isMobile}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.corbittechnologies.com/')}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              repointxt • <Text style={{ color: colors.primary, fontWeight: '800' }}>Corbit Technologies</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { maxWidth: 800, width: '100%', alignSelf: 'center' },
  header: { marginBottom: 32, alignItems: 'center' },
  logo: { fontWeight: '900', letterSpacing: -1.5 },
  tagline: { fontSize: 13, fontWeight: '600', opacity: 0.8 },
  mainContent: { width: '100%' },
  footer: { marginTop: 40, alignItems: 'center', paddingVertical: 20 },
  footerText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', opacity: 0.5 },
});
