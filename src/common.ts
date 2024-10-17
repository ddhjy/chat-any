// src/common.ts
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import {
  getSelectedFinderItems,
  getSelectedText,
  Clipboard,
  showHUD,
  LocalStorage
} from '@raycast/api';
import { promisify } from 'util';
import { exec } from 'child_process';

// Constants
const DOCUMENTS_PATH = path.join(homedir(), 'Documents');
const CHAT_ANY_PATH = path.join(DOCUMENTS_PATH, 'Chat Any');
const FILE_PATH = path.join(CHAT_ANY_PATH, 'context.txt');
const DIRECTORY_PATH = CHAT_ANY_PATH;

const LAST_CURSOR_OPEN_TIME_KEY = "lastCursorOpenTime";

// Sets for file filtering
const BINARY_MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',
  '.mp3', '.wav', '.flac', '.mp4', '.avi', '.mkv',
  '.exe', '.dll', '.bin', '.iso', '.zip', '.rar',
  '.xcodeproj', '.xcworkspace', '.tiktoken'
]);

const IGNORED_PATTERNS = [
  // Regular ignore items
  /^(node_modules|dist|build|coverage|tmp|logs|public|assets|vendor)$/,
  
  // Hidden files and directories
  /^\..+/,
  
  // Specific files
  /^(package-lock\.json|yarn\.lock)$/,
  
  // IDE related
  /^\.vscode$/,
  /^\.idea$/,
  
  // Environment files
  /^\.env(\.local)?$/,
  
  // Cache directories
  /^\.cache$/,
  
  // Other common ignore items
  /^(bower_components|jspm_packages)$/,
  
  // macOS specific files
  /^\.DS_Store$/
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
  return IGNORED_PATTERNS.some(pattern => pattern.test(itemName));
}

/**
 * Determines if a given path is a directory.
 * @param itemPath - The path to check.
 * @returns True if the path is a directory, otherwise false.
 */
export async function isDirectory(itemPath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(itemPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Determines if a given path is a file.
 * @param itemPath - The path to check.
 * @returns True if the path is a file, otherwise false.
 */
export async function isFile(itemPath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(itemPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Recursively reads the contents of a directory.
 * @param dirPath - The directory path to read.
 * @param basePath - The base path for relative paths.
 * @returns A string representing the directory contents.
 */
export async function readDirectoryContents(dirPath: string, basePath: string = ''): Promise<string> {
  let content = "";
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemName = item.name;
      const itemPath = path.join(dirPath, itemName);
      const relativePath = path.join(basePath, itemName);

      if (isIgnoredItem(itemName) || isBinaryOrMediaFile(itemName)) {
        content += `文件：${relativePath} (内容已忽略)\n\n`;
      } else if (item.isDirectory()) {
        content += await readDirectoryContents(itemPath, relativePath);
      } else {
        try {
          const fileContent = await fs.readFile(itemPath, 'utf-8');
          content += `文件：${relativePath}\n${fileContent}\n\n`;
        } catch {
          content += `文件：${relativePath} (读取失败)\n\n`;
        }
      }
    }
  } catch (error) {
    console.error(`读取目录失败: ${dirPath}`, error);
    content += `目录：${dirPath} (读取失败)\n\n`;
  }

  return content;
}

/**
 * Retrieves content from the selected Finder items.
 * @returns A string containing the combined content.
 */
export async function getContentFromSelectedItems(): Promise<string> {
  let content = '';
  try {
    const selectedItems = await getSelectedFinderItems();

    for (const item of selectedItems) {
      const itemName = path.basename(item.path);
      const itemPath = item.path;

      if (isIgnoredItem(itemName)) {
        content += `${itemPath} (内容已忽略)\n\n`;
      } else if (await isDirectory(itemPath)) {
        content += await readDirectoryContents(itemPath) + '\n\n';
      } else if (await isFile(itemPath)) {
        if (isBinaryOrMediaFile(itemPath)) {
          content += `文件：${itemPath} (二进制或媒体文件，内容已忽略)\n\n`;
        } else {
          try {
            const fileContent = await fs.readFile(itemPath, 'utf-8');
            content += `文件：${itemPath}\n${fileContent}\n\n`;
          } catch {
            content += `文件：${itemPath} (读取失败)\n\n`;
          }
        }
      }
    }
  } catch (error) {
    console.error('获取选中 Finder 项目失败', error);
    // 返回空字符串，已在外层处理错误
  }
  return content;
}

/**
 * Retrieves content from the selected text.
 * @returns A string containing the selected text.
 */
export async function getContentFromSelectedText(): Promise<string> {
  try {
    return await getSelectedText();
  } catch (error) {
    console.error('获取选中文本失败', error);
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
    console.error('获取剪贴板内容失败', error);
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

    // 检查是否超过10分钟
    if (currentTime - lastOpenTime > 600000) {
      operation = 'write';
    }

    if (operation === 'write' || currentTime - lastOpenTime > 60000) {
      // 如果是 'write' 操作或者距离上次打开超过一分钟，则打开 Cursor
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
      // 如果是 'append' 操作且在一分钟内已经打开过，只显示提示
      await showHUD("Append 成功");
    }
  } catch (error) {
    console.error('打开目录或文件失败', error);
    throw new Error('无法打开应用或执行操作');
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
    console.error('显示 HUD 失败', error);
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
        await showErrorHUD("没有选中文件、文本，剪贴板也为空");
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
      console.error('写入文件失败', error);
      await showErrorHUD("无法写入文件");
      return;
    }

    try {
      await openDirectoryAndFile(operation);
    } catch (error) {
      await showErrorHUD("无法打开应用或执行操作");
    }
  } catch (error) {
    console.error('操作失败', error);
    await showErrorHUD("操作失败");
  }
}
