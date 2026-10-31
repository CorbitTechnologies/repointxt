import JSZip from 'jszip';
import { optimizeContent } from '../utils/textOptimizer';
import { sanitizeArchivePath } from '../services/githubService';

export interface UnzipRequest {
  type: 'UNZIP_ARCHIVE';
  id: string;
  file: File | Blob;
  maxFileSize: number;
}

export interface UnzipFileResult {
  path: string;
  size: number;
  content: string;
}

export interface UnzipResponse {
  type: 'UNZIP_ARCHIVE_SUCCESS';
  id: string;
  files: UnzipFileResult[];
}

export interface OptimizeRequest {
  type: 'OPTIMIZE_CONTENT';
  id: string;
  content: string;
  filePath: string;
  options: {
    removeComments?: boolean;
    removeExtraWhitespace?: boolean;
  };
}

export interface OptimizeResponse {
  type: 'OPTIMIZE_CONTENT_SUCCESS';
  id: string;
  result: {
    content: string;
    redactedSecretsCount: number;
  };
}

export interface ErrorResponse {
  type: 'ERROR';
  id: string;
  error: string;
}

self.onmessage = async (e: MessageEvent<UnzipRequest | OptimizeRequest>) => {
  const data = e.data;
  if (!data) return;

  if (data.type === 'UNZIP_ARCHIVE') {
    try {
      const zip = await JSZip.loadAsync(data.file);
      const files: UnzipFileResult[] = [];
      const promises: Promise<void>[] = [];

      zip.forEach((relPath, entry) => {
        const cleanRelPath = sanitizeArchivePath(relPath);
        if (!cleanRelPath || entry.dir) return;

        promises.push(
          entry.async('text').then(text => {
            const size = (entry as any)._data?.uncompressedSize || text.length;
            if (size <= data.maxFileSize * 1024) {
              files.push({
                path: cleanRelPath,
                size,
                content: text
              });
            }
          })
        );
      });

      await Promise.all(promises);
      const response: UnzipResponse = {
        type: 'UNZIP_ARCHIVE_SUCCESS',
        id: data.id,
        files
      };
      self.postMessage(response);
    } catch (err: any) {
      const response: ErrorResponse = {
        type: 'ERROR',
        id: data.id,
        error: err instanceof Error ? err.message : String(err)
      };
      self.postMessage(response);
    }
  } else if (data.type === 'OPTIMIZE_CONTENT') {
    try {
      const result = optimizeContent(data.content, data.filePath, data.options);
      const response: OptimizeResponse = {
        type: 'OPTIMIZE_CONTENT_SUCCESS',
        id: data.id,
        result
      };
      self.postMessage(response);
    } catch (err: any) {
      const response: ErrorResponse = {
        type: 'ERROR',
        id: data.id,
        error: err instanceof Error ? err.message : String(err)
      };
      self.postMessage(response);
    }
  }
};
