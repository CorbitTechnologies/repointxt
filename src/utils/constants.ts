export const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.turbo',
  '.cache',

  // Security Credentials & Environment Secrets
  '.env*',
  '*.env.local',
  '*.env.*.local',
  '*.pem',
  '*.key',
  '*.cert',
  '*.crt',
  '*.pfx',
  '*.p12',
  '.npmrc',
  '.yarnrc',
  'id_rsa*',
  'id_ed25519*',

  // Flutter / Mobile Platform Wrappers & Build Caches (keep configuration/manifests, ignore native machine code and generated artifacts)
  '*.g.dart',
  '*.freezed.dart',
  '*.mocks.dart',
  '*.config.dart',
  '.dart_tool',
  'ios/Pods',
  'ios/.symlinks',
  'ios/Runner.xcworkspace',
  'ios/Runner.xcodeproj/project.xcworkspace',
  'ios/Flutter/Flutter.podspec',
  'ios/Flutter/Generated.xcconfig',
  'android/.gradle',
  'android/app/build',
  'android/local.properties',
  'android/gradle',
  'android/gradlew',
  'android/gradlew.bat',
  '.flutter-plugins',
  '.flutter-plugins-dependencies',

  // Framework Caches
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.vercel',
  '.netlify',
  '.expo',
  '.expo-shared',

  // Firebase / Supabase Noise
  '.firebaserc',
  'firestore.indexes.json',
  'firebase-debug.log',
  'firestore-debug.log',

  // Lockfiles & Binaries
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lockb',
  'Cargo.lock',
  'pubspec.lock',
  'poetry.lock',
  'Gemfile.lock',
  'composer.lock',
  'dist',
  'build',
  'target',
  'vendor',
  'bin',
  'obj',
  'coverage',
  'out',
  '.vscode',
  '.idea',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  '*.min.js',
  '*.min.css',
  '*.map',
  '*.pyc',
  '*.pyo',
  '__pycache__',
  '*.wasm',
  '*.dylib',
  '*.so',
  '*.dll',
  '*.class',
  '*.exe',
  '*.dex',
  '*.aar',
  '*.ipa',
  '*.apk',
  '*.ico',
  '*.jpg',
  '*.jpeg',
  '*.png',
  '*.gif',
  '*.svg',
  '*.webp',
  '*.eot',
  '*.ttf',
  '*.woff',
  '*.woff2',
  '*.mp4',
  '*.zip',
  '*.tar.gz',
  '*.pdf'
];

export interface LlmContextLimit {
  /** Token budget; 0 means "no limit". */
  value: number;
  /** Short label for the slider ticks. */
  label: string;
  /** Model hint shown next to the active budget. */
  hint: string;
}

/**
 * Single source of truth for the context-budget slider. The 2M and 128K tiers
 * are retained because `?model=gemini2m` and `?model=gpt4o` still map to them.
 */
export const LLM_CONTEXT_LIMITS: LlmContextLimit[] = [
  { value: 100000, label: '100K', hint: 'Claude Haiku 5.5' },
  { value: 128000, label: '128K', hint: 'GPT-4o / o1 / o3 (legacy)' },
  { value: 200000, label: '200K', hint: 'Claude Agentic' },
  { value: 272000, label: '272K', hint: 'GPT-6 Astra' },
  { value: 500000, label: '500K', hint: 'Deep Context' },
  { value: 1000000, label: '1M', hint: 'Claude 5.5 / Gemini 4 / GPT-6' },
  { value: 2000000, label: '2M', hint: 'Gemini 2M' },
  { value: 0, label: 'Auto', hint: 'No Limit' },
];

/** Budget applied for new installs (labelled "Default" in the marketing copy). */
export const DEFAULT_CONTEXT_TOKENS = 1000000;

export const NON_CODE_EXTENSIONS = new Set([
  '.md', '.txt', '.rst', '.svg', '.png', '.jpg', '.jpeg', '.gif',
  '.pdf', '.doc', '.docx', '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.toml', '.xml', '.env', '.example',
  '.lock', '.map', '.html'
]);
