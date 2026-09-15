import React, { useState, useEffect } from 'react';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import SelectionComponent from './components/SelectionComponent';
import Icon from './components/Icon';
import { useRepoManager } from './hooks/useRepoManager';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = width < 768;
  const theme = useTheme();
  const { colors, isDark } = theme;

  const {
    loading, loadingMessage, sources, githubUrl, setGithubUrl, githubBranch, setGithubBranch,
    githubToken, setGithubToken, githubRateLimit, urlHistory,
    outputBatches, activeBatchIndex, setActiveBatchIndex, isDragging,
    ignorePatterns, setIgnorePatterns, preamble, setPreamble,
    removeComments, setRemoveComments, removeExtraWhitespace, setRemoveExtraWhitespace,
    maxContextTokens, setMaxContextTokens,
    maxFileSize, setMaxFileSize, activeTab, setActiveTab,
    fetchGitHubRepo, pickLocalDirectory, pickLocalFiles, generateText, removeSource,
    treeData, selectedFiles, setSelectedFiles,
    handleDragEnter, handleDragLeave, handleDragOver, handleDrop
  } = useRepoManager();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background, color: colors.text, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

      {/* Subtle top accent line */}
      <div style={{ height: 3, background: colors.primaryGradient, width: '100%' }} />

      {/* Sticky Top Header */}
      <header style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: isDark ? '#080808' : '#ffffff', padding: '14px 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: colors.primaryGradient, boxShadow: '0 2px 10px rgba(0, 85, 255, 0.3)' }}>
              <Icon name="zap" size={20} color="#ffffff" />
            </div>
            <span style={{ fontWeight: '900', fontSize: 23, letterSpacing: '-0.6px', color: colors.text }}>
              repoin<span style={{ color: colors.primary }}>t</span>xt
            </span>
            <span style={{ fontSize: 10, fontWeight: '800', backgroundColor: colors.primary + '18', color: colors.primary, padding: '4px 10px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: 0.6, border: `1px solid ${colors.primary}30` }}>
              GEMINI 2.0 & GPT-4o
            </span>
          </div>

          {/* GitHub Rate Limit Indicator */}
          {githubRateLimit && (
            <div style={{ fontSize: 11, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 6, backgroundColor: colors.surface, padding: '5px 12px', borderRadius: 20, border: `1px solid ${colors.border}` }}>
              <Icon name="github" size={13} color={colors.primary} />
              <span>API Rate: <strong>{githubRateLimit.remaining}</strong> / {githubRateLimit.limit}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: 1040, width: '100%', margin: '0 auto', padding: isMobile ? '20px 14px 48px' : '36px 24px 56px', boxSizing: 'border-box' }}>

        {/* Hero Banner */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: '900', margin: '0 0 8px 0', color: colors.text, letterSpacing: '-0.8px', lineHeight: 1.2 }}>
            Pack Codebase Context for LLMs
          </h1>
          <p style={{ fontSize: 14.5, color: colors.textSecondary, margin: '0 auto', maxWidth: 620, lineHeight: 1.5 }}>
            Convert GitHub repositories or local folders into token-optimized context bundles. Auto-selects <strong>React Monorepos</strong>, <strong>Flutter</strong>, <strong>Supabase</strong>, and multi-package projects.
          </p>
        </div>

        {/* Loading Progress Bar */}
        {loading && (
          <div style={{ backgroundColor: colors.primary + '15', border: `1px solid ${colors.primary}`, borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 16px rgba(0, 85, 255, 0.15)' }}>
            <Icon name="zap" size={20} color={colors.primary} />
            <span style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{loadingMessage || 'Scanning repository structure...'}</span>
          </div>
        )}

        {/* Input Configuration Card */}
        <InputSection
          activeTab={activeTab} setActiveTab={setActiveTab}
          githubUrl={githubUrl} setGithubUrl={setGithubUrl}
          githubBranch={githubBranch} setGithubBranch={setGithubBranch}
          githubToken={githubToken} setGithubToken={setGithubToken}
          urlHistory={urlHistory} ignorePatterns={ignorePatterns} setIgnorePatterns={setIgnorePatterns}
          removeComments={removeComments} setRemoveComments={setRemoveComments}
          removeExtraWhitespace={removeExtraWhitespace} setRemoveExtraWhitespace={setRemoveExtraWhitespace}
          maxContextTokens={maxContextTokens} setMaxContextTokens={setMaxContextTokens}
          maxFileSize={maxFileSize} setMaxFileSize={setMaxFileSize}
          loading={loading} fetchGitHubRepo={fetchGitHubRepo}
          pickLocalFiles={pickLocalFiles} pickLocalDirectory={pickLocalDirectory}
          isDragging={isDragging} handleDragEnter={handleDragEnter} handleDragLeave={handleDragLeave}
          handleDragOver={handleDragOver} handleDrop={handleDrop}
          isMobile={isMobile}
        />

        {/* Codebase Selection Tree */}
        {sources.length > 0 && (
          <div style={{ marginTop: 24 }}>
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

        {/* Output Bundle Display */}
        {outputBatches.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <OutputSection
              outputBatches={outputBatches}
              activeBatchIndex={activeBatchIndex}
              setActiveBatchIndex={setActiveBatchIndex}
              isMobile={isMobile}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${colors.border}`, padding: '20px 0', textAlign: 'center', backgroundColor: isDark ? '#050505' : '#fafafa' }}>
        <span style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
          repointxt • High Performance LLM Context Packer
        </span>
      </footer>
    </div>
  );
}