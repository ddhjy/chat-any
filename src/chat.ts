// src/chat.ts
import { handleChatOperation } from "./common";

// 主函数
export default async function Command() {
  await handleChatOperation('write');
}