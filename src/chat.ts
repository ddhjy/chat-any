import { getSelectedText, showHUD, Clipboard } from "@raycast/api";
import fs from "fs/promises";
import { exec } from "child_process";
import util from "util";
import path from "path";

const execPromise = util.promisify(exec);
const filePath = "/Users/zengkai/Library/Mobile Documents/com~apple~CloudDocs/Ask/content.md";
const directoryPath = path.dirname(filePath);

export default async function Command() {
  try {
    let text;
    try {
      text = await getSelectedText();
    } catch (error) {
      console.error("获取选中文本失败:", error);
      text = null;
    }
    
    if (!text) {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        return await showHUD("没有选中文本，剪贴板也为空");
      }
      text = clipboardText;
    }

    await fs.writeFile(filePath, text);
    await execPromise(`open -a Cursor "${directoryPath}"`);
    await execPromise(`open -a Cursor "${filePath}"`);
    await execPromise(`osascript -e 'tell application "System Events" to keystroke "l" using {command down}'`);

  } catch (error) {
    console.error("操作失败:", error);
    await showHUD("操作失败");
  }
}
