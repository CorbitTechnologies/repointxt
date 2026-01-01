import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const Footer = () => {
  return (
    <View style={styles.footer}>
      <Text style={styles.title}>repo2txt</Text>
      <Text style={styles.subtitle}>Convert repositories & files to text for LLMs</Text>
      <Text style={styles.subtitle}>GitHub • Local Files • Token Optimized</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
});

export default Footer;