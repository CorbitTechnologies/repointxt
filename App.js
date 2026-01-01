import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import Footer from './components/Footer';
import SelectionComponent from './components/SelectionComponent';

// Default ignore patterns
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.expo',
  '.expo-shared',
  'dist',
  'build',
  'coverage',
  '.next',
  'out',
  '.cache',
  '.vscode',
  '.idea',
  '*.log',
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  '.DS_Store',
  'thumbs.db',
];

export default function App() {
  const [githubUrl, setGithubUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [dirStructure, setDirStructure] = useState('');
  const [treeData, setTreeData] = useState(null);
  const [localTreeData, setLocalTreeData] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [ignorePatterns, setIgnorePatterns] = useState(DEFAULT_IGNORE_PATTERNS.join(', '));
  
  // LLM Enhancement Options
  const [removeComments, setRemoveComments] = useState(true);
  const [removeExtraWhitespace, setRemoveExtraWhitespace] = useState(true);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [includeOnlyCode, setIncludeOnlyCode] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState('100');
  const [tokenCount, setTokenCount] = useState(0);
  const [activeTab, setActiveTab] = useState('github');
  const [showSelection, setShowSelection] = useState(false);

  const generateText = async () => {
    if (!treeData || selectedFiles.length === 0) return;

    setLoading(true);
    setOutput('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const headers = {
        'Accept': 'application/vnd.github.v3+json',
      };
      
      if (githubToken.trim()) {
        headers['Authorization'] = `Bearer ${githubToken.trim()}`;
      }

      await processRepoTree(treeData, selectedFiles, headers, controller.signal);

      clearTimeout(timeoutId);
    } catch (error) {
      if (error.name === 'AbortError') {
        Alert.alert('Error', 'Request timed out. The repository may be too large or the connection is slow.');
      } else {
        Alert.alert('Error', error.message || 'Failed to generate text');
      }
      setOutput('Error: ' + (error.message || 'Failed to generate text'));
    } finally {
      setLoading(false);
    }
  };

  const generateLocalText = async () => {
    if (!localTreeData || selectedFiles.length === 0) return;

    setLoading(true);
    setOutput('');

    try {
      let combinedText = `Local Files\n`;
      combinedText += `Total files: ${selectedFiles.length}\n`;
      combinedText += `Generated: ${new Date().toISOString()}\n`;
      combinedText += `\n${'='.repeat(40)}\n`;
      combinedText += `FILE CONTENTS:\n`;
      combinedText += `${'='.repeat(40)}\n\n`;

      const maxFileSizeBytes = (parseInt(maxFileSize) || 100) * 1024;

      for (const file of selectedFiles) {
        try {
          // Skip files larger than max size
          if (file.size > maxFileSizeBytes) {
            combinedText += `\n${'─'.repeat(50)}\n`;
            combinedText += `FILE: ${file.path} [SKIPPED - Size: ${Math.round(file.size / 1024)}KB exceeds limit]\n`;
            combinedText += `${'─'.repeat(50)}\n\n`;
            continue;
          }

          // Read file content
          let content;
          if (Platform.OS === 'web') {
            const response = await fetch(file.url);
            content = await response.text();
          } else {
            content = await FileSystem.readAsStringAsync(file.url, {
              encoding: FileSystem.EncodingType.UTF8,
            });
          }
          
          const optimizedContent = optimizeContent(content, file.path);
          
          combinedText += `\n${'─'.repeat(50)}\n`;
          combinedText += `FILE: ${file.path}\n`;
          combinedText += `${'─'.repeat(50)}\n`;
          combinedText += optimizedContent;
          combinedText += `\n`;
        } catch (error) {
          console.log(`Error fetching ${file.path}:`, error);
        }
      }

      setOutput(combinedText);
      setTokenCount(estimateTokens(combinedText));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to generate text');
      setOutput('Error: ' + (error.message || 'Failed to generate text'));
    } finally {
      setLoading(false);
    }
  };

  const shouldIgnore = (path, patterns) => {
    const patternList = patterns.split(',').map(p => p.trim());
    return patternList.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(path);
      }
      return path.includes(pattern);
    });
  };

  const fetchGitHubRepo = async () => {
    if (!githubUrl.trim()) {
      Alert.alert('Error', 'Please enter a GitHub repository URL');
      return;
    }

    setLoading(true);
    setOutput('');
    setDirStructure('');
    setSelectedFiles([]);
    setTreeData(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // Parse GitHub URL to extract owner and repo
      const urlMatch = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!urlMatch) {
        throw new Error('Invalid GitHub URL format');
      }

      const [, owner, repoName] = urlMatch;
      const cleanRepo = repoName.replace(/\.git$/, '');

      // Fetch repository tree
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
      };
      
      if (githubToken.trim()) {
        headers['Authorization'] = `Bearer ${githubToken.trim()}`;
      }

      // Fetch repository info to get default branch
      const repoResponse = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}`,
        { headers, signal: controller.signal }
      );

      if (!repoResponse.ok) {
        throw new Error('Repository not found or access denied. Check the URL and token.');
      }

      const repoData = await repoResponse.json();
      const defaultBranch = repoData.default_branch;

      // Fetch repository tree
      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${defaultBranch}?recursive=1`,
        { headers, signal: controller.signal }
      );

      if (!treeResponse.ok) {
        throw new Error('Failed to fetch repository tree. The repository may be empty or access is restricted.');
      }

      const treeData = await treeResponse.json();
      setTreeData(treeData);
      setDirStructure(buildDirStructure(treeData.tree, ignorePatterns));
      setShowSelection(true);

      clearTimeout(timeoutId);
    } catch (error) {
      if (error.name === 'AbortError') {
        Alert.alert('Error', 'Request timed out. The repository may be too large or the connection is slow.');
      } else {
        Alert.alert('Error', error.message || 'Failed to fetch repository');
      }
      setOutput('Error: ' + (error.message || 'Failed to fetch repository'));
    } finally {
      setLoading(false);
    }
  };

  const processRepoTree = async (treeData, selectedFiles, headers, signal) => {
    let combinedText = `Repository: ${treeData.url.split('/')[4]}/${treeData.url.split('/')[5]}\n`;
    combinedText += `Total files: ${selectedFiles.length}\n`;
    combinedText += `Generated: ${new Date().toISOString()}\n`;
    combinedText += `\n${'='.repeat(50)}\n`;
    combinedText += `FILE CONTENTS:\n`;
    combinedText += `${'='.repeat(50)}\n\n`;

    const maxFileSizeBytes = (parseInt(maxFileSize) || 100) * 1024;

    // Fetch file contents
    for (const file of selectedFiles) {
      try {
        // Skip files larger than max size
        if (file.size > maxFileSizeBytes) {
          combinedText += `\n${'─'.repeat(50)}\n`;
          combinedText += `FILE: ${file.path} [SKIPPED - Size: ${Math.round(file.size / 1024)}KB exceeds limit]\n`;
          combinedText += `${'─'.repeat(50)}\n\n`;
          continue;
        }

        const contentResponse = await fetch(
          `https://api.github.com/repos/${treeData.url.split('/')[4]}/${treeData.url.split('/')[5]}/contents/${file.path}`,
          { headers, signal }
        );
        
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          try {
            const content = atob(contentData.content);
            const optimizedContent = optimizeContent(content, file.path);
            
            combinedText += `\n${'─'.repeat(50)}\n`;
            combinedText += `FILE: ${file.path}\n`;
            combinedText += `${'─'.repeat(50)}\n`;
            combinedText += optimizedContent;
            combinedText += `\n`;
          } catch (decodeError) {
            combinedText += `\n${'─'.repeat(80)}\n`;
            combinedText += `FILE: ${file.path} [SKIPPED - Binary or non-text file]\n`;
            combinedText += `${'─'.repeat(80)}\n\n`;
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          break;
        } else {
          console.log(`Error fetching ${file.path}:`, error);
        }
      }
    }

    setOutput(combinedText);
    setTokenCount(estimateTokens(combinedText));
  };

  const buildDirStructure = (tree, patterns) => {
    const files = tree
      .filter(item => !shouldIgnore(item.path, patterns))
      .map(item => item.path);

    const structure = {};
    files.forEach(path => {
      const parts = path.split('/');
      let current = structure;
      parts.forEach((part, idx) => {
        if (!current[part]) {
          current[part] = idx === parts.length - 1 ? null : {};
        }
        if (idx < parts.length - 1) {
          current = current[part];
        }
      });
    });

    return formatStructure(structure, 0, '');
  };

  const formatStructure = (obj, level, prefix = '') => {
    let result = '';
    const entries = Object.entries(obj).sort((a, b) => {
      const aIsFile = a[1] === null;
      const bIsFile = b[1] === null;
      if (aIsFile && !bIsFile) return 1;
      if (!aIsFile && bIsFile) return -1;
      return a[0].localeCompare(b[0]);
    });

    entries.forEach(([key, value], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = isLast ? '    ' : '│   ';
      
      result += `${prefix}${connector}${key}\n`;
      if (value !== null) {
        result += formatStructure(value, level + 1, prefix + nextPrefix);
      }
    });

    return result;
  };

  const estimateTokens = (text) => {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  };

  const isCodeFile = (path) => {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
      '.cs', '.rb', '.go', '.rs', '.php', '.swift', '.kt', '.scala', '.sh',
      '.bash', '.html', '.css', '.scss', '.sass', '.vue', '.json', '.xml',
      '.yaml', '.yml', '.toml', '.sql', '.r', '.m', '.dart', '.lua'
    ];
    return codeExtensions.some(ext => path.toLowerCase().endsWith(ext));
  };

  const removeCodeComments = (content, filePath) => {
    if (!removeComments) return content;
    
    let result = content;
    
    // Remove single-line comments (// and #)
    if (filePath.match(/\.(js|jsx|ts|tsx|java|c|cpp|cs|go|rs|swift|kt|scala|php)$/i)) {
      result = result.replace(/\/\/.*$/gm, '');
    }
    if (filePath.match(/\.(py|sh|bash|r|rb|yaml|yml|toml)$/i)) {
      result = result.replace(/#.*$/gm, '');
    }
    
    // Remove multi-line comments (/* */)
    if (filePath.match(/\.(js|jsx|ts|tsx|java|c|cpp|cs|go|rs|css|scss|sass|php)$/i)) {
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    }
    
    // Remove docstrings in Python
    if (filePath.match(/\.py$/i)) {
      result = result.replace(/"""[\s\S]*?"""/g, '');
      result = result.replace(/'''[\s\S]*?'''/g, '');
    }
    
    // Remove HTML/XML comments from file content during text processing
    // Note: This is not for HTML sanitization; content is displayed as plain text
    if (filePath.match(/\.(html|xml|vue)$/i)) {
      result = result.replace(/<!--[\s\S]*?-->/g, '');
    }
    
    return result;
  };

  const optimizeContent = (content, filePath = '') => {
    let optimized = content;
    
    // Remove comments if enabled
    if (removeComments) {
      optimized = removeCodeComments(optimized, filePath);
    }
    
    // Remove extra whitespace if enabled
    if (removeExtraWhitespace) {
      // Remove trailing whitespace
      optimized = optimized.replace(/[ \t]+$/gm, '');
      // Remove excessive blank lines (more than 2 consecutive)
      optimized = optimized.replace(/\n{3,}/g, '\n\n');
    }
    
    return optimized.trim();
  };

  const copyToClipboard = async () => {
    if (!output) {
      Alert.alert('Nothing to copy', 'Please fetch a repository first');
      return;
    }

    try {
      await Clipboard.setStringAsync(output);
      Alert.alert('Success', 'Content copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const copyDirectoryStructure = async () => {
    if (!dirStructure) {
      Alert.alert('Nothing to copy', 'Please fetch a repository first');
      return;
    }

    try {
      await Clipboard.setStringAsync(dirStructure);
      Alert.alert('Success', 'Directory structure copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy directory structure to clipboard');
    }
  };

  const downloadText = () => {
    if (!output) return;

    if (Platform.OS === 'web') {
      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'repo2txt_output.txt';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // For mobile, perhaps save to documents or something, but for now, just copy
      copyToClipboard();
    }
  };

  const pickLocalDirectory = async () => {
    try {
      setLoading(true);
      setOutput('');
      setDirStructure('');
      setLocalTreeData(null);
      setSelectedFiles([]);

      if (Platform.OS === 'web') {
        // For web, use input with webkitdirectory
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        
        input.onchange = async (e) => {
          const files = Array.from(e.target.files);
          if (files.length === 0) {
            setLoading(false);
            return;
          }

          // Create tree data from directory files
          const treeItems = files.map((file, index) => ({
            path: file.webkitRelativePath || file.name,
            type: 'blob',
            size: file.size,
            url: file.uri || URL.createObjectURL(file),
            sha: `local-dir-${index}`,
          }));

          setLocalTreeData({ tree: treeItems });
          setShowSelection(true);
          setLoading(false);
        };
        
        input.click();
      } else {
        // For mobile, use DocumentPicker with multiple selection
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          multiple: true,
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          setLoading(false);
          return;
        }

        const files = result.assets || [result];
        
        // Create tree data from selected files
        const treeItems = files.map((file, index) => ({
          path: file.name,
          type: 'blob',
          size: file.size,
          url: file.uri,
          sha: `local-dir-${index}`,
        }));

        setLocalTreeData({ tree: treeItems });
        setShowSelection(true);
        setLoading(false);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to pick directory');
      setLoading(false);
    }
  };

  const processLocalDirectory = async (files) => {
    // Build directory structure from files
    const paths = files.map(file => ({ 
      path: file.webkitRelativePath || file.name,
      size: file.size,
      name: file.name
    }));
    const structure = buildDirStructure(paths, ignorePatterns);
    setDirStructure(structure);

    let combinedText = `Local Directory\n`;
    combinedText += `Total files: ${files.length}\n`;
    combinedText += `Generated: ${new Date().toISOString()}\n`;
    combinedText += `\nDIRECTORY STRUCTURE:\n${structure}\n\n`;
    combinedText += `${'='.repeat(40)}\n`;
    combinedText += `FILE CONTENTS:\n`;
    combinedText += `${'='.repeat(40)}\n\n`;

    let processedCount = 0;

    for (const file of files) {
      try {
        // Check if file should be included
        const filePath = file.webkitRelativePath || file.name;
        if (shouldIgnore(filePath, ignorePatterns) || (includeOnlyCode && !isCodeFile(file.name))) {
          continue;
        }

        // Check file size
        const maxFileSizeBytes = (parseInt(maxFileSize) || 100) * 1024;
        if (file.size && file.size > maxFileSizeBytes) {
          continue;
        }

        // Read file content
        let content;
        if (Platform.OS === 'web') {
          content = await file.text();
        } else {
          content = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
        }
        const optimizedContent = optimizeContent(content, file.name);

        combinedText += `\n${'─'.repeat(40)}\n`;
        combinedText += `FILE: ${filePath}\n`;
        combinedText += `${'─'.repeat(40)}\n`;
        combinedText += optimizedContent;
        combinedText += `\n`;
        processedCount++;
      } catch (error) {
        console.log(`Error reading ${file.name}:`, error);
        continue;
      }
    }

    // Update total files count
    combinedText = combinedText.replace(/Total files: \d+/, `Total files: ${processedCount}`);

    setOutput(combinedText);
    setTokenCount(estimateTokens(combinedText));
    setLoading(false);
  };

  const pickLocalFiles = async () => {
    try {
      setLoading(true);
      setOutput('');
      setDirStructure('');
      setLocalTreeData(null);
      setSelectedFiles([]);

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const files = result.assets || [result];
      
      // Create tree data from files
      const treeItems = files.map((file, index) => ({
        path: file.name,
        type: 'blob',
        size: file.size,
        url: file.uri,
        sha: `local-${index}`,
      }));

      setLocalTreeData({ tree: treeItems });
      setShowSelection(true);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to pick files');
      setLoading(false);
    }
  };

  // Drag and drop handlers (web only)
  const handleDragEnter = (e) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    try {
      setLoading(true);
      setOutput('');
      setDirStructure('');

      const files = Array.from(e.dataTransfer.files);
      
      if (files.length === 0) {
        Alert.alert('No files', 'Please drop at least one file');
        setLoading(false);
        return;
      }

      const paths = files.map(file => ({ path: file.webkitRelativePath || file.name }));
      const structure = buildDirStructure(paths, ignorePatterns);
      setDirStructure(structure);

      let combinedText = `Local Files (Drag & Drop)\n`;
      combinedText += `Total files: ${files.length}\n`;
      combinedText += `Generated: ${new Date().toISOString()}\n`;
      combinedText += `\nDIRECTORY STRUCTURE:\n${structure}\n\n`;
      combinedText += `${'='.repeat(40)}\n`;
      combinedText += `FILE CONTENTS:\n`;
      combinedText += `${'='.repeat(40)}\n\n`;

      let processedCount = 0;

      for (const file of files) {
        try {
          // Check if file should be included
          const filePath = file.webkitRelativePath || file.name;
          if (shouldIgnore(filePath, ignorePatterns) || (includeOnlyCode && !isCodeFile(file.name))) {
            continue;
          }

          // Check file size
          const maxFileSizeBytes = (parseInt(maxFileSize) || 100) * 1024;
          if (file.size && file.size > maxFileSizeBytes) {
            continue;
          }

          // Read file content
          const content = await file.text();
          const optimizedContent = optimizeContent(content, file.name);

          combinedText += `\n${'─'.repeat(40)}\n`;
          combinedText += `FILE: ${filePath}\n`;
          combinedText += `${'─'.repeat(40)}\n`;
          combinedText += optimizedContent;
          combinedText += `\n`;
          processedCount++;
        } catch (error) {
          console.log(`Error reading ${file.name}:`, error);
          continue;
        }
      }

      // Update total files count
      combinedText = combinedText.replace(/Total files: \d+/, `Total files: ${processedCount}`);

      setOutput(combinedText);
      setTokenCount(estimateTokens(combinedText));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process dropped files');
    } finally {
      setLoading(false);
    }
  };
  return (
    <View 
      style={[styles.container, isDragging && styles.draggingContainer]}
    >
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <InputSection
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          githubUrl={githubUrl}
          setGithubUrl={setGithubUrl}
          githubToken={githubToken}
          setGithubToken={setGithubToken}
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
          copyDirectoryStructure={copyDirectoryStructure}
          pickLocalFiles={pickLocalFiles}
          pickLocalDirectory={pickLocalDirectory}
          copyToClipboard={copyToClipboard}
          output={output}
          dirStructure={dirStructure}
          isDragging={isDragging}
          handleDragEnter={handleDragEnter}
          handleDragLeave={handleDragLeave}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
        />
        {showSelection ? (
          <SelectionComponent 
            tree={(treeData || localTreeData)?.tree} 
            selectedFiles={selectedFiles} 
            setSelectedFiles={setSelectedFiles} 
            onGenerate={treeData ? generateText : generateLocalText} 
            loading={loading} 
          />
        ) : null}
        {output ? (
          <View>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.copyButton]} 
                onPress={() => copyToClipboard()}
              >
                <Text style={styles.actionButtonText}>Copy to Clipboard</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.downloadButton]} 
                onPress={() => downloadText()}
              >
                <Text style={styles.actionButtonText}>Download as Text File</Text>
              </TouchableOpacity>
            </View>
            <OutputSection output={output} tokenCount={tokenCount} />
          </View>
        ) : null}
        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    ...Platform.select({
      web: {},
      default: {},
    }),
  },
  draggingContainer: {
    backgroundColor: '#e0f0ff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 5,
    paddingTop: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    flex: 1,
  },
  copyButton: {
    backgroundColor: '#34C759',
  },
  downloadButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
