# repo2txt

A React Native application (Web + Android) that converts GitHub repositories and local directories into a single text file optimized for Large Language Models (LLMs).

## Features

- 🌐 **Multi-Platform**: Works on Web and Android (React Native + Expo)
- 🔗 **GitHub Integration**: Fetch repositories using GitHub API (supports private repos with token)
- 📁 **Smart Filtering**: Automatically ignores `node_modules`, `.git`, build folders, and more
- 🤖 **LLM-Optimized**: 
  - Remove code comments to reduce tokens
  - Strip extra whitespace
  - Filter to code files only
  - Set max file size limits
  - Token count estimation
- 📊 **Directory Structure**: Instantly view repository structure
- 📋 **Copy to Clipboard**: One-click copy of entire output
- 📱 **Responsive Design**: Simple, clean interface that works on all screen sizes

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yazz0dev/repo2txt.git
cd repo2txt
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Run on Web
```bash
npm run web
```

### Run on Android
```bash
npm run android
```

### Start Development Server
```bash
npm start
```

## How to Use

1. **Enter GitHub URL**: Paste the full GitHub repository URL (e.g., `https://github.com/owner/repo`)
2. **GitHub Token** (Optional): Add a personal access token for private repositories
3. **Configure Ignore Patterns**: Customize which files/folders to exclude (comma-separated)
4. **LLM Enhancement Options**:
   - ✅ Remove comments - Strip out code comments to save tokens
   - ✅ Remove extra whitespace - Clean up excessive blank lines
   - ✅ Include only code files - Filter to programming files only
   - Set max file size limit (in KB)
5. **Fetch Repository**: Click to process the repository
6. **View Results**: See statistics (characters, estimated tokens, lines)
7. **Copy to Clipboard**: Copy the entire output for use with LLMs

## Default Ignore Patterns

The following patterns are ignored by default:
- `node_modules`
- `.git`, `.expo`, `.expo-shared`
- `dist`, `build`, `coverage`
- `.next`, `out`, `.cache`
- `.vscode`, `.idea`
- `*.log`, `*.lock`
- `package-lock.json`, `yarn.lock`
- `.DS_Store`, `thumbs.db`

## LLM Optimization

The app includes several features to optimize output for LLMs:

1. **Token Estimation**: Rough estimate of token count (1 token ≈ 4 characters)
2. **Comment Removal**: Removes single-line (`//`, `#`) and multi-line (`/* */`) comments
   - Note: Uses pattern matching; may occasionally affect strings containing comment-like patterns
3. **Whitespace Optimization**: Removes trailing spaces and excessive blank lines
4. **File Type Filtering**: Option to include only recognized code files
5. **Size Limits**: Skip large files to stay within LLM context windows
6. **Binary File Detection**: Automatically skips binary and non-text files

## Supported File Types

When "Include only code files" is enabled, the following extensions are included:
- JavaScript/TypeScript: `.js`, `.jsx`, `.ts`, `.tsx`
- Python: `.py`
- Java: `.java`
- C/C++: `.c`, `.cpp`, `.h`, `.hpp`
- C#: `.cs`
- Ruby: `.rb`
- Go: `.go`
- Rust: `.rs`
- PHP: `.php`
- Swift: `.swift`
- Kotlin: `.kt`
- Scala: `.scala`
- Shell: `.sh`, `.bash`
- Web: `.html`, `.css`, `.scss`, `.sass`, `.vue`
- Config: `.json`, `.xml`, `.yaml`, `.yml`, `.toml`
- Other: `.sql`, `.r`, `.m`, `.dart`, `.lua`

## GitHub API Rate Limits

- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5,000 requests/hour

Use a GitHub personal access token to increase rate limits and access private repositories.

## Future Enhancements

- Export to file (download as .txt)
- Batch processing multiple repositories
- Custom formatting templates
- Advanced filtering rules (regex patterns)
- Diff view between repository versions
- Syntax highlighting in preview
- Progress indicator for large repositories

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for any purpose.

## Author

Created by yazz0dev