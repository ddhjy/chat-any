import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import {
  getSelectedFinderItems,
  getSelectedText,
  Clipboard,
  showHUD,
  LocalStorage,
} from '@raycast/api';
import { promisify } from 'util';
import { exec } from 'child_process';

// Constants
const DOCUMENTS_PATH = path.join(homedir(), 'Documents');
const CHAT_ANY_PATH = path.join(DOCUMENTS_PATH, 'Chat Any');
const FILE_PATH = path.join(CHAT_ANY_PATH, 'context.md');
const DIRECTORY_PATH = CHAT_ANY_PATH;

const LAST_CURSOR_OPEN_TIME_KEY = 'lastCursorOpenTime';

// Sets for file filtering
const BINARY_MEDIA_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.tiff',
  '.mp3',
  '.wav',
  '.flac',
  '.mp4',
  '.avi',
  '.mkv',
  '.exe',
  '.dll',
  '.bin',
  '.iso',
  '.zip',
  '.rar',
  '.xcodeproj',
  '.xcworkspace',
  '.tiktoken',
]);

const IGNORED_PATTERNS = [
  /^(node_modules|dist|build|coverage|tmp|logs|public|assets|vendor)$/,
  /^\..+/,
  /^(package-lock\.json|yarn\.lock)$/,
  /^\.vscode$/,
  /^\.idea$/,
  /^\.env(\.local)?$/,
  /^\.cache$/,
  /^(bower_components|jspm_packages)$/,
  /^\.DS_Store$/,
];

// Utility Functions

/**
 * Ensures that a directory exists. If it does not, creates it recursively.
 * @param dirPath - The path of the directory to ensure.
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Checks if a file is a binary or media file based on its extension.
 * @param fileName - The name of the file to check.
 * @returns True if the file is binary or media, otherwise false.
 */
export function isBinaryOrMediaFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return BINARY_MEDIA_EXTENSIONS.has(ext);
}

/**
 * Checks if an item should be ignored based on its name.
 * @param itemName - The name of the item to check.
 * @returns True if the item is to be ignored, otherwise false.
 */
export function isIgnoredItem(itemName: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(itemName));
}

/**
 * Determines the type of a given path.
 * @param itemPath - The path to check.
 * @returns 'directory', 'file', or 'other'.
 */
export async function getFileType(itemPath: string): Promise<'directory' | 'file' | 'other'> {
  try {
    const stats = await fs.lstat(itemPath);
    if (stats.isDirectory()) return 'directory';
    if (stats.isFile()) return 'file';
  } catch {
    // Ignore errors
  }
  return 'other';
}

/**
 * Recursively reads the contents of a directory.
 * @param dirPath - The directory path to read.
 * @param basePath - The base path for relative paths.
 * @returns A string representing the directory contents.
 */
export async function readDirectoryContents(
  dirPath: string,
  basePath = '',
): Promise<string> {
  const contentParts: string[] = [];

  // Add repository summary header with directory name
  contentParts.push(`This is a merged representation of: ${dirPath}\n===\n`);

  try {
    // Add directory structure section
    contentParts.push('Directory Structure\n===\n');
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    // Add current directory as root
    contentParts.push(`${path.basename(dirPath)}/`);

    // First pass: Build directory structure
    for (const item of items) {
      if (!isIgnoredItem(item.name)) {
        const relativePath = path.join(basePath, item.name);
        // Add indentation for better hierarchy visualization
        contentParts.push(`  ${item.isDirectory() ? `${relativePath}/` : relativePath}`);
      }
    }

    // Add files content section
    contentParts.push('\n===\nFile Contents\n===\n');

    // Second pass: Add file contents
    const readPromises = items.map(async (item) => {
      const itemName = item.name;
      const itemPath = path.join(dirPath, itemName);
      const relativePath = path.join(basePath, itemName);

      if (isIgnoredItem(itemName) || isBinaryOrMediaFile(itemName)) {
        contentParts.push(`File: ${relativePath} (content ignored)\n`);
      } else if (item.isDirectory()) {
        const dirContent = await readDirectoryContents(itemPath, relativePath);
        contentParts.push(dirContent);
      } else {
        try {
          const fileContent = await fs.readFile(itemPath, 'utf-8');
          contentParts.push(`File: ${relativePath}\n${fileContent}\n`);
        } catch {
          contentParts.push(`File: ${relativePath} (read failed)\n`);
        }
      }
    });

    await Promise.all(readPromises);
  } catch (error) {
    console.error(`Failed to read directory: ${dirPath}`, error);
    contentParts.push(`Directory: ${dirPath} (read failed)\n`);
  }

  return contentParts.join('\n');
}

