import React, { useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import TabSwitcher from './TabSwitcher';
import ProcessingOptions from './ProcessingOptions';
import GitHubTab from './GitHubTab';
import LocalTab from './LocalTab';

const InputSection = ({
  activeTab,
  setActiveTab,
  githubUrl,
  setGithubUrl,
  githubToken,
  setGithubToken,
  ignorePatterns,
  setIgnorePatterns,
  removeComments,
  setRemoveComments,
  removeExtraWhitespace,
  setRemoveExtraWhitespace,
  includeOnlyCode,
  setIncludeOnlyCode,
  maxFileSize,
  setMaxFileSize,
  loading,
  fetchGitHubRepo,
  copyDirectoryStructure,
  pickLocalFiles,
  pickLocalDirectory,
  copyToClipboard,
  output,
  dirStructure,
  isDragging,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
}) => {
  return (
    <View 
      style={styles.inputSection}
      onDragEnter={activeTab === 'local' ? handleDragEnter : undefined}
      onDragOver={activeTab === 'local' ? handleDragOver : undefined}
      onDragLeave={activeTab === 'local' ? handleDragLeave : undefined}
      onDrop={activeTab === 'local' ? handleDrop : undefined}
    >
      <ProcessingOptions
        removeComments={removeComments}
        setRemoveComments={setRemoveComments}
        removeExtraWhitespace={removeExtraWhitespace}
        setRemoveExtraWhitespace={setRemoveExtraWhitespace}
        includeOnlyCode={includeOnlyCode}
        setIncludeOnlyCode={setIncludeOnlyCode}
        maxFileSize={maxFileSize}
        setMaxFileSize={setMaxFileSize}
        ignorePatterns={ignorePatterns}
        setIgnorePatterns={setIgnorePatterns}
      />
      <TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'github' ? (
        <GitHubTab
          githubUrl={githubUrl}
          setGithubUrl={setGithubUrl}
          githubToken={githubToken}
          setGithubToken={setGithubToken}
          ignorePatterns={ignorePatterns}
          setIgnorePatterns={setIgnorePatterns}
          loading={loading}
          fetchGitHubRepo={fetchGitHubRepo}
          copyDirectoryStructure={copyDirectoryStructure}
          dirStructure={dirStructure}
        />
      ) : (
        <LocalTab
          loading={loading}
          pickLocalFiles={pickLocalFiles}
          pickLocalDirectory={pickLocalDirectory}
          output={output}
          isDragging={isDragging}
          handleDragEnter={handleDragEnter}
          handleDragLeave={handleDragLeave}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputSection: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
});

export default InputSection;