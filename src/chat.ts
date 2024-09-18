import { getSelectedText, showHUD, Clipboard, getSelectedFinderItems } from "@raycast/api";
import fs from "fs/promises";
import { exec } from "child_process";
import util from "util";
import path from "path";
import { statSync } from 'fs';

const execPromise = util.promisify(exec);
const filePath = "/Users/zengkai/Library/Mobile Documents/com~apple~CloudDocs/Ask/content.md";
const directoryPath = path.dirname(filePath);

// 修改函数：递归读取文件夹中的所有文件内容，并包含文件路径，忽略 .git 目录
async function readDirectoryContents(dirPath: string, basePath: string = ''): Promise<string> {
  let content = "";
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    // 忽略 .git 目录
    if (item.isDirectory() && item.name === '.git') {
      continue;
    }

    const itemPath = path.join(dirPath, item.name);
    const relativePath = path.join(basePath, item.name);
    if (item.isDirectory()) {
      content += await readDirectoryContents(itemPath, relativePath);
    } else {
      content += `文件: ${relativePath}\n`;
      content += await fs.readFile(itemPath, 'utf-8') + "\n\n";
    }
  }

  return content;
}

function isDirectory(itemPath: string): boolean {
  try {
    return statSync(itemPath).isDirectory();
  } catch (error) {
    console.error(`检查路径是否为目录时出错: ${error}`);
    return false;
  }
}

function isFile(itemPath: string): boolean {
  try {
    return statSync(itemPath).isFile();
  } catch (error) {
    console.error(`检查路径是否为文件时出错: ${error}`);
    return false;
  }
}

export default async function Command() {
  try {
    let text = '';

    // 尝试获取选中的Finder项目
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length > 0) {
      for (const item of selectedItems) {
        if (isDirectory(item.path)) {
          // 如果是文件夹，读取文件夹中所有文件的内容
          text += await readDirectoryContents(item.path) + '\n\n';
        } else if (isFile(item.path)) {
          // 如果是单个文件，读取文件内容
          text += await fs.readFile(item.path, 'utf-8') + '\n\n';
        }
      }
    } else {
      // 如果没有选中文件，尝试获取选中的文本
      try {
        text = await getSelectedText();
      } catch (error) {
        console.error("获取选中文本失败:", error);
        text = '';
      }

      // 如果没有选中文本，则使用剪贴板内容
      if (!text) {
        const clipboardText = await Clipboard.readText();
        if (!clipboardText) {
          return await showHUD("没有选中文件或文本，剪贴板也为空");
        }
        text = clipboardText;
      }
    }

    // 将文本内容写入指定文件
    await fs.writeFile(filePath, text);
    await execPromise(`open -a Cursor "${directoryPath}"`);
    await execPromise(`open -a Cursor "${filePath}"`);
    // delay 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    await execPromise(`osascript -e 'tell application "System Events" to keystroke "l" using {command down}'`);

  } catch (error) {
    console.error("操作失败:", error);
    await showHUD("操作失败");
  }
}
