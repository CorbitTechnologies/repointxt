export type SourceType = 'github' | 'local';

export interface FileItem {
  path: string;
  originalPath: string;
  name?: string;
  size?: number;
  type: 'blob' | 'tree';
  sha?: string;
  sourceId: string;
  sourceName?: string;
  sourceType?: SourceType;
  sourceOwner?: string;
  sourceRepo?: string;
  sourceBranch?: string;
  file?: File;
  url?: string;
  level?: number;
}

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  owner?: string;
  repo?: string;
  branch?: string;
  tree: FileItem[];
  selectedFiles: FileItem[];
}

export interface PromptBatch {
  part: number;
  totalParts: number;
  text: string;
  tokenCount: number;
  charCount: number;
  elapsedMs?: number;
}

export interface ProcessingOptionsState {
  removeComments: boolean;
  removeExtraWhitespace: boolean;
  maxContextTokens: number;
  maxFileSize: number;
  ignorePatterns: string;
}