/**
 * Recursively builds the directory structure.
 * @param dirPath - The directory path to read.
 * @param basePath - The base path for relative paths.
 * @returns A string representing the directory structure.
 */
async function getDirectoryStructure(dirPath: string, basePath = ''): Promise<string> {
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  const structureParts: string[] = [];

  for (const item of items) {
    if (!isIgnoredItem(item.name)) {
      const relativePath = path.join(basePath, item.name);
      if (item.isDirectory()) {
        structureParts.push(`${relativePath}/`);
        const subDirStructure = await getDirectoryStructure(
          path.join(dirPath, item.name),
          relativePath,
        );
        structureParts.push(subDirStructure);
      } else {
        structureParts.push(relativePath);
      }
    }
  }
  return structureParts.map((line) => `  ${line}`).join('\n');
}

// 新增的辅助函数，用于统计文件数量
async function countFiles(itemPath: string): Promise<number> {
  let count = 0;
  const fileType = await getFileType(itemPath);
  
  if (fileType === 'directory') {
    const items = await fs.readdir(itemPath, { withFileTypes: true });
    for (const item of items) {
      const subPath = path.join(itemPath, item.name);
      if (!isIgnoredItem(item.name)) {
        count += await countFiles(subPath);
      }
    }
  } else if (fileType === 'file' && !isBinaryOrMediaFile(itemPath)) {
    count = 1;
  }
  
  return count;
}

/**
 * Retrieves content from the selected Finder items.
 * @returns A string containing the combined content.
 */
export async function getContentFromSelectedItems(): Promise<string> {
  const contentParts: string[] = [];
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      return '';
    }

    // 统计文件总数
    let totalFiles = 0;
    for (const item of selectedItems) {
      if (!isIgnoredItem(path.basename(item.path))) {
        totalFiles += await countFiles(item.path);
      }
    }
    
    // 在最前面添加文件统计信息
    contentParts.push(`Total Files: ${totalFiles}\n`);

    // Add overall summary header
    contentParts.push('This is a merged representation of selected items:\n===\n');

    // Add overall directory structure section
    contentParts.push('Overall Directory Structure\n===\n');
    const structureParts: string[] = [];

    for (const item of selectedItems) {
      const itemPath = item.path;
      const itemName = path.basename(itemPath);
      const fileType = await getFileType(itemPath);
      const relativePath = itemName;

      if (isIgnoredItem(itemName)) {
        continue;
      }

      if (fileType === 'directory') {
        structureParts.push(`${relativePath}/`);
        const dirStructure = await getDirectoryStructure(itemPath, relativePath);
        structureParts.push(dirStructure);
      } else if (fileType === 'file') {
        structureParts.push(relativePath);
      }
    }

    contentParts.push(structureParts.join('\n'));

    // Add detailed contents section
    contentParts.push('\n===\nDetailed Contents\n===\n');

    const readPromises = selectedItems.map(async (item) => {
      const itemName = path.basename(item.path);
      const itemPath = item.path;

      if (isIgnoredItem(itemName)) {
        contentParts.push(`${itemPath} (content ignored)\n`);
        return;
      }

      const fileType = await getFileType(itemPath);

      if (fileType === 'directory') {
        const dirContent = await readDirectoryContents(itemPath, itemName);
        contentParts.push(dirContent);
      } else if (fileType === 'file') {
        if (isBinaryOrMediaFile(itemPath)) {
          contentParts.push(`File: ${itemName} (binary or media file, content ignored)\n`);
        } else {
          try {
            const fileContent = await fs.readFile(itemPath, 'utf-8');
            contentParts.push(`File: ${itemName}\n${fileContent}\n`);
          } catch {
            contentParts.push(`File: ${itemName} (read failed)\n`);
          }
        }
      }
    });

    await Promise.all(readPromises);
  } catch (error) {
    console.error('Failed to get selected Finder items', error);
  }
  return contentParts.join('\n');
}

