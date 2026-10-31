import { useState, useCallback, useRef, useEffect } from 'react';
import { shouldIgnore, smartSelectFiles } from '../utils/fileHelpers';
import { getJSZip } from '../utils/jszip';
import { sanitizeArchivePath } from '../services/githubService';
import { trackEvent } from '../services/telemetry';
import { Source, FileItem, ProcessingOptionsState } from '../types';

export interface UseLocalIngestParams {
  options: ProcessingOptionsState;
  setSources: React.Dispatch<React.SetStateAction<Source[]>>;
  setOutputBatches: React.Dispatch<React.SetStateAction<any[]>>;
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (msg: string) => void;
  packWorkerRef: React.RefObject<Worker | null>;
}

export const useLocalIngest = ({
  options,
  setSources,
  setOutputBatches,
  setLoading,
  setLoadingMessage,
  packWorkerRef,
}: UseLocalIngestParams) => {
  const [isDragging, setIsDragging] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  const createTrackedBlobUrl = useCallback((file: Blob | File) => {
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.push(url);
    return url;
  }, []);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (_) {}
      });
      blobUrlsRef.current = [];
    };
  }, []);

  const pickLocalDirectory = useCallback(async (isAdding = false) => {
    if (!(window as any).showDirectoryPicker) {
      return window.alert("Directory picker is not supported in this browser. Please use 'Select Files' or Drag & Drop.");
    }
    setLoading(true);
    setLoadingMessage('Scanning directory...');
    if (!isAdding) { setSources([]); setOutputBatches([]); }

    try {
      const handle = await (window as any).showDirectoryPicker();
      const files: any[] = [];

      const read = async (dirHandle: any, path = '') => {
        for await (const entry of dirHandle.values()) {
          const entryPath = path ? `${path}/${entry.name}` : entry.name;
          if (entry.kind === 'directory') {
            if (!shouldIgnore(entryPath, options.ignorePatterns)) {
              await read(entry, entryPath);
            }
          } else if (entry.kind === 'file') {
            if (!shouldIgnore(entryPath, options.ignorePatterns)) {
              const fileObj = await entry.getFile();
              if (fileObj.size <= Number(options.maxFileSize) * 1024) {
                files.push({
                  path: entryPath,
                  originalPath: entryPath,
                  size: fileObj.size,
                  file: fileObj
                });
              }
            }
          }
        }
      };

      await read(handle);

      const sourceId = `loc-${Date.now()}`;
      const treeItems: FileItem[] = files.map((f, i) => ({
        ...f,
        type: 'blob' as const,
        sha: `loc-${Date.now()}-${i}`,
        sourceId
      }));

      const newSource: Source = {
        id: sourceId,
        type: 'local',
        name: handle.name,
        tree: treeItems,
        selectedFiles: smartSelectFiles(treeItems)
      };

      setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [options.ignorePatterns, options.maxFileSize, setLoading, setLoadingMessage, setOutputBatches, setSources]);

  const pickLocalFiles = useCallback(async (isAdding = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.onchange = async (e: any) => {
      setLoading(true);
      setLoadingMessage('Loading files...');
      if (!isAdding) { setSources([]); setOutputBatches([]); }

      try {
        const selected = Array.from(e.target.files || []) as File[];
        const sourceId = `files-${Date.now()}`;
        const files: FileItem[] = selected
          .filter(f => !shouldIgnore(f.name, options.ignorePatterns))
          .map((f, i) => ({
            path: f.name,
            originalPath: f.name,
            type: 'blob',
            size: f.size,
            file: f,
            sha: `file-${Date.now()}-${i}`,
            sourceId
          }));

        const newSource: Source = {
          id: sourceId,
          type: 'local',
          name: 'Files Batch',
          tree: files,
          selectedFiles: smartSelectFiles(files)
        };

        setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    };
    input.click();
  }, [options.ignorePatterns, setLoading, setLoadingMessage, setOutputBatches, setSources]);

  const processDroppedItems = useCallback(async (dataTransfer: DataTransfer) => {
    setIsDragging(false);
    setLoading(true);
    setLoadingMessage('Reading dropped files & folders...');

    try {
      const items = dataTransfer.items;
      const collectedFiles: Array<{ path: string; file: File; size: number }> = [];

      const readEntry = async (entry: any, currentPath = ''): Promise<void> => {
        if (!entry) return;
        const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        if (shouldIgnore(entryPath, options.ignorePatterns)) return;

        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            entry.file((f: File) => {
              if (f.size <= Number(options.maxFileSize) * 1024) {
                collectedFiles.push({ path: entryPath, file: f, size: f.size });
              }
              resolve();
            }, () => resolve());
          });
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          const readEntriesBatch = async (): Promise<any[]> => {
            return new Promise((resolve) => {
              dirReader.readEntries((entries: any[]) => resolve(entries), () => resolve([]));
            });
          };

          let batch: any[];
          do {
            batch = await readEntriesBatch();
            for (const child of batch) {
              await readEntry(child, entryPath);
            }
          } while (batch.length > 0);
        }
      };

      if (items && items.length > 0 && typeof (items[0] as any).webkitGetAsEntry === 'function') {
        for (let i = 0; i < items.length; i++) {
          const entry = (items[i] as any).webkitGetAsEntry();
          if (entry) {
            await readEntry(entry);
          }
        }
      } else if (dataTransfer.files && dataTransfer.files.length > 0) {
        for (const f of Array.from(dataTransfer.files)) {
          const p = (f as any).webkitRelativePath || f.name;
          if (!shouldIgnore(p, options.ignorePatterns) && f.size <= Number(options.maxFileSize) * 1024) {
            collectedFiles.push({ path: p, file: f, size: f.size });
          }
        }
      }

      const finalTreeItems: FileItem[] = [];
      const sourceId = `drop-${Date.now()}`;
      let folderName = 'Dropped Items';

      for (const item of collectedFiles) {
        if (item.file.name.toLowerCase().endsWith('.zip')) {
          setLoadingMessage(`Extracting ZIP archive: ${item.file.name}...`);
          try {
            // Attempt offloading unzipping to Web Worker first
            if (packWorkerRef.current) {
              const taskId = `unzip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              const workerPromise = new Promise<{ path: string; size: number; content: string }[]>((resolve, reject) => {
                const handler = (evt: MessageEvent) => {
                  if (evt.data && evt.data.id === taskId) {
                    packWorkerRef.current?.removeEventListener('message', handler);
                    if (evt.data.type === 'UNZIP_ARCHIVE_SUCCESS') {
                      resolve(evt.data.files);
                    } else {
                      reject(new Error(evt.data.error || 'Unzip failed'));
                    }
                  }
                };
                packWorkerRef.current?.addEventListener('message', handler);
                packWorkerRef.current?.postMessage({
                  type: 'UNZIP_ARCHIVE',
                  id: taskId,
                  file: item.file,
                  maxFileSize: Number(options.maxFileSize),
                });
              });

              const extracted = await workerPromise;
              folderName = item.file.name.replace(/\.zip$/i, '');
              for (const exFile of extracted) {
                if (shouldIgnore(exFile.path, options.ignorePatterns)) continue;
                const fileObj = new File([exFile.content], exFile.path.split('/').pop() || 'file', { type: 'text/plain' });
                finalTreeItems.push({
                  path: exFile.path,
                  originalPath: exFile.path,
                  type: 'blob',
                  size: exFile.size,
                  file: fileObj,
                  sha: `zip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  sourceId,
                });
              }
            } else {
              // Main thread fallback
              const JSZip = await getJSZip();
              const zip = await JSZip.loadAsync(item.file);
              folderName = item.file.name.replace(/\.zip$/i, '');
              const zipPromises: Promise<void>[] = [];
              zip.forEach((relPath, zipEntry) => {
                const cleanRelPath = sanitizeArchivePath(relPath);
                if (!cleanRelPath || zipEntry.dir || shouldIgnore(cleanRelPath, options.ignorePatterns)) return;

                zipPromises.push(
                  zipEntry.async('blob').then(blob => {
                    if (blob.size <= Number(options.maxFileSize) * 1024) {
                      const fileObj = new File([blob], cleanRelPath.split('/').pop() || 'file', { type: blob.type });
                      finalTreeItems.push({
                        path: cleanRelPath,
                        originalPath: cleanRelPath,
                        type: 'blob',
                        size: blob.size,
                        file: fileObj,
                        sha: `zip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        sourceId
                      });
                    }
                  })
                );
              });
              await Promise.all(zipPromises);
            }
          } catch (zipErr) {
            console.warn('Failed to parse as ZIP archive, treating as standard file', zipErr);
            finalTreeItems.push({
              path: item.path,
              originalPath: item.path,
              type: 'blob',
              size: item.size,
              file: item.file,
              sha: `file-${Date.now()}-${finalTreeItems.length}`,
              sourceId
            });
          }
        } else {
          finalTreeItems.push({
            path: item.path,
            originalPath: item.path,
            type: 'blob',
            size: item.size,
            file: item.file,
            sha: `file-${Date.now()}-${finalTreeItems.length}`,
            sourceId
          });
        }
      }

      if (finalTreeItems.length > 0) {
        const sample = finalTreeItems[0].path;
        if (sample.includes('/')) {
          const rootDir = sample.split('/')[0];
          if (finalTreeItems.every(f => f.path.startsWith(`${rootDir}/`))) {
            folderName = rootDir;
          }
        }

        const newSource: Source = {
          id: sourceId,
          type: 'local',
          name: folderName,
          tree: finalTreeItems,
          selectedFiles: smartSelectFiles(finalTreeItems)
        };

        setSources(prev => [...prev, newSource]);
        trackEvent('drop_files_success', { fileCount: finalTreeItems.length });
      }
    } catch (err) {
      console.error('Drop processing error', err);
      window.alert('Failed to process dropped files.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [options.ignorePatterns, options.maxFileSize, packWorkerRef, setLoading, setLoadingMessage, setSources]);

  return {
    isDragging, setIsDragging,
    pickLocalDirectory, pickLocalFiles, processDroppedItems,
    blobUrlsRef,
  };
};
