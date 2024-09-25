// src/chat-append.ts
import fs from "fs/promises";
import { ensureDirectoryExists, getContentFromClipboard, getContentFromSelectedItems, getContentFromSelectedText, openDirectoryAndFile, chatAnyPath, filePath, showErrorHUD } from "./common";

// 主函数
export default async function Command() {
  try {
    // 确保目录存在
    await ensureDirectoryExists(chatAnyPath);

    let text = '';

    // 获取内容
    text = await getContentFromSelectedItems();
    if (!text) {
      text = await getContentFromSelectedText();
    }
    if (!text) {
      text = await getContentFromClipboard();
      if (!text) {
        return await showErrorHUD("没有选中文件、文本，剪贴板也为空");
      }
    }

    // **追加内容到文件**
    try {
      await fs.appendFile(filePath, text, 'utf-8');
    } catch {
      return await showErrorHUD("无法写入文件");
    }

    // 打开目录和文件
    try {
      await openDirectoryAndFile();
    } catch {
      return await showErrorHUD("无法打开应用或执行操作");
    }

  } catch {
    await showErrorHUD("操作失败");
  }
}