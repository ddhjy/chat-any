// src/common.ts
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import { getSelectedFinderItems, getSelectedText, Clipboard, showHUD } from '@raycast/api';
import util from 'util';
import { exec } from 'child_process';

// 路径设置
export const documentsPath = path.join(homedir(), 'Documents');
export const chatAnyPath = path.join(documentsPath, 'Chat Any');
export const filePath = path.join(chatAnyPath, 'context.txt');
export const directoryPath = chatAnyPath;

// 常见的二进制和媒体文件扩展名
export const binaryMediaExtensions = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',
  '.mp3', '.wav', '.flac', '.mp4', '.avi', '.mkv',
  '.exe', '.dll', '.bin', '.iso', '.zip', '.rar', '.xcodeproj', '.xcworkspace'
]);

// 需要忽略的文件和文件夹
export const ignoredItems = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.DS_Store',
  'package-lock.json',
  'yarn.lock',
  'coverage',
  'tmp',
  'logs',
  '.vscode',
  '.idea',
  '.env',
  '.env.local',
  '.cache',
  'public',
  'assets',
  'vendor',
  'bower_components',
  'jspm_packages'
]);

// 确保目录存在
export async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// 检查文件是否为二进制或媒体文件
export function isBinaryOrMediaFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return binaryMediaExtensions.has(ext);
}

// 检查是否为忽略的项目
export function isIgnoredItem(itemName: string): boolean {
  return ignoredItems.has(itemName);
}

// 异步检查路径是否为目录
export async function isDirectory(itemPath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(itemPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// 异步检查路径是否为文件
export async function isFile(itemPath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(itemPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

// 递归读取目录内容
export async function readDirectoryContents(dirPath: string, basePath: string = ''): Promise<string> {
  let content = "";
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

  return content;
}

// 获取选中 Finder 项目的内容
export async function getContentFromSelectedItems(): Promise<string> {
  let content = '';
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length > 0) {
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
    }
  } catch {
    // 忽略错误，返回空字符串
  }
  return content;
}

// 获取选中文本的内容
export async function getContentFromSelectedText(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    return '';
  }
}

// 获取剪贴板的内容
export async function getContentFromClipboard(): Promise<string> {
  try {
    return (await Clipboard.readText()) || '';
  } catch {
    return '';
  }
}

// 打开目录和文件，并模拟按键
export async function openDirectoryAndFile() {
  const execPromise = util.promisify(exec);
  await execPromise(`open -a Cursor "${directoryPath}"`);
  await execPromise(`open -a Cursor "${filePath}"`);
  await new Promise(resolve => setTimeout(resolve, 500));
  await execPromise(`osascript -e 'tell application "System Events" to keystroke "l" using {command down}'`);
}

// 显示 HUD 信息
export async function showErrorHUD(message: string) {
  await showHUD(message);
}