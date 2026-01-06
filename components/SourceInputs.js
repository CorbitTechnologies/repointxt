import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Linking, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const SourceInputs = ({
  githubUrl,
  setGithubUrl,
  githubToken,
  setGithubToken,
  urlHistory = [],
}) => {
  const { colors, borderRadius, spacing } = useTheme();
  const urlInputRef = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState([]);

  // Filter history based on current input
  useEffect(() => {
    if (githubUrl && urlHistory.length > 0) {
      const filtered = urlHistory.filter(url =>
        url.toLowerCase().includes(githubUrl.toLowerCase()) && url !== githubUrl
      );
      setFilteredHistory(filtered);
      setShowSuggestions(filtered.length > 0 && Platform.OS === 'web');
    } else {
      setFilteredHistory(urlHistory);
      setShowSuggestions(false);
    }
  }, [githubUrl, urlHistory]);

  // Handle suggestion click
  const handleSuggestionClick = (url) => {
    setGithubUrl(url);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Repository URL</Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            ref={urlInputRef}
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
              borderRadius: borderRadius.md,
              padding: spacing.md
            }]}
            placeholder="https://github.com/owner/repo"
            placeholderTextColor={colors.textPlaceholder}
            value={githubUrl}
            onChangeText={setGithubUrl}
            onFocus={() => !!urlHistory.length && !githubUrl && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            autoCapitalize="none"
            autoCorrect={false}
          />{Platform.OS === 'web' && showSuggestions && filteredHistory.length > 0 && (
            <View style={[styles.suggestionsContainer, {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
            }]}>{filteredHistory.slice(0, 5).map((url, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionItem, {
                  borderBottomColor: colors.border,
                  borderBottomWidth: index < filteredHistory.length - 1 ? 1 : 0,
                }]}
                onPress={() => handleSuggestionClick(url)}
              >
                <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={1}>
                  {url}
                </Text>
              </TouchableOpacity>
            ))}</View>
          )}</View>
      </View>
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>GitHub Token</Text>{!!githubToken && (
              <View style={[styles.savedIndicator, { backgroundColor: colors.success || '#10b981' }]}>
                <Text style={styles.savedText}>SAVED</Text>
              </View>
            )}</View>
          <TouchableOpacity onPress={() => Linking.openURL('https://github.com/settings/tokens/new?description=repo2txt&scopes=repo')}>
            <Text style={[styles.link, { color: colors.primary }]}>Get Token</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
            borderRadius: borderRadius.md,
            padding: spacing.md
          }]}
          placeholder="ghp_xxxxxxxxxxxx (Optional)"
          placeholderTextColor={colors.textPlaceholder}
          value={githubToken}
          onChangeText={setGithubToken}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 15,
    borderWidth: 1,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
  },
  savedIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savedText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderWidth: 1,
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 1000,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }
    })
  },
  suggestionItem: {
    padding: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        ':hover': {
          opacity: 0.8,
        }
      }
    })
  },
  suggestionText: {
    fontSize: 14,
  },
});

export default SourceInputs;