import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';

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
  const [ignorePatterns, setIgnorePatterns] = useState(DEFAULT_IGNORE_PATTERNS.join(', '));
  
  // LLM Enhancement Options
  const [removeComments, setRemoveComments] = useState(true);
  const [removeExtraWhitespace, setRemoveExtraWhitespace] = useState(true);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [includeOnlyCode, setIncludeOnlyCode] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState('100');
  const [tokenCount, setTokenCount] = useState(0);

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

    try {
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

      const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/main?recursive=1`,
        { headers }
      );

      if (!treeResponse.ok) {
        // Try master branch if main doesn't exist
        const masterResponse = await fetch(
          `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/master?recursive=1`,
          { headers }
        );
        
        if (!masterResponse.ok) {
          throw new Error('Failed to fetch repository. Check the URL and token.');
        }
        
        const masterData = await masterResponse.json();
        await processRepoTree(masterData, owner, cleanRepo, headers);
      } else {
        const treeData = await treeResponse.json();
        await processRepoTree(treeData, owner, cleanRepo, headers);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to fetch repository');
      setOutput('Error: ' + (error.message || 'Failed to fetch repository'));
    } finally {
      setLoading(false);
    }
  };

  const processRepoTree = async (treeData, owner, repo, headers) => {
    let files = treeData.tree.filter(
      item => item.type === 'blob' && !shouldIgnore(item.path, ignorePatterns)
    );

    // Filter to only code files if option is enabled
    if (includeOnlyCode) {
      files = files.filter(file => isCodeFile(file.path));
    }

    // Build directory structure
    const structure = buildDirStructure(treeData.tree, ignorePatterns);
    setDirStructure(structure);

    let combinedText = `Repository: ${owner}/${repo}\n`;
    combinedText += `Total files: ${files.length}\n`;
    combinedText += `Generated: ${new Date().toISOString()}\n`;
    combinedText += `\n${'='.repeat(80)}\n`;
    combinedText += `DIRECTORY STRUCTURE:\n`;
    combinedText += `${'='.repeat(80)}\n`;
    combinedText += structure;
    combinedText += `\n${'='.repeat(80)}\n`;
    combinedText += `FILE CONTENTS:\n`;
    combinedText += `${'='.repeat(80)}\n\n`;

    const maxFileSizeBytes = (parseInt(maxFileSize) || 100) * 1024; // Convert KB to bytes, default 100KB

    // Fetch file contents
    for (const file of files) {
      try {
        // Skip files larger than max size
        if (file.size > maxFileSizeBytes) {
          combinedText += `\n${'─'.repeat(80)}\n`;
          combinedText += `FILE: ${file.path} [SKIPPED - Size: ${Math.round(file.size / 1024)}KB exceeds limit]\n`;
          combinedText += `${'─'.repeat(80)}\n\n`;
          continue;
        }

        const contentResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
          { headers }
        );
        
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          try {
            const content = atob(contentData.content);
            const optimizedContent = optimizeContent(content, file.path);
            
            combinedText += `\n${'─'.repeat(80)}\n`;
            combinedText += `FILE: ${file.path}\n`;
            combinedText += `Size: ${Math.round(file.size / 1024)}KB | Lines: ${optimizedContent.split('\n').length}\n`;
            combinedText += `${'─'.repeat(80)}\n`;
            combinedText += optimizedContent;
            combinedText += `\n`;
          } catch (decodeError) {
            // Handle binary files or invalid base64
            combinedText += `\n${'─'.repeat(80)}\n`;
            combinedText += `FILE: ${file.path} [SKIPPED - Binary or non-text file]\n`;
            combinedText += `${'─'.repeat(80)}\n\n`;
          }
        }
      } catch (error) {
        console.log(`Error fetching ${file.path}:`, error);
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

    return formatStructure(structure, 0);
  };

  const formatStructure = (obj, level) => {
    let result = '';
    const entries = Object.entries(obj).sort((a, b) => {
      const aIsFile = a[1] === null;
      const bIsFile = b[1] === null;
      if (aIsFile && !bIsFile) return 1;
      if (!aIsFile && bIsFile) return -1;
      return a[0].localeCompare(b[0]);
    });

    entries.forEach(([key, value]) => {
      const indent = '  '.repeat(level);
      const prefix = value === null ? '📄 ' : '📁 ';
      result += `${indent}${prefix}${key}\n`;
      if (value !== null) {
        result += formatStructure(value, level + 1);
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

  const showDirStructure = () => {
    if (!dirStructure) {
      Alert.alert('No structure', 'Please fetch a repository first');
      return;
    }
    Alert.alert('Directory Structure', dirStructure);
  };

  const pickLocalFiles = async () => {
    try {
      setLoading(true);
      setOutput('');
      setDirStructure('');

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      let combinedText = `Local Files\n`;
      combinedText += `Total files: ${result.assets?.length || 1}\n`;
      combinedText += `Generated: ${new Date().toISOString()}\n`;
      combinedText += `\n${'='.repeat(80)}\n`;
      combinedText += `FILE CONTENTS:\n`;
      combinedText += `${'='.repeat(80)}\n\n`;

      const files = result.assets || [result];

      for (const file of files) {
        try {
          // Check if file should be included
          if (includeOnlyCode && !isCodeFile(file.name)) {
            continue;
          }

          // Check file size
          const maxFileSizeBytes = (parseInt(maxFileSize) || 100) * 1024; // Default 100KB
          if (file.size && file.size > maxFileSizeBytes) {
            combinedText += `\n${'─'.repeat(80)}\n`;
            combinedText += `FILE: ${file.name} [SKIPPED - Size: ${Math.round(file.size / 1024)}KB exceeds limit]\n`;
            combinedText += `${'─'.repeat(80)}\n\n`;
            continue;
          }

          // Read file content
          try {
            const content = await FileSystem.readAsStringAsync(file.uri, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            const optimizedContent = optimizeContent(content, file.name);

            combinedText += `\n${'─'.repeat(80)}\n`;
            combinedText += `FILE: ${file.name}\n`;
            if (file.size) {
              combinedText += `Size: ${Math.round(file.size / 1024)}KB | `;
            }
            combinedText += `Lines: ${optimizedContent.split('\n').length}\n`;
            combinedText += `${'─'.repeat(80)}\n`;
            combinedText += optimizedContent;
            combinedText += `\n`;
          } catch (readError) {
            // Handle binary files or encoding errors
            combinedText += `\n${'─'.repeat(80)}\n`;
            combinedText += `FILE: ${file.name} [ERROR - Could not read as text file]\n`;
            combinedText += `${'─'.repeat(80)}\n\n`;
          }
        } catch (error) {
          console.log(`Error reading ${file.name}:`, error);
          combinedText += `\n${'─'.repeat(80)}\n`;
          combinedText += `FILE: ${file.name} [ERROR - Could not read file]\n`;
          combinedText += `${'─'.repeat(80)}\n\n`;
        }
      }

      setOutput(combinedText);
      setTokenCount(estimateTokens(combinedText));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to pick files');
    } finally {
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

      let combinedText = `Local Files (Drag & Drop)\n`;
      combinedText += `Total files: ${files.length}\n`;
      combinedText += `Generated: ${new Date().toISOString()}\n`;
      combinedText += `\n${'='.repeat(80)}\n`;
      combinedText += `FILE CONTENTS:\n`;
      combinedText += `${'='.repeat(80)}\n\n`;

      for (const file of files) {
        try {
          // Check if file should be included
          if (includeOnlyCode && !isCodeFile(file.name)) {
            continue;
          }

          // Check file size
          const maxFileSizeBytes = (parseInt(maxFileSize) || 100) * 1024;
          if (file.size && file.size > maxFileSizeBytes) {
            combinedText += `\n${'─'.repeat(80)}\n`;
            combinedText += `FILE: ${file.name} [SKIPPED - Size: ${Math.round(file.size / 1024)}KB exceeds limit]\n`;
            combinedText += `${'─'.repeat(80)}\n\n`;
            continue;
          }

          // Read file content
          const content = await file.text();
          const optimizedContent = optimizeContent(content, file.name);

          combinedText += `\n${'─'.repeat(80)}\n`;
          combinedText += `FILE: ${file.name}\n`;
          if (file.size) {
            combinedText += `Size: ${Math.round(file.size / 1024)}KB | `;
          }
          combinedText += `Lines: ${optimizedContent.split('\n').length}\n`;
          combinedText += `${'─'.repeat(80)}\n`;
          combinedText += optimizedContent;
          combinedText += `\n`;
        } catch (error) {
          console.log(`Error reading ${file.name}:`, error);
          combinedText += `\n${'─'.repeat(80)}\n`;
          combinedText += `FILE: ${file.name} [ERROR - Could not read as text file]\n`;
          combinedText += `${'─'.repeat(80)}\n\n`;
        }
      }

      setOutput(combinedText);
      setTokenCount(estimateTokens(combinedText));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process dropped files');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>repo2txt</Text>
          <Text style={styles.subtitle}>Convert repositories & files to text for LLMs</Text>
          <Text style={styles.subtitle}>GitHub • Local Files • Token Optimized</Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>📦 Source</Text>
          <Text style={styles.label}>GitHub Repository URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://github.com/owner/repo"
            value={githubUrl}
            onChangeText={setGithubUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>GitHub Token (optional, for private repos)</Text>
          <TextInput
            style={styles.input}
            placeholder="ghp_xxxxxxxxxxxx"
            value={githubToken}
            onChangeText={setGithubToken}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={true}
          />

          <Text style={styles.label}>Ignore Patterns (comma-separated)</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="node_modules, .git, dist"
            value={ignorePatterns}
            onChangeText={setIgnorePatterns}
            multiline
            numberOfLines={2}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.sectionTitle}>LLM Enhancement Options</Text>
          
          <View style={styles.checkboxRow}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => setRemoveComments(!removeComments)}
            >
              <View style={[styles.checkboxBox, removeComments && styles.checkboxChecked]}>
                {removeComments && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Remove comments</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkboxRow}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => setRemoveExtraWhitespace(!removeExtraWhitespace)}
            >
              <View style={[styles.checkboxBox, removeExtraWhitespace && styles.checkboxChecked]}>
                {removeExtraWhitespace && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Remove extra whitespace</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkboxRow}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => setIncludeOnlyCode(!includeOnlyCode)}
            >
              <View style={[styles.checkboxBox, includeOnlyCode && styles.checkboxChecked]}>
                {includeOnlyCode && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Include only code files</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Max file size (KB)</Text>
          <TextInput
            style={styles.input}
            placeholder="100"
            value={maxFileSize}
            onChangeText={setMaxFileSize}
            keyboardType="numeric"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={fetchGitHubRepo}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Fetch Repository</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={showDirStructure}
              disabled={loading || !dirStructure}
            >
              <Text style={styles.buttonTextSecondary}>Show Structure</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, styles.localFilesButton]} 
            onPress={pickLocalFiles}
            disabled={loading}
          >
            <Text style={styles.buttonText}>📁 Pick Local Files</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <View 
              style={[styles.dropZone, isDragging && styles.dropZoneActive]}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Text style={styles.dropZoneText}>
                {isDragging ? '📥 Drop files here' : '🖱️ Or drag & drop files here'}
              </Text>
              {!isDragging && (
                <Text style={styles.dropZoneSubtext}>
                  Supports multiple files
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, styles.copyButton]} 
            onPress={copyToClipboard}
            disabled={loading || !output}
          >
            <Text style={styles.buttonText}>Copy to Clipboard</Text>
          </TouchableOpacity>
        </View>

        {output ? (
          <View style={styles.outputSection}>
            <View style={styles.statsRow}>
              <Text style={styles.statItem}>Characters: {output.length.toLocaleString()}</Text>
              <Text style={styles.statItem}>Tokens: ~{tokenCount.toLocaleString()}</Text>
              <Text style={styles.statItem}>Lines: {output.split('\n').length.toLocaleString()}</Text>
            </View>
            <Text style={styles.label}>Output</Text>
            <ScrollView style={styles.outputBox}>
              <Text style={styles.outputText}>{output}</Text>
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  inputSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    flex: 1,
  },
  copyButton: {
    backgroundColor: '#34C759',
    marginTop: 10,
  },
  localFilesButton: {
    backgroundColor: '#FF9500',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outputSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outputBox: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    maxHeight: 400,
  },
  outputText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  checkboxRow: {
    marginBottom: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statItem: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  dropZone: {
    marginTop: 15,
    padding: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  dropZoneActive: {
    backgroundColor: '#e0f0ff',
    borderColor: '#0051d5',
    borderWidth: 3,
  },
  dropZoneText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 5,
  },
  dropZoneSubtext: {
    fontSize: 13,
    color: '#666',
  },
});
