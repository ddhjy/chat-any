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
  showToast,
  Toast,
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

      if (isIgnoredItem(itemName)) {
        contentParts.push(`File: ${relativePath} (content ignored)\n`);
      } else if (isBinaryOrMediaFile(itemName)) {
        contentParts.push(`File: ${relativePath} (binary or media file, content ignored)\n`);
      } else if (item.isDirectory()) {
        const dirContent = await readDirectoryContents(itemPath, relativePath);
        contentParts.push(dirContent);
      } else {
        try {
          const fileContent = await fs.readFile(itemPath, 'utf-8');
          contentParts.push(`File: ${relativePath}\n${fileContent}\n`);
        } catch (error) {
          console.error(`Failed to read file in dir ${dirPath}: ${relativePath}`);
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
  let totalFiles = 0;

  try {
    const selectedItems = await getSelectedFinderItems().catch(() => []);

    if (selectedItems.length === 0) {
      return '';
    }

    // Count total files
    const countPromises = selectedItems.map(item => {
      if (!isIgnoredItem(path.basename(item.path))) {
        return countFiles(item.path);
      }
      return Promise.resolve(0);
    });
    const fileCounts = await Promise.all(countPromises);
    totalFiles = fileCounts.reduce((sum, count) => sum + count, 0);

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
          } catch (error) {
            console.error(`Failed to read file: ${itemPath}`, error);
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
 * Retrieves content from the selected text with timeout.
 * @param timeout - Timeout in milliseconds
 * @returns A string containing the selected text, or empty string if timeout or error.
 */
export async function getContentFromSelectedTextWithTimeout(timeout = 500): Promise<string> {
  try {
    // 创建一个带超时的Promise
    const textPromise = getSelectedText();
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error("获取选中文本超时")), timeout);
    });

    // 使用 Promise.race 竞争，谁先完成就返回谁的结果
    const text = await Promise.race([textPromise, timeoutPromise]);
    return text;
  } catch (error) {
    if (!(error instanceof Error && error.message === "获取选中文本超时")) {
      console.error('Failed to get selected text', error);
    }
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
      await execPromise(`open -a "${editorApp}" "${DIRECTORY_PATH}" "${FILE_PATH}"`);
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
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "处理中...",
  });

  try {
    // 1. 确保目录存在
    await ensureDirectoryExists(CHAT_ANY_PATH);

    // 2. 先启动打开编辑器的过程（如果是append且最近打开过，则不重新打开）
    let shouldOpenEditor = true;
    if (operation === 'append') {
      const lastOpenTimeString = await LocalStorage.getItem(LAST_CURSOR_OPEN_TIME_KEY);
      const lastOpenTime = lastOpenTimeString ? parseInt(lastOpenTimeString as string, 10) : 0;
      const currentTime = Date.now();

      // 如果在过去1分钟内打开过，则不重新打开
      if (currentTime - lastOpenTime <= 60000) {
        shouldOpenEditor = false;
      }
    }

    // 异步启动编辑器打开操作
    let editorPromise: Promise<void> | null = null;
    if (shouldOpenEditor) {
      // 立即创建一个空文件（如果不存在），以便编辑器有内容可打开
      if (operation === 'write') {
        try {
          // 检查文件是否存在，不存在则创建
          await fs.access(FILE_PATH).catch(() => fs.writeFile(FILE_PATH, '', 'utf-8'));
        } catch (error) {
          console.error('Failed to create initial file:', error);
        }
      }

      // 异步打开编辑器，不等待完成
      editorPromise = (async () => {
        try {
          await openDirectoryAndFile(operation);
          toast.title = "编辑器已打开";
          toast.message = "正在处理内容...";
        } catch (error) {
          console.error('Failed to open editor:', error);
        }
      })();
    }

    // 3. 同时开始获取内容
    let text = '';
    let source = 'unknown'; // 记录内容来源

    // 3.1 先检查 Finder 选中项
    text = await getContentFromSelectedItems();
    if (text) {
      source = 'Finder Items';
    } else {
      // 3.2 然后检查选中文本（使用带超时的版本）
      text = await getContentFromSelectedTextWithTimeout(500); // 超时时间设为500ms

      if (text) {
        source = 'Selected Text';
      } else {
        // 3.3 最后才检查剪贴板
        text = await getContentFromClipboard();

        if (text) {
          source = 'Clipboard';
        } else {
          await showErrorHUD('没有选中文件或文本，剪贴板也为空');
          toast.style = Toast.Style.Failure;
          toast.title = "失败";
          toast.message = "未找到内容。";

          // 如果已经启动了编辑器打开过程，等待它完成
          if (editorPromise) {
            await editorPromise.catch(() => { });
          }

          return;
        }
      }
    }

    // 4. 内容写入文件
    try {
      if (operation === 'write') {
        await fs.writeFile(FILE_PATH, text, 'utf-8');
      } else {
        // 添加换行符以分隔追加的内容
        await fs.appendFile(FILE_PATH, `\n\n===\n\n${text}`, 'utf-8');
      }

      // 如果是append且已打开编辑器，尝试滚动到底部
      if (operation === 'append' && shouldOpenEditor) {
        try {
          const preferences = getPreferenceValues<Preferences>();
          const editorApp = preferences.customEditor?.name || 'Cursor';

          if (editorApp === 'Cursor') {
            const execPromise = promisify(exec);
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
        } catch (error) {
          console.error('Failed to scroll editor:', error);
        }
      }

      // 5. 等待编辑器打开完成（如果还在进行中）
      if (editorPromise) {
        await editorPromise.catch(error => {
          console.error('Editor opening process failed:', error);
        });
      } else if (!shouldOpenEditor && operation === 'append') {
        // 如果没有重新打开编辑器但执行了追加操作，显示通知
        await showHUD('内容已追加');
      }

      toast.style = Toast.Style.Success;
      toast.title = "成功";
      toast.message = `已处理来自${source}的内容。`;
    } catch (error) {
      console.error('Failed to write to file', error);
      await showErrorHUD('无法写入文件');
      toast.style = Toast.Style.Failure;
      toast.title = "失败";
      toast.message = "无法写入文件。";

      // 如果已经启动了编辑器打开过程，等待它完成
      if (editorPromise) {
        await editorPromise.catch(() => { });
      }

      return;
    }
  } catch (error) {
    console.error('Operation failed', error);
    await showErrorHUD('操作失败');
    toast.style = Toast.Style.Failure;
    toast.title = "操作失败";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}