import { handleChatOperation } from "./common";

export default async function Command() {
  await handleChatOperation('write');
}