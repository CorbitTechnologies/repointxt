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
  const { colors, borderRadius, spacing, shadows } = useTheme();
  const urlInputRef = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUrlFocused, setIsUrlFocused] = useState(false);
  const [isTokenFocused, setIsTokenFocused] = useState(false);
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
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Repository URL</Text>
        </View>
        <View style={{ position: 'relative' }}>
          <TextInput
            ref={urlInputRef}
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: isUrlFocused ? colors.primary : colors.border,
              color: colors.text,
              borderRadius: borderRadius.lg,
              padding: spacing.sm,
              borderWidth: 1.5,
            }]}
            placeholder="https://github.com/owner/repo"
            placeholderTextColor={colors.textPlaceholder}
            value={githubUrl}
            onChangeText={setGithubUrl}
            onFocus={() => {
              setIsUrlFocused(true);
              if (!!urlHistory.length && !githubUrl) setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsUrlFocused(false);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {Platform.OS === 'web' && showSuggestions && filteredHistory.length > 0 && (
            <View style={[styles.suggestionsContainer, {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              marginTop: 6,
              ...shadows.lg
            }]}>
              {filteredHistory.slice(0, 5).map((url, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionItem, {
                    borderBottomColor: colors.border,
                    borderBottomWidth: index < Math.min(filteredHistory.length, 5) - 1 ? 1 : 0,
                  }]}
                  onPress={() => handleSuggestionClick(url)}
                >
                  <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={1}>
                    {url}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>GitHub Token</Text>
            {!!githubToken && (
              <View style={[styles.savedIndicator, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.savedText, { color: colors.success }]}>SAVED</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => Linking.openURL('https://github.com/settings/tokens/new?description=repo2txt&scopes=repo')}>
            <Text style={[styles.link, { color: colors.primary }]}>Get Token</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: isTokenFocused ? colors.primary : colors.border,
            color: colors.text,
            borderRadius: borderRadius.lg,
            padding: spacing.sm,
            borderWidth: 1.5,
          }]}
          placeholder="ghp_xxxxxxxxxxxx (Optional for public repos)"
          placeholderTextColor={colors.textPlaceholder}
          value={githubToken}
          onChangeText={setGithubToken}
          onFocus={() => setIsTokenFocused(true)}
          onBlur={() => setIsTokenFocused(false)}
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
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    fontSize: 14,
    borderWidth: 1,
    fontWeight: '500',
  },
  link: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  savedIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savedText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 10,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SourceInputs;