/**
 * Retrieves content from the selected text.
 * @returns A string containing the selected text.
 */
export async function getContentFromSelectedText(): Promise<string> {
  try {
    return await getSelectedText();
  } catch (error) {
    console.error('Failed to get selected text', error);
    return '';
  }
}

/**
 * Retrieves content from the clipboard.
 * @returns A string containing the clipboard text.
 */
export async function getContentFromClipboard(): Promise<string> {
  try {
    const clipboardText = await Clipboard.readText();
    return clipboardText || '';
  } catch (error) {
    console.error('Failed to get clipboard content', error);
    return '';
  }
}

/**
 * Opens the specified directory and file, then simulates a key press.
 */
export async function openDirectoryAndFile(operation: 'write' | 'append'): Promise<void> {
  const execPromise = promisify(exec);
  const currentTime = Date.now();

  try {
    const lastOpenTimeString = await LocalStorage.getItem(LAST_CURSOR_OPEN_TIME_KEY);
    const lastOpenTime = lastOpenTimeString ? parseInt(lastOpenTimeString as string, 10) : 0;

    // Check if more than 10 minutes have passed
    if (currentTime - lastOpenTime > 600000) {
      operation = 'write';
    }

    if (operation === 'write' || currentTime - lastOpenTime > 60000) {
      // If it's a 'write' operation or more than a minute since last open, open Cursor
      await execPromise(`open -a Cursor "${DIRECTORY_PATH}"`);
      await execPromise(`open -a Cursor "${FILE_PATH}"`);
      await LocalStorage.setItem(LAST_CURSOR_OPEN_TIME_KEY, currentTime.toString());

      if (operation === 'append') {
        const appleScript = `
          tell application "Cursor"
            activate
            tell application "System Events"
              key code 125 using {command down}
            end tell
          end tell
        `;
        await execPromise(`osascript -e '${appleScript}'`);
      }
    } else {
      // If it's an 'append' operation and opened within a minute, just show a notification
      await showHUD('Append successful');
    }
  } catch (error) {
    console.error('Failed to open directory or file', error);
    throw new Error('Unable to open application or perform operation');
  }
}

/**
 * Displays an error message using HUD.
 * @param message - The message to display.
 */
export async function showErrorHUD(message: string): Promise<void> {
  try {
    await showHUD(message);
  } catch (error) {
    console.error('Failed to show HUD', error);
  }
}

// Main Operation Function

/**
 * Handles chat operations by writing or appending content.
 * @param operation - The type of operation: 'write' or 'append'.
 */
export async function handleChatOperation(operation: 'write' | 'append'): Promise<void> {
  try {
    await ensureDirectoryExists(CHAT_ANY_PATH);

    let text = await getContentFromSelectedItems();
    if (!text) {
      text = await getContentFromSelectedText();
    }
    if (!text) {
      text = await getContentFromClipboard();
      if (!text) {
        await showErrorHUD('No files or text selected, and clipboard is empty');
        return;
      }
    }

    try {
      if (operation === 'write') {
        await fs.writeFile(FILE_PATH, text, 'utf-8');
      } else {
        await fs.appendFile(FILE_PATH, `\n\n${text}`, 'utf-8');
      }
    } catch (error) {
      console.error('Failed to write to file', error);
      await showErrorHUD('Unable to write to file');
      return;
    }

    try {
      await openDirectoryAndFile(operation);
    } catch (error) {
      await showErrorHUD('Unable to open application or perform operation');
    }
  } catch (error) {
    console.error('Operation failed', error);
    await showErrorHUD('Operation failed');
  }
}