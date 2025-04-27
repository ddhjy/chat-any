/**
 * @file chat-append.ts
 * @description Entry point for the 'Chat Append' command in the Raycast extension.
 * This command collects selected content (Finder items, text, or clipboard)
 * and appends it to the existing `context.md` file.
 */

import { handleChatOperation } from "./common";

/**
 * Raycast command function that initiates the 'append' operation.
 * It calls the common handler function to gather content and append it to the context file.
 */
export default async function Command() {
  await handleChatOperation('append');
}