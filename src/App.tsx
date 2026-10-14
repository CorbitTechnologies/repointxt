import { useState, useEffect, useRef } from 'react';
import OutputSection from './components/OutputSection';
import SelectionComponent from './components/SelectionComponent';
import GitHubTab from './components/GitHubTab';
import LocalTab from './components/LocalTab';
import TabSwitcher from './components/TabSwitcher';
import ProcessingOptions from './components/ProcessingOptions';
import BrandLogo from './components/BrandLogo';
import Icon from './components/Icon';
import { useRepoManager } from './hooks/useRepoManager';
import { useTheme } from './hooks/useTheme';
import { trackCompanyOutbound, trackGitHubOutbound } from './services/firebase';

const GITHUB_REPO_URL = 'https://github.com/CorbitTechnologies/repointxt';

export default function App() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = width < 768;
  const theme = useTheme();
  const { colors, isDark, borderRadius, shadows } = theme;
  const [repoStars, setRepoStars] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/CorbitTechnologies/repointxt')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && typeof data.stargazers_count === 'number') {
          setRepoStars(data.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  const formatStars = (stars: number | null): string => {
    if (stars === null || stars === undefined) return 'Star';
    if (stars >= 1000000) return `${(stars / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (stars >= 1000) return `${(stars / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return stars.toLocaleString();
  };

  const {
    loading, loadingMessage, errorMessage, clearErrorMessage, sources, githubUrl, setGithubUrl, githubBranch, setGithubBranch,
    githubToken, setGithubToken, githubRateLimit, urlHistory,
    outputBatches, activeBatchIndex, setActiveBatchIndex, isDragging, setIsDragging,
    options, updateOption,
    activeTab, setActiveTab,
    fetchGitHubRepo, pickLocalDirectory, pickLocalFiles, generateText, removeSource,
    clearAll, clearOutput,
    treeData, selectedFiles, setSelectedFiles,
    processDroppedItems
  } = useRepoManager();

  // Robust global drag-and-drop listener with counter to prevent flickering over child elements
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processDroppedItems(e.dataTransfer);
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [setIsDragging, processDroppedItems]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background, color: colors.text, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', position: 'relative' }}>

      {/* ── GLOBAL FULL-PAGE DRAG & DROP OVERLAY ── */}
      {isDragging && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          backgroundColor: isDark ? 'rgba(9, 13, 19, 0.88)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: `3px dashed ${colors.primary}`,
          margin: 12,
          borderRadius: 16,
          pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            padding: '24px 36px',
            backgroundColor: colors.card,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: `${colors.primary}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon name="upload" size={28} color={colors.primary} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: '-0.3px', marginBottom: 4 }}>
                Drop Codebase Files, Folders, or ZIP Archives
              </div>
              <div style={{ fontSize: 13, color: colors.textSecondary }}>
                Release anywhere on screen to parse codebase in-memory instantly
              </div>
            </div>
          </div>
        </div>
      )}

      <header style={{
        backgroundColor: isDark ? 'rgba(9, 13, 19, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        padding: isMobile ? '8px 12px 6px' : '10px 20px 8px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
      }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandLogo size={isMobile ? 'sm' : 'md'} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {githubRateLimit && !isMobile && (
              <div style={{
                fontSize: 11,
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                padding: '3px 8px',
                borderRadius: 20,
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <Icon name="activity" size={12} color={colors.primary} />
                <span>API: <strong>{githubRateLimit.remaining}</strong>/{githubRateLimit.limit}</span>
              </div>
            )}
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackGitHubOutbound('header_star')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                color: isDark ? '#f0f6fc' : '#1f2328',
                padding: '5px 10px',
                borderRadius: 20,
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '-0.2px',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.15)'}`,
                transition: 'all 0.15s ease',
              }}
              className="github-nav-link"
              title="Support open source — Star repointxt on GitHub"
            >
              <Icon name="github-fill" size={15} color={isDark ? '#f0f6fc' : '#1f2328'} />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: isDark ? '#f0f6fc' : '#1f2328',
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
              }}>
                Star
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: isDark ? '#38bdf8' : '#0969da',
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(9, 105, 218, 0.1)',
                padding: '1px 6px',
                borderRadius: 10,
                marginLeft: 2
              }}>
                {formatStars(repoStars)}
              </span>
            </a>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1040, width: '100%', margin: '0 auto', padding: isMobile ? '12px 12px 32px' : '16px 20px 36px', boxSizing: 'border-box' }}>

        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 25, fontWeight: '900', margin: '0 0 4px 0', color: colors.text, letterSpacing: '-0.6px', lineHeight: 1.15 }}>
            Pack Codebase into Pure LLM Signal
          </h1>
          <p style={{ fontSize: 13, color: isDark ? '#8b949e' : '#57606a', margin: '0 auto 10px', maxWidth: 580, lineHeight: 1.4 }}>
            From repository to token-dense context in milliseconds. Stream ZIP archives in-memory, auto-select core monorepo paths, and pack for ChatGPT, Claude, and Gemini.
          </p>

          {/* Privacy & Trust Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(9, 105, 218, 0.08)',
            border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(9, 105, 218, 0.25)'}`,
            fontSize: 11.5,
            fontWeight: 600,
            color: isDark ? '#7dd3fc' : '#0969da'
          }}>
            <Icon name="shield-check" size={13} color={isDark ? '#38bdf8' : '#0969da'} />
            <span>100% Client-Side &amp; Private — Zero servers, in-browser parsing. Code never leaves your machine.</span>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              backgroundColor: isDark ? 'rgba(248, 81, 73, 0.12)' : 'rgba(207, 34, 46, 0.08)',
              border: `1px solid ${isDark ? 'rgba(248, 81, 73, 0.35)' : 'rgba(207, 34, 46, 0.3)'}`,
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  backgroundColor: isDark ? 'rgba(248, 81, 73, 0.2)' : 'rgba(207, 34, 46, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="x" size={14} color="#f85149" />
              </div>
              <span style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#ff7b72' : '#cf222e', lineHeight: 1.4 }}>
                {errorMessage}
              </span>
            </div>
            <button
              onClick={clearErrorMessage}
              style={{
                background: 'none',
                border: 'none',
                color: isDark ? '#ff7b72' : '#cf222e',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                opacity: 0.8,
              }}
              title="Dismiss error"
            >
              <Icon name="x" size={14} color="currentColor" />
            </button>
          </div>
        )}

        {loading && (
          <div style={{ backgroundColor: colors.primary + '15', border: `1px solid ${colors.primary}`, borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 16px rgba(0, 85, 255, 0.15)' }}>
            <Icon name="zap" size={18} color={colors.primary} />
            <span style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{loadingMessage || 'Scanning repository structure...'}</span>
          </div>
        )}

        <div
          style={{
            width: '100%',
            backgroundColor: colors.card,
            borderRadius: borderRadius.lg,
            padding: isMobile ? 12 : 16,
            borderColor: colors.border,
            borderWidth: 1,
            borderStyle: 'solid',
            boxSizing: 'border-box',
            ...shadows.md
          }}
        >
          <TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} />

          <div style={{ marginBottom: 16 }}>
            {activeTab === 'github' ? (
              <GitHubTab
                githubUrl={githubUrl}
                setGithubUrl={setGithubUrl}
                githubBranch={githubBranch}
                setGithubBranch={setGithubBranch}
                githubToken={githubToken}
                setGithubToken={setGithubToken}
                urlHistory={urlHistory}
                loading={loading}
                fetchGitHubRepo={fetchGitHubRepo}
                isMobile={isMobile}
                hasSources={sources.length > 0}
              />
            ) : (
              <LocalTab
                pickLocalFiles={pickLocalFiles}
                pickLocalDirectory={pickLocalDirectory}
                loading={loading}
                isDragging={isDragging}
                isMobile={isMobile}
              />
            )}
          </div>

          <ProcessingOptions options={options} updateOption={updateOption} isMobile={isMobile} />
        </div>

        {sources.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <SelectionComponent
              tree={treeData?.tree || []}
              sources={sources}
              removeSource={removeSource}
              onClearAll={clearAll}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              onGenerate={generateText}
              loading={loading}
              isMobile={isMobile}
              maxContextTokens={options.maxContextTokens}
            />
          </div>
        )}

        {outputBatches.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <OutputSection
              outputBatches={outputBatches}
              activeBatchIndex={activeBatchIndex}
              setActiveBatchIndex={setActiveBatchIndex}
              onClearOutput={clearOutput}
              isMobile={isMobile}
            />
          </div>
        )}
      </main>

      <footer style={{
        borderTop: `1px solid ${colors.border}`,
        padding: '20px',
        textAlign: 'center',
        backgroundColor: isDark ? '#05070a' : '#fafafa',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: 12.5, color: isDark ? '#8b949e' : '#57606a', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', justifyContent: 'center', lineHeight: 1.5 }}>
          <span>In-browser privacy suite by</span>
          <a
            href="https://www.corbittechnologies.com/?utm_source=repointxt&utm_medium=footer&utm_campaign=brand_attribution"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackCompanyOutbound('footer')}
            style={{
              color: isDark ? '#58a6ff' : '#0969da',
              fontWeight: 700,
              textDecoration: 'none',
              borderBottom: `1px dashed ${isDark ? '#58a6ff80' : '#0969da80'}`,
              paddingBottom: 1
            }}
          >
            Corbit Technologies
          </a>
          <span>•</span>
          <a
            href="https://filefryer.com/?utm_source=repointxt&utm_medium=footer&utm_campaign=privacy_ecosystem"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: isDark ? '#8b949e' : '#57606a',
              textDecoration: 'none',
              fontWeight: 600,
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#38bdf8' : '#0969da')}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8b949e' : '#57606a')}
          >
            FileFryer (Files &amp; Media)
          </a>
          <span>•</span>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackGitHubOutbound('footer')}
            style={{
              color: isDark ? '#58a6ff' : '#0969da',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>Star on GitHub ⭐</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
