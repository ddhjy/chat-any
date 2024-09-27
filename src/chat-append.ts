// src/chat-append.ts
import { handleChatOperation } from "./common";

// 主函数
export default async function Command() {
  await handleChatOperation('append');
}