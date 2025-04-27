/**
 * @file common.ts
 * @description Provides common utility functions and core logic for the Chat Any Raycast extension.
 * This includes functions for file system operations, content retrieval (Finder, selection, clipboard),
 * text processing, and interacting with the specified editor application.
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import {
  getSelectedFinderItems,
  getSelectedText,
  Clipboard,
  showHUD,
  LocalStorage,
  getPreferenceValues,
} from '@raycast/api';
import { promisify } from 'util';
import { exec } from 'child_process';

// Constants
const DOCUMENTS_PATH = path.join(homedir(), 'Documents'); // Path to the user's Documents directory.
const CHAT_ANY_PATH = path.join(DOCUMENTS_PATH, 'Chat Any'); // Directory to store the context file.
const FILE_PATH = path.join(CHAT_ANY_PATH, 'context.md'); // Path to the context markdown file.
const DIRECTORY_PATH = CHAT_ANY_PATH; // Path to the directory containing the context file.

const LAST_CURSOR_OPEN_TIME_KEY = 'lastCursorOpenTime'; // LocalStorage key for tracking the last editor open time.

// Sets for file filtering
/** Set of file extensions considered as binary or media files, which should be ignored for content reading. */
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

/** Array of regex patterns for file/directory names that should be ignored during processing. */
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
 * Recursively reads the contents of a directory, formatting the output.
 * It includes a header, directory structure, and the content of each non-ignored file.
 * Uses '===' separators for different sections.
 * @param dirPath - The directory path to read.
 * @param basePath - The base path to prepend for relative paths within the output. Defaults to ''.
 * @returns A promise that resolves to a string representing the formatted directory contents.
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
 * Recursively builds a string representation of the directory structure, ignoring specified items.
 * @param dirPath - The directory path to generate the structure for.
 * @param basePath - The base path to prepend for relative paths. Defaults to ''.
 * @returns A promise that resolves to a string representing the directory structure, with indentation.
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

/**
 * Recursively counts the number of non-ignored, non-binary files within a directory or returns 1 if it's a single valid file.
 * @param itemPath - The path of the directory or file to count files in.
 * @returns A promise that resolves to the total count of relevant files.
 */
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
 * Retrieves and formats content from the items currently selected in Finder.
 * Handles both files and directories, ignoring specified patterns and binary files.
 * The output includes a file count, overall structure, and detailed contents.
 * @returns A promise that resolves to a string containing the combined and formatted content, or an empty string if no items are selected or an error occurs.
 */
export async function getContentFromSelectedItems(): Promise<string> {
  const contentParts: string[] = [];
  try {
    const selectedItems = await getSelectedFinderItems().catch(() => []);

    if (selectedItems.length === 0) {
      return '';
    }

    // Count total files
    let totalFiles = 0;
    for (const item of selectedItems) {
      if (!isIgnoredItem(path.basename(item.path))) {
        totalFiles += await countFiles(item.path);
      }
    }

    // Add file count information at the beginning
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
 * Defines the structure for user preferences retrieved from Raycast settings.
 */
interface Preferences {
  /** The selected editor application preference. */
  customEditor?: { name: string; path: string };
}

/**
 * Opens the target directory and context file (`context.md`) in the user-specified editor application.
 * Implements logic to avoid reopening the editor too frequently for 'append' operations.
 * - If the operation is 'write', it always opens the editor.
 * - If the operation is 'append':
 *   - If the editor hasn't been opened in the last 10 minutes, it behaves like 'write' (resetting context).
 *   - If the editor was opened more than 1 minute ago, it reopens the editor and file.
 *   - If the editor was opened within the last minute, it only shows a HUD notification.
 * - If the editor is 'Cursor' and it's an 'append' operation that reopens the editor, it attempts
 *   to scroll to the bottom using AppleScript.
 * @param operation - The type of operation: 'write' (overwrite context) or 'append' (add to context).
 * @throws Will throw an error if opening the application or executing AppleScript fails.
 */
export async function openDirectoryAndFile(operation: 'write' | 'append'): Promise<void> {
  const execPromise = promisify(exec);
  const currentTime = Date.now();
  const preferences = getPreferenceValues<Preferences>();
  const editorApp = preferences.customEditor?.name || 'Cursor';

  try {
    const lastOpenTimeString = await LocalStorage.getItem(LAST_CURSOR_OPEN_TIME_KEY);
    const lastOpenTime = lastOpenTimeString ? parseInt(lastOpenTimeString as string, 10) : 0;

    // Check if more than 10 minutes have passed
    if (currentTime - lastOpenTime > 600000) {
      operation = 'write';
    }

    if (operation === 'write' || currentTime - lastOpenTime > 60000) {
      // If it's a 'write' operation or more than a minute since last open, open the editor;
      await execPromise(`open -a "${editorApp}" "${DIRECTORY_PATH}" -g "${FILE_PATH}"`);
      await LocalStorage.setItem(LAST_CURSOR_OPEN_TIME_KEY, currentTime.toString());

      if (operation === 'append' && editorApp === 'Cursor') {
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
 * Main handler function for both 'Chat' and 'Chat Append' commands.
 * It ensures the target directory exists, retrieves content (prioritizing Finder selection,
 * then selected text, then clipboard), writes or appends the content to the `context.md` file,
 * and finally opens the file/directory in the configured editor.
 * @param operation - The operation mode: 'write' to overwrite the file, or 'append' to add to it.
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
        await fs.appendFile(FILE_PATH, `\n\n\n${text}`, 'utf-8');
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