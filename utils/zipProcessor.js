import { shouldIgnore, isImageFile, isBinaryFile } from './fileHelpers';

/**
 * Check if a file is a ZIP file
 * @param {string} filename - The filename to check
 * @returns {boolean}
 */
export const isZipFile = (filename) => {
    return filename.toLowerCase().endsWith('.zip');
};

/**
 * Extract files from a ZIP archive
 * Note: ZIP extraction is currently disabled due to bundler compatibility issues
 * ZIP files will be skipped for now
 * @param {File|ArrayBuffer} zipData - The ZIP file or ArrayBuffer
 * @param {string} zipName - Name of the ZIP file (for path prefixing)
 * @param {string} ignorePatterns - Comma-separated ignore patterns
 * @returns {Promise<Array>} Array of { file, path } objects (empty for now)
 */
export const extractZipFile = async (zipData, zipName, ignorePatterns = '') => {
    // ZIP extraction temporarily disabled due to bundler compatibility
    // Will be re-enabled in a future update
    console.log('ZIP extraction is temporarily disabled:', zipName);
    return [];
};
