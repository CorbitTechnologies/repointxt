import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, Linking } from 'react-native';

const SourceInputs = ({
  githubUrl,
  setGithubUrl,
  githubToken,
  setGithubToken,
}) => {
  return (
    <>
      <Text style={styles.label}>GitHub Repository URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://github.com/owner/repo"
        value={githubUrl}
        onChangeText={setGithubUrl}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>GitHub Token (optional, for private repos) - Select 'repo' scope</Text>
      <TextInput
        style={styles.input}
        placeholder="ghp_xxxxxxxxxxxx"
        value={githubToken}
        onChangeText={setGithubToken}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={true}
      />
      <TouchableOpacity onPress={() => Linking.openURL('https://github.com/settings/tokens/new?description=repo2txt&scopes=repo')}>
        <Text style={styles.link}>Create a new token</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: '#333',
  },
  link: {
    color: '#007AFF',
    fontSize: 12,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});

export default SourceInputs;