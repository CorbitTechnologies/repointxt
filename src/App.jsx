import React, { useState, useEffect, useRef } from 'react';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import SelectionComponent from './components/SelectionComponent';
import Icon from './components/Icon';
import { useRepoManager } from './hooks/useRepoManager';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = width < 768;
  const theme = useTheme();
  const { colors, borderRadius, spacing, shadows } = theme;
  const scrollViewRef = useRef(null);

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

  useEffect(() => {
    if (typeof document === 'undefined') return;
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

  useEffect(() => {
    if (combinedOutput) setTimeout(() => scrollViewRef.current?.scrollTo({ top: scrollViewRef.current.scrollHeight, behavior: 'smooth' }), 100);
  }, [combinedOutput]);

  const copyToClipboard = async (text, successMsg = 'Copied!') => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); window.alert(successMsg); } catch (e) { window.alert('Failed to copy'); }
  };

  const downloadText = (text) => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repointxt_bundle.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex: 1, backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        ref={scrollViewRef}
        style={{ flex: 1, overflowY: 'auto' }}
      >
        <div style={{ maxWidth: 900, width: '100%', margin: '0 auto', padding: isMobile ? '20px 12px 40px' : '20px 20px 40px', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontWeight: '900', letterSpacing: -1.5, color: colors.text, fontSize: isMobile ? 26 : 32, margin: 0 }}>
              repoin<span style={{ color: colors.primary }}>t</span>xt
            </span>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Icon name="zap" size={14} color={colors.primary} />
              <span style={{ fontSize: 13, fontWeight: '600', opacity: 0.8, color: colors.textSecondary }}>Professional AI Context Builder</span>
            </div>
          </div>

          <div style={{ width: '100%' }}>
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
              <div style={{ marginTop: 20 }}>
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
              </div>
            )}

            {combinedOutput ? (
              <div style={{ marginTop: 20 }}>
                <OutputSection
                  output={combinedOutput}
                  tokenCount={githubTokenCount}
                  onCopy={() => copyToClipboard(combinedOutput)}
                  onDownload={() => downloadText(combinedOutput)}
                  isMobile={isMobile}
                />
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            <a href="https://www.corbittechnologies.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', opacity: 0.5, color: colors.textSecondary }}>
                repointxt • <span style={{ color: colors.primary, fontWeight: '800' }}>Corbit Technologies</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
