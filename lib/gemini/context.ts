import { Content, Part } from '@google/generative-ai';
import { ChatMessage } from '../types/chat';

const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CHARS = 40000;

/**
 * Summarizes truncated older messages into a brief context note.
 */
function createHistorySummary(olderMessages: ChatMessage[]): string {
  const topics = olderMessages
    .slice(0, 8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 100).replace(/\n/g, ' ')}...`)
    .join('; ');

  return `[Context Note: Truncated ${olderMessages.length} earlier messages to stay within context budget. Earlier dialogue summary: ${topics}]`;
}

/**
 * Prepares and formats conversation history for the Gemini API.
 * Ensures:
 * 1. Messages alternate cleanly between 'user' and 'model'.
 * 2. Sliding window truncation if message count or character budget is exceeded.
 * 3. Context summary injection if messages are truncated.
 * 4. Includes the latest user message as the final turn.
 */
export function buildGeminiContents(
  history: ChatMessage[],
  latestUserPrompt: string
): Content[] {
  let messages = [...history];

  // If history exceeds message threshold, truncate older ones and summarize
  let summaryNote = '';
  if (messages.length > MAX_HISTORY_MESSAGES) {
    const olderMessages = messages.slice(0, messages.length - MAX_HISTORY_MESSAGES);
    summaryNote = createHistorySummary(olderMessages);
    messages = messages.slice(-MAX_HISTORY_MESSAGES);
  }

  // Check character budget
  let totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  while (messages.length > 2 && totalChars > MAX_HISTORY_CHARS) {
    const removed = messages.shift();
    if (removed) {
      totalChars -= removed.content.length;
      if (!summaryNote) {
        summaryNote = `[Context Note: Earlier messages were truncated to stay within context budget.]`;
      }
    }
  }

  const contents: Content[] = [];

  // If we truncated earlier messages, inject summary into the first retained user message
  let summaryInjected = false;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const role = msg.role === 'user' ? 'user' : 'model';

    let textContent = msg.content;
    if (summaryNote && !summaryInjected && role === 'user') {
      textContent = `${summaryNote}\n\n${textContent}`;
      summaryInjected = true;
    }

    if (textContent && textContent.trim()) {
      const part: Part = { text: textContent };

      // Gemini requires strictly alternating roles (user -> model -> user -> model)
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts.push(part);
      } else {
        contents.push({ role, parts: [part] });
      }
    }
  }

  // Now append latest user turn
  const finalUserContent = summaryNote && !summaryInjected
    ? `${summaryNote}\n\n${latestUserPrompt}`
    : latestUserPrompt;

  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts.push({ text: finalUserContent });
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: finalUserContent }],
    });
  }

  return contents;
}
