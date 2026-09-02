import { NextRequest } from 'next/server';
import { getGeminiModel } from '@/lib/gemini/client';
import { buildGeminiContents } from '@/lib/gemini/context';
import { executeWebSearch } from '@/lib/tools/web-search';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { ChatMessage, ToolCall, ToolResult } from '@/lib/types/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await req.json();
    const {
      message,
      conversationId: clientConversationId,
      history = [],
    } = body as {
      message: string;
      conversationId?: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(JSON.stringify({ error: 'Message cannot be empty.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check Supabase authentication
    const authResult = await getAuthenticatedUser(req);
    const user = authResult.user;
    const token = authResult.token;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: any) => {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        };

        let finalAssistantText = '';
        const toolCallsExecuted: ToolCall[] = [];
        const toolResultsExecuted: ToolResult[] = [];
        let activeConversationId = clientConversationId;

        try {
          // Initialize or verify conversation in Supabase if authenticated
          if (user && token) {
            const supabase = createServerSupabaseClient(token);
            if (supabase) {
              if (!activeConversationId) {
                // Generate automatic title from first 35 chars of user message
                const title = message.trim().slice(0, 35) + (message.length > 35 ? '...' : '');
                const { data: newConv, error: convError } = await supabase
                  .from('conversations')
                  .insert({
                    user_id: user.id,
                    title,
                  })
                  .select('id')
                  .single();

                if (!convError && newConv) {
                  activeConversationId = newConv.id;
                }
              }

              // Persist the user message
              if (activeConversationId) {
                await supabase.from('messages').insert({
                  conversation_id: activeConversationId,
                  user_id: user.id,
                  role: 'user',
                  content: message.trim(),
                });
              }
            }
          }

          // Build context for Gemini
          const contents = buildGeminiContents(history, message.trim());
          const model = getGeminiModel();

          // Step 1: Initial call to check for tool calls or immediate answer
          const initialResult = await model.generateContent({ contents });
          const candidate = initialResult.response.candidates?.[0];
          const parts = candidate?.content?.parts || [];

          // Inspect parts for function calls (specifically web_search)
          const functionCalls = parts.filter((p) => Boolean(p.functionCall));

          if (functionCalls.length > 0 && functionCalls[0].functionCall) {
            const fCallPart = functionCalls[0] as any;
            const fCall = fCallPart.functionCall;
            const toolName = fCall.name;
            const toolArgs = (fCall.args || {}) as Record<string, any>;
            const searchQuery = String(toolArgs.query || message);

            // Extract thought_signature from candidate parts, functionCall object, or candidate metadata
            const thoughtSignature =
              fCallPart.thought_signature ||
              fCallPart.thoughtSignature ||
              fCall.thought_signature ||
              fCall.thoughtSignature ||
              (candidate?.content as any)?.thought_signature ||
              (candidate?.content as any)?.thoughtSignature ||
              (candidate as any)?.thought_signature ||
              (candidate as any)?.thoughtSignature;

            // Use the captured signature or fallback to skip_thought_signature_validator to prevent 400 Bad Request
            const resolvedSignature = thoughtSignature || 'skip_thought_signature_validator';

            toolCallsExecuted.push({
              name: toolName,
              args: toolArgs,
              thought_signature: resolvedSignature,
            });

            // Notify client that web search has started
            send('status', {
              type: 'status',
              message: `Searching the web for: "${searchQuery}"`,
              tool: toolName,
              query: searchQuery,
            });

            // Execute the web search tool
            let searchResult;
            try {
              searchResult = await executeWebSearch(searchQuery);
            } catch (searchErr: any) {
              searchResult = {
                success: false,
                query: searchQuery,
                error: searchErr?.message || 'Search execution failed.',
                message: 'Live web search failed. Answer using your existing knowledge and note that live results were unavailable.',
              };
            }

            toolResultsExecuted.push({
              name: toolName,
              result: searchResult,
              error: searchResult.success ? undefined : searchResult.error,
            });

            // Feed function call and response back into conversation contents.
            // Preserve original candidate parts and ensure thought_signature is attached to functionCall parts
            const modelParts: any[] = parts.length > 0
              ? parts.map((p: any) => {
                  if (p.functionCall) {
                    const sig =
                      p.thought_signature ||
                      p.thoughtSignature ||
                      p.functionCall?.thought_signature ||
                      p.functionCall?.thoughtSignature ||
                      resolvedSignature;

                    const partCopy: any = { ...p };
                    const fcCopy: any = { ...p.functionCall };

                    if (sig) {
                      partCopy.thought_signature = sig;
                      partCopy.thoughtSignature = sig;
                      fcCopy.thought_signature = sig;
                      fcCopy.thoughtSignature = sig;
                    }

                    partCopy.functionCall = fcCopy;
                    return partCopy;
                  }
                  return p;
                })
              : [
                  {
                    functionCall: {
                      name: toolName,
                      args: toolArgs,
                      thought_signature: resolvedSignature,
                      thoughtSignature: resolvedSignature,
                    },
                    thought_signature: resolvedSignature,
                    thoughtSignature: resolvedSignature,
                  },
                ];

            contents.push({
              role: 'model',
              parts: modelParts,
            });

            contents.push({
              role: 'function',
              parts: [
                {
                  functionResponse: {
                    name: toolName,
                    response: searchResult,
                  },
                },
              ],
            });

            // Step 2: Stream final response synthesized from search results
            send('status', {
              type: 'status',
              message: 'Synthesizing search results...',
              tool: toolName,
            });

            const streamResult = await model.generateContentStream({ contents });
            for await (const chunk of streamResult.stream) {
              const text = chunk.text();
              if (text) {
                finalAssistantText += text;
                send('chunk', { type: 'chunk', content: text });
              }
            }
          } else {
            // No tool call needed; stream directly
            // We already have the full initial result, but to satisfy token streaming
            // or if initial result has text, we stream it or stream a new generator
            const initialText = initialResult.response.text();
            if (initialText) {
              // Stream in natural progressive increments
              const chunkSize = 24;
              for (let i = 0; i < initialText.length; i += chunkSize) {
                const slice = initialText.slice(i, i + chunkSize);
                finalAssistantText += slice;
                send('chunk', { type: 'chunk', content: slice });
                // brief tick for smooth streaming effect
                await new Promise((r) => setTimeout(r, 12));
              }
            }
          }

          // Persist assistant message in Supabase if authenticated
          let savedMessageId: string | undefined;
          if (user && token && activeConversationId && finalAssistantText) {
            const supabase = createServerSupabaseClient(token);
            if (supabase) {
              const { data: savedMsg } = await supabase
                .from('messages')
                .insert({
                  conversation_id: activeConversationId,
                  user_id: user.id,
                  role: 'assistant',
                  content: finalAssistantText,
                  tool_calls: toolCallsExecuted.length > 0 ? toolCallsExecuted : null,
                  tool_results: toolResultsExecuted.length > 0 ? toolResultsExecuted : null,
                })
                .select('id')
                .single();

              if (savedMsg) {
                savedMessageId = savedMsg.id;
              }
            }
          }

          // Emit completion event
          send('done', {
            type: 'done',
            conversationId: activeConversationId,
            messageId: savedMessageId,
            toolCalls: toolCallsExecuted,
          });

          controller.close();
        } catch (streamError: any) {
          console.error('[Chat API Stream Error]:', streamError);

          let userFriendlyMessage = 'An unexpected error occurred while generating the response.';
          const rawMessage = streamError?.message || '';

          if (rawMessage.includes('429') || rawMessage.toLowerCase().includes('quota') || rawMessage.toLowerCase().includes('rate limit')) {
            userFriendlyMessage = 'Gemini API rate limit or quota exceeded. Please wait a few moments and try again.';
          } else if (rawMessage.includes('API_KEY') || rawMessage.toLowerCase().includes('api key')) {
            userFriendlyMessage = 'Invalid or missing Gemini API Key. Please verify GEMINI_API_KEY in your .env.local file.';
          } else if (rawMessage.includes('RESOURCE_EXHAUSTED')) {
            userFriendlyMessage = 'Model resources temporarily exhausted. Please retry in a few seconds.';
          }

          send('error', {
            type: 'error',
            message: userFriendlyMessage,
            details: rawMessage,
          });

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('[Chat API Error]:', err);
    return new Response(
      JSON.stringify({
        error: err?.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
