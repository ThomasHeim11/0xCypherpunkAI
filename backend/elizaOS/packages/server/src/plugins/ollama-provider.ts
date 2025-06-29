import { IAgentRuntime, ModelType, Plugin } from '@elizaos/core';
import axios, { AxiosInstance } from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

// Create HTTP agents with keep-alive for connection pooling
const httpAgent = new HttpAgent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
});

const httpsAgent = new HttpsAgent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
});

// (All runtime configuration now pulled from runtime.getSetting at runtime)

interface OllamaConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  connectionPoolSize: number;
  streamingEnabled: boolean;
}

interface OllamaRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
    repeat_penalty?: number;
    num_ctx?: number;
  };
}

/**
 * Ultra-fast Ollama Provider with connection pooling and streaming
 */
class OptimizedOllamaProvider {
  private client: AxiosInstance;
  private config: OllamaConfig;

  constructor(private runtime: IAgentRuntime) {
    this.config = {
      baseUrl: this.runtime.getSetting('OLLAMA_HOST') || 'http://127.0.0.1:11434',
      timeout: parseInt(this.runtime.getSetting('OLLAMA_TIMEOUT') || '300000', 10),
      maxRetries: 3,
      connectionPoolSize: 20,
      streamingEnabled: true,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      httpAgent,
      httpsAgent,
    });

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          console.warn('Ollama request timeout, retrying with extended timeout...');
          // Retry with longer timeout for complex queries
          return this.retryWithExtendedTimeout(error.config);
        }
        throw error;
      }
    );
  }

  private async retryWithExtendedTimeout(originalConfig: any) {
    const extendedClient = axios.create({
      ...originalConfig,
      timeout: this.config.timeout * 2, // Double the timeout
    });
    return extendedClient.request(originalConfig);
  }

  async generateText(request: OllamaRequest): Promise<string> {
    const startTime = Date.now();

    try {
      // Optimize request parameters for speed and quality
      const optimizedRequest: OllamaRequest = {
        ...request,
        stream: false, // Disable streaming for faster simple responses
        options: {
          temperature: 0.1, // Lower temperature for more focused responses
          top_p: 0.9,
          top_k: 40,
          num_predict: 2048, // Limit response length for speed
          num_ctx: 8192, // Larger context window
          repeat_penalty: 1.1,
          ...request.options,
        },
      };

      const response = await this.client.post('/api/generate', optimizedRequest);

      const duration = Date.now() - startTime;
      console.log(`✅ Ollama response generated in ${duration}ms`);

      return response.data.response || '';
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Ollama generation failed after ${duration}ms:`, error.message);
      throw new Error(`Ollama generation failed: ${error.message}`);
    }
  }

  async generateEmbedding(text: string, model?: string): Promise<number[]> {
    const startTime = Date.now();
    const embeddingModel =
      model || this.runtime.getSetting('OLLAMA_EMBEDDING_MODEL') || 'mxbai-embed-large';

    try {
      // Gracefully handle the special null check from the runtime
      if (text === null) {
        // This is a check from the runtime to get model dimensions, return an empty array of the correct size if known
        // or just an empty array.
        console.warn(
          'Ollama embedding received null text, likely a model dimension check. Returning empty array.'
        );
        return [];
      }

      // Optimize text for embedding (truncate if too long)
      const optimizedText = text.length > 2000 ? text.substring(0, 2000) + '...' : text;

      const response = await this.client.post('/api/embeddings', {
        model: embeddingModel,
        prompt: optimizedText,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Ollama embedding generated in ${duration}ms`);

      return response.data.embedding || [];
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Ollama embedding failed after ${duration}ms:`, error.message);
      throw new Error(`Ollama embedding failed: ${error.message}`);
    }
  }
}

// Ultra-fast Ollama plugin with optimized model handlers
export const ollamaPlugin: Plugin = {
  name: '@elizaos/plugin-ollama-provider',
  description: 'Provides models and embeddings from a local Ollama server.',

  // This plugin now only provides model handlers, not services.
  services: [],

  models: {
    [ModelType.TEXT_LARGE]: async (runtime: IAgentRuntime, params: any) => {
      const provider = new OptimizedOllamaProvider(runtime);
      const model = runtime.getSetting('OLLAMA_CHAT_MODEL') || 'deepseek-r1:8b';

      return provider.generateText({
        model,
        prompt: params.prompt,
        system: params.system,
        options: {
          temperature: params.temperature || 0.1,
          num_predict: params.maxTokens || 2048,
        },
      });
    },

    [ModelType.TEXT_SMALL]: async (runtime: IAgentRuntime, params: any) => {
      const provider = new OptimizedOllamaProvider(runtime);
      const model = runtime.getSetting('OLLAMA_CHAT_MODEL') || 'deepseek-r1:8b';

      return provider.generateText({
        model,
        prompt: params.prompt,
        system: params.system,
        options: {
          temperature: params.temperature || 0.1,
          num_predict: params.maxTokens || 1024, // Smaller for TEXT_SMALL
        },
      });
    },

    [ModelType.TEXT_EMBEDDING]: async (runtime: IAgentRuntime, params: any) => {
      // Handle the case where params might be null or undefined
      if (!params || params.text === null) {
        // This is a check from the runtime, often to get model dimensions.
        // It's safe to return an empty array.
        return [];
      }
      const provider = new OptimizedOllamaProvider(runtime);
      const model = runtime.getSetting('OLLAMA_EMBEDDING_MODEL') || 'mxbai-embed-large';
      return provider.generateEmbedding(params.text, model);
    },
  },

  priority: 100, // High priority to override default providers

  async init(_config: Record<string, string>, _runtime: IAgentRuntime) {
    // Initialization logic can go here if needed.
  },
};

export default ollamaPlugin;
