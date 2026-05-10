import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Linking, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const SourceInputs = ({
  githubUrl,
  setGithubUrl,
  githubToken,
  setGithubToken,
  urlHistory = [],
}) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUrlFocused, setIsUrlFocused] = useState(false);
  const [isTokenFocused, setIsTokenFocused] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState([]);

  useEffect(() => {
    if (githubUrl && urlHistory.length > 0) {
      const filtered = urlHistory.filter(url =>
        url.toLowerCase().includes(githubUrl.toLowerCase()) && url !== githubUrl
      );
      setFilteredHistory(filtered);
      // Only show suggestions if we have a match and the input isn't exactly a matched URL
      setShowSuggestions(filtered.length > 0 && isUrlFocused);
    } else if (isUrlFocused && urlHistory.length > 0 && !githubUrl) {
      setFilteredHistory(urlHistory);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [githubUrl, urlHistory, isUrlFocused]);

  const handleSuggestionClick = (url) => {
    setGithubUrl(url);
    // Delay hiding to ensure the value is set
    setTimeout(() => setShowSuggestions(false), 50);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputGroup, { zIndex: 3000 }]}>
        <View style={styles.labelRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="github" size={12} color={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Repository URL</Text>
          </View>
        </View>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: isUrlFocused ? colors.primary : colors.border,
              color: colors.text,
              borderRadius: 6,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
            }]}
            placeholder="owner/repo or full url"
            placeholderTextColor={colors.textPlaceholder}
            value={githubUrl}
            onChangeText={setGithubUrl}
            onFocus={() => setIsUrlFocused(true)}
            onBlur={() => {
              // Delay closing to allow clicking suggestions
              setTimeout(() => setIsUrlFocused(false), 200);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {Platform.OS === 'web' && showSuggestions && filteredHistory.length > 0 && (
            <View style={[styles.suggestionsContainer, {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: 8,
              marginTop: 4,
              borderWidth: 1,
              ...Platform.select({
                web: {
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
                }
              })
            }]}>
              {filteredHistory.slice(0, 5).map((url, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionItem, {
                    borderBottomColor: colors.border,
                    borderBottomWidth: index < Math.min(filteredHistory.length, 5) - 1 ? 1 : 0,
                  }]}
                  onPress={() => handleSuggestionClick(url)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="link" size={14} color={colors.primary} />
                    <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={1}>
                      {url.replace(/^https?:\/\/github\.com\//i, '')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
      <View style={[styles.inputGroup, { zIndex: 1000 }]}>
        <View style={styles.labelRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Access Token</Text>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL('https://github.com/settings/tokens/new')}>
            <Icon name="external-link" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: isTokenFocused ? colors.primary : colors.border,
            color: colors.text,
            borderRadius: 6,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
          }]}
          placeholder="Optional for public repos"
          placeholderTextColor={colors.textPlaceholder}
          value={githubToken}
          onChangeText={setGithubToken}
          onFocus={() => setIsTokenFocused(true)}
          onBlur={() => setIsTokenFocused(false)}
          secureTextEntry={true}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  inputGroup: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 13,
    fontWeight: '500',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 9999,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 12,
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SourceInputs;
