export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  provider?: string;
  results?: SearchResultItem[];
  error?: string;
  message?: string;
}

/**
 * Searches using Tavily API (https://tavily.com)
 */
async function searchWithTavily(query: string, apiKey: string): Promise<SearchResultItem[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily API responded with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const results: SearchResultItem[] = [];

  if (data.answer) {
    results.push({
      title: 'Direct Summary',
      url: 'https://tavily.com',
      snippet: data.answer,
    });
  }

  if (Array.isArray(data.results)) {
    for (const item of data.results) {
      results.push({
        title: item.title || 'Untitled',
        url: item.url || '',
        snippet: item.content || item.snippet || '',
      });
    }
  }

  return results;
}

/**
 * Searches using Serper API (https://serper.dev)
 */
async function searchWithSerper(query: string, apiKey: string): Promise<SearchResultItem[]> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: 5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Serper API responded with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const results: SearchResultItem[] = [];

  if (data.answerBox?.snippet) {
    results.push({
      title: data.answerBox.title || 'Answer',
      url: data.answerBox.link || '',
      snippet: data.answerBox.snippet,
    });
  }

  if (Array.isArray(data.organic)) {
    for (const item of data.organic) {
      results.push({
        title: item.title || 'Untitled',
        url: item.link || '',
        snippet: item.snippet || '',
      });
    }
  }

  return results;
}

/**
 * Fallback lightweight search using DuckDuckGo Instant Answer API
 */
async function searchWithDuckDuckGo(query: string): Promise<SearchResultItem[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'GeminiChatbot/1.0' },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo responded with status ${response.status}`);
  }

  const data = await response.json();
  const results: SearchResultItem[] = [];

  if (data.AbstractText) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL || 'https://duckduckgo.com',
      snippet: data.AbstractText,
    });
  }

  if (Array.isArray(data.RelatedTopics)) {
    for (const topic of data.RelatedTopics.slice(0, 4)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(' - ')[0] || 'Result',
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
    }
  }

  if (results.length === 0) {
    throw new Error('No DuckDuckGo instant answers found');
  }

  return results;
}

/**
 * Primary web_search tool executor.
 * Tries Tavily -> Serper -> DuckDuckGo fallback.
 * If all fail or no keys are configured, returns a structured failure message
 * instructing Gemini to answer from existing knowledge and note that live results were unavailable.
 */
export async function executeWebSearch(query: string): Promise<SearchResponse> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;

  // 1. Try Tavily
  if (tavilyKey && !tavilyKey.includes('your_tavily')) {
    try {
      const results = await searchWithTavily(query, tavilyKey);
      return {
        success: true,
        query,
        provider: 'Tavily',
        results,
      };
    } catch (err: any) {
      console.warn(`[web_search] Tavily search failed: ${err.message}. Trying next provider...`);
    }
  }

  // 2. Try Serper
  if (serperKey && !serperKey.includes('your_serper')) {
    try {
      const results = await searchWithSerper(query, serperKey);
      return {
        success: true,
        query,
        provider: 'Serper',
        results,
      };
    } catch (err: any) {
      console.warn(`[web_search] Serper search failed: ${err.message}. Trying fallback...`);
    }
  }

  // 3. Try DuckDuckGo Instant Answers as a free zero-key fallback
  try {
    const results = await searchWithDuckDuckGo(query);
    return {
      success: true,
      query,
      provider: 'DuckDuckGo Instant Answer',
      results,
    };
  } catch (err: any) {
    console.warn(`[web_search] DuckDuckGo fallback also unavailable: ${err.message}`);
  }

  // 4. Graceful failure payload for Gemini as required
  return {
    success: false,
    query,
    error: 'Live web search was not available (no active search API key configured or network search failed).',
    message: 'Live web search results were unavailable. Please answer the user\'s question using your existing knowledge, and explicitly inform the user that live search results were not available.',
  };
}
