import { getSelectedText, showHUD, Clipboard, getSelectedFinderItems } from "@raycast/api";
import fs from "fs/promises";
import { exec } from "child_process";
import util from "util";
import path from "path";
import { statSync } from 'fs';
import { homedir } from 'os';

const documentsPath = path.join(homedir(), 'Documents');
const chatAnyPath = path.join(documentsPath, 'Chat Any');
const filePath = path.join(chatAnyPath, 'context.txt');
const directoryPath = chatAnyPath;

// 常见的二进制和媒体文件扩展名
const binaryMediaExtensions = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',
  '.mp3', '.wav', '.flac', '.mp4', '.avi', '.mkv',
  '.exe', '.dll', '.bin', '.iso', '.zip', '.rar', '.xcodeproj', '.xcworkspace'
];

// 需要忽略内容的特定文件和文件夹
const ignoredItems = [
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
];

// 确保目录存在的函数
async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// 检查文件是否为二进制或媒体文件
function isBinaryOrMediaFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return binaryMediaExtensions.includes(ext);
}

// 检查是否为需要忽略内容的项目
function isIgnoredItem(itemName: string): boolean {
  return ignoredItems.includes(itemName);
}

// 递归读取文件夹中的所有文件内容，并包含文件路径，忽略特定文件和文件夹的内容及二进制媒体文件
async function readDirectoryContents(dirPath: string, basePath: string = ''): Promise<string> {
  let content = "";
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);
    const relativePath = path.join(basePath, item.name);

    if (isIgnoredItem(item.name) || isBinaryOrMediaFile(item.name)) {
      content += `文件：${relativePath} (内容已忽略)\n\n`;
    } else if (item.isDirectory()) {
      content += await readDirectoryContents(itemPath, relativePath);
    } else {
      try {
        const fileContent = await fs.readFile(itemPath, 'utf-8');
        content += `文件：${relativePath}\n${fileContent}\n\n`;
      } catch (readError) {
        console.info(`读取文件失败 (${relativePath}):`, readError);
        content += `文件：${relativePath} (读取失败)\n\n`;
      }
    }
  }

  return content;
}

function isDirectory(itemPath: string): boolean {
  try {
    return statSync(itemPath).isDirectory();
  } catch (error) {
    console.info(`检查路径是否为目录时出错: ${error}`);
    return false;
  }
}

function isFile(itemPath: string): boolean {
  try {
    return statSync(itemPath).isFile();
  } catch (error) {
    console.info(`检查路径是否为文件时出错: ${error}`);
    return false;
  }
}

// 在文件顶部的 import 语句下面添加这行
const execPromise = util.promisify(exec);

export default async function Command() {
  try {
    // 确保 Chat Any 目录存在
    await ensureDirectoryExists(chatAnyPath);

    let text = '';

    // 尝试获取选中的Finder项目
    try {
      const selectedItems = await getSelectedFinderItems();

      if (selectedItems.length > 0) {
        for (const item of selectedItems) {
          if (isIgnoredItem(path.basename(item.path))) {
            text += `${item.path} (内容已忽略)\n\n`;
          } else if (isDirectory(item.path)) {
            // 如果是文件夹，读取文件夹中所有文件的内容
            text += await readDirectoryContents(item.path) + '\n\n';
          } else if (isFile(item.path)) {
            if (isBinaryOrMediaFile(item.path)) {
              text += `文件: ${item.path} (二进制或媒体文件，内容已忽略)\n\n`;
            } else {
              try {
                const fileContent = await fs.readFile(item.path, 'utf-8');
                text += `文件: ${item.path}\n${fileContent}\n\n`;
              } catch (readError) {
                console.info(`读取文件失败 (${item.path}):`, readError);
                text += `文件: ${item.path} (读取失败)\n\n`;
              }
            }
          }
        }
      }
    } catch (error) {
      console.info("获取选中的Finder项目失败:", error);
      // 如果获取Finder项目失败，继续执行后续代码
    }

    // 如果没有从Finder获取到内容，尝试获取选中的文本
    if (!text) {
      try {
        text = await getSelectedText();
      } catch (error) {
        console.info("获取选中文本失败:", error);
      }
    }

    // 如果仍然没有内容，则使用剪贴板内容
    if (!text) {
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText) {
          text = clipboardText;
        } else {
          return await showHUD("没有选中文件、文本，剪贴板也为空");
        }
      } catch (clipboardError) {
        console.info("读取剪贴板内容失败:", clipboardError);
        return await showHUD("无法读取剪贴板内容");
      }
    }

    // 将文本内容写入指定文件
    try {
      await fs.writeFile(filePath, text, 'utf-8');
    } catch (writeError) {
      console.info("写入文件失败:", writeError);
      return await showHUD("无法写入文件");
    }

    // 打开目录和文件
    try {
      await execPromise(`open -a Cursor "${directoryPath}"`);
      await execPromise(`open -a Cursor "${filePath}"`);
      // 延迟500毫秒
      await new Promise(resolve => setTimeout(resolve, 500));
      await execPromise(`osascript -e 'tell application "System Events" to keystroke "l" using {command down}'`);
    } catch (execError) {
      console.info("打开应用或模拟按键失败:", execError);
      return await showHUD("无法打开应用或执行操作");
    }

  } catch (error) {
    console.info("操作失败:", error);
    await showHUD("操作失败");
  }
}