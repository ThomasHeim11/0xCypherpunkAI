import { Service, IAgentRuntime, logger, ModelType } from '@elizaos/core';
import fs from 'fs/promises';
import path from 'path';

export interface AuditReport {
  id: string;
  source: string;
  filePath: string;
  content?: string;
  embedding?: number[];
  metadata: {
    title?: string;
    contract?: string;
    platform?: string;
    date?: string;
    tags?: string[];
    severity?: string;
    category?: string;
    cve?: string;
  };
}

/**
 * 🧠 Ultra-Fast Knowledge Base Service for RAG
 * Loads and processes 46,000+ audit reports with maximum speed optimizations.
 */
export class KnowledgeBaseService extends Service {
  public static serviceType = 'KNOWLEDGE_BASE';

  // Shared static cache across all instances with streaming support
  private static sharedReports = new Map<string, AuditReport>();
  private static isSharedInitialized = false;
  private static initializationPromise: Promise<void> | null = null;
  private static loadingProgress = { loaded: 0, total: 0, phase: 'starting' };

  private reports = new Map<string, AuditReport>();
  private isInitialized = false;

  // Performance optimization constants
  private static readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB max per file
  private static readonly CONCURRENCY_LIMIT = 1; // Reduced from 3 to prevent memory exhaustion
  private static readonly BATCH_SIZE = 100; // Process files in smaller batches
  private static readonly BATCH_PAUSE_MS = 500; // Add small pauses between batches

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  /**
   * Static start method following ElizaOS service pattern
   */
  static async start(runtime: IAgentRuntime): Promise<Service> {
    const service = new KnowledgeBaseService(runtime);
    // Initialize RAG immediately on startup for fastest scanning performance
    logger.info('🧠 Knowledge Base Service starting - ultra-fast RAG initialization...');
    await service.initialize();
    logger.info(
      '✅ Knowledge Base Service fully initialized and ready for lightning-fast scanning'
    );
    return service;
  }

  /**
   * Static stop method
   */
  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService<KnowledgeBaseService>(KnowledgeBaseService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    logger.info('🧠 Knowledge Base Service stopped');
    this.reports.clear();
  }

  /**
   * Get current loading progress for monitoring
   */
  static getLoadingProgress(): {
    loaded: number;
    total: number;
    phase: string;
    percentage: number;
  } {
    const { loaded, total, phase } = KnowledgeBaseService.loadingProgress;
    const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
    return { loaded, total, phase, percentage };
  }

  private async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing ultra-fast RAG knowledge base...');

      // Use shared initialization if available
      if (KnowledgeBaseService.isSharedInitialized) {
        this.reports = KnowledgeBaseService.sharedReports;
        this.isInitialized = true;
        logger.info(
          `✅ RAG Knowledge Base initialized from shared cache with ${this.reports.size} reports.`
        );
        return;
      }

      // If initialization is in progress, wait for it
      if (KnowledgeBaseService.initializationPromise) {
        await KnowledgeBaseService.initializationPromise;
        this.reports = KnowledgeBaseService.sharedReports;
        this.isInitialized = true;
        logger.info(
          `✅ RAG Knowledge Base initialized from shared cache with ${this.reports.size} reports.`
        );
        return;
      }

      // Start fresh ultra-fast initialization
      KnowledgeBaseService.initializationPromise = this.initializeUltraFastKnowledgeBase();
      await KnowledgeBaseService.initializationPromise;

      logger.info(
        `✅ Ultra-fast RAG Knowledge Base initialized with ${this.reports.size} reports.`
      );
    } catch (error) {
      logger.error('❌ Failed to initialize RAG knowledge base:', error);
      KnowledgeBaseService.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Ultra-fast initialization with streaming, batching, and parallel processing
   */
  private async initializeUltraFastKnowledgeBase(): Promise<void> {
    const startTime = Date.now();
    logger.info('🚀 Starting ultra-fast knowledge base loading...');

    try {
      // Connect to the database with a robust retry mechanism
      const db = await this.getDbConnection();
      if (db) {
        // FASTEST PATH: Load existing embeddings from database first (instant)
        const dbLoadedCount = await this.loadFromDatabaseEmbeddings(db);
        logger.info(`⚡ Phase 1: Loaded ${dbLoadedCount} reports with embeddings from database`);
      } else {
        logger.error('❌ Could not establish database connection. Proceeding without it.');
      }

      // NEW: Try loading from file cache before loading from filesystem
      const cacheLoadedCount = await this.loadFromFileCache();
      if (cacheLoadedCount > 0) {
        logger.info(
          `⚡ Phase 1.5: Loaded ${cacheLoadedCount} reports with embeddings from file cache`
        );
      }

      // PHASE 2: Load reports from files, starting with the consolidated one
      await this.loadAllReportsFromFileSystem();

      // PHASE 3: This step is now handled within loadAllReportsFromFileSystem
      // await this.precomputeEmbeddingsUltraFast();

      // Copy to instance cache
      this.reports = KnowledgeBaseService.sharedReports;

      // Mark as initialized
      KnowledgeBaseService.isSharedInitialized = true;
      this.isInitialized = true;

      const duration = Date.now() - startTime;
      logger.info(
        `✅ ULTRA-FAST hybrid load: ${
          this.reports.size
        } total reports in cache after loading in ${duration}ms.`
      );
    } catch (error) {
      logger.error('❌ Failed to initialize ultra-fast knowledge base:', error);
      throw error;
    }
  }

  /**
   * Gets the database connection, waiting up to 30 seconds for it to be available.
   */
  private async getDbConnection(): Promise<any> {
    // Access the Drizzle database instance from the runtime
    let db: any = (this.runtime as any).db;
    if (db) {
      return db;
    }

    logger.info('Waiting for database connection...');
    let attempts = 0;
    while (!(this.runtime as any).db && attempts < 150) {
      // Wait 200ms for up to ~30 seconds
      await new Promise((resolve) => setTimeout(resolve, 200));
      attempts++;
    }

    db = (this.runtime as any).db;
    if (!db) {
      logger.error('Database connection not available after 30 seconds.');
      return null;
    }

    logger.info('✅ Database connection established.');
    return db;
  }

  /**
   * Loads reports from the database.
   */
  private async loadFromDatabaseEmbeddings(db: any): Promise<number> {
    try {
      logger.info('⚡ ULTRA-FAST: Loading existing embeddings from database...');

      // Check if we have embeddings in database
      const countResult = await db.query(
        "SELECT COUNT(*) as count FROM embeddings e JOIN memories m ON e.memory_id = m.id WHERE m.metadata->>'type' = 'knowledge'"
      );

      const count = Number(countResult.rows?.[0]?.count || 0);
      if (count === 0) {
        logger.info('📊 No existing embeddings found - skipping database loading');
        return 0;
      }

      logger.info(`⚡ Found ${count} existing embeddings - loading from database...`);

      // Load all embeddings with their content in one query
      const embeddingsResult = await db.query(`
        SELECT 
          m.id,
          m.content,
          m.created_at,
          COALESCE(
            e.dim_384,
            e.dim_512, 
            e.dim_768,
            e.dim_1024,
            e.dim_1536,
            e.dim_3072
          ) as embedding
        FROM memories m
        JOIN embeddings e ON e.memory_id = m.id
        WHERE m.metadata->>'type' = 'knowledge' 
          AND e.memory_id IS NOT NULL
        ORDER BY m.created_at DESC
        LIMIT 50000
      `);

      const rows = embeddingsResult.rows || [];
      logger.info(`⚡ Processing ${rows.length} database records...`);

      let loadedCount = 0;

      for (const row of rows) {
        try {
          const memoryContent = row.content;
          const embedding = row.embedding;

          if (!memoryContent || !embedding) continue;

          // Parse the memory content
          let reportData;
          if (typeof memoryContent === 'string') {
            try {
              reportData = JSON.parse(memoryContent);
            } catch {
              reportData = { text: memoryContent };
            }
          } else {
            reportData = memoryContent;
          }

          const reportId = reportData.metadata?.reportId || reportData.source;

          // Avoid duplicates
          if (KnowledgeBaseService.sharedReports.has(reportId)) {
            continue;
          }

          const report: AuditReport = {
            id: reportId,
            source: reportData.source,
            filePath: reportData.filePath,
            content: reportData.text,
            embedding: embedding as number[],
            metadata: reportData.metadata,
          };

          // Store in memory without the content to save RAM
          const { content: _, ...reportForMemory } = report;
          KnowledgeBaseService.sharedReports.set(report.id, reportForMemory);
          loadedCount++;
        } catch (parseError) {
          logger.warn('Failed to parse a memory record from database:', parseError);
        }
      }

      logger.info(`⚡ Successfully loaded ${loadedCount} reports from database.`);
      return loadedCount;
    } catch (error) {
      logger.error('❌ Failed to load from database embeddings:', error);
      return 0; // Don't block initialization if DB fails
    }
  }

  /**
   * Loads all reports from the file system, trying the consolidated file first.
   */
  private async loadAllReportsFromFileSystem(): Promise<void> {
    // Directly perform ultra-fast directory scan of individual report files
    await this.loadAllReportsUltraFast();
  }

  /**
   * Ultra-fast directory traversal and file processing
   */
  private async loadAllReportsUltraFast(): Promise<void> {
    logger.info('🚀 Starting memory-optimized directory scan...');
    const startTime = Date.now();
    const reportsPath = path.join(
      process.cwd(),
      'scripts/data/solodit_comprehensive/individual_reports'
    );

    try {
      await fs.access(reportsPath);
      logger.info(`Scanning for reports in: ${reportsPath}`);
    } catch (e) {
      logger.error(`❌ Reports directory not found at: ${reportsPath}`);
      return;
    }

    const allFiles = await this.getAllFilesRecursive(reportsPath);
    logger.info(`Found ${allFiles.length} files to process.`);

    const totalFiles = allFiles.length;
    let processedCount = 0;
    let nextPercentMark = 1; // emit at 1 %, 2 %, …

    // Process files in smaller batches to reduce memory pressure
    for (let i = 0; i < allFiles.length; i += KnowledgeBaseService.BATCH_SIZE) {
      const batchFiles = allFiles.slice(i, i + KnowledgeBaseService.BATCH_SIZE);
      logger.info(
        `Processing batch ${Math.floor(i / KnowledgeBaseService.BATCH_SIZE) + 1}/${Math.ceil(allFiles.length / KnowledgeBaseService.BATCH_SIZE)}`
      );

      let active: Promise<void>[] = [];

      for (const filePath of batchFiles) {
        active.push(this.processAndSaveReport(filePath, reportsPath));
        processedCount++;

        // If we hit the concurrency limit, wait for the current group to finish
        if (active.length >= KnowledgeBaseService.CONCURRENCY_LIMIT) {
          await Promise.all(active);
          active = [];

          // Give the GC a chance to reclaim memory
          global.gc && global.gc();
        }

        // Emit progress at each whole-percent threshold
        const percent = Math.floor((processedCount * 100) / totalFiles);
        if (percent >= nextPercentMark || processedCount === totalFiles) {
          logger.info(`🧠 RAG file progress: ${percent}% (${processedCount}/${totalFiles})`);
          nextPercentMark = percent + 1;
        }
      }

      // Await any remaining tasks in this batch
      if (active.length) {
        await Promise.all(active);
      }

      // Add a small pause between batches to reduce memory pressure
      if (i + KnowledgeBaseService.BATCH_SIZE < allFiles.length) {
        logger.info(`Pausing briefly between batches to optimize memory usage...`);
        await new Promise((resolve) => setTimeout(resolve, KnowledgeBaseService.BATCH_PAUSE_MS));

        // Attempt to reclaim memory if Node.js exposes the GC
        global.gc && global.gc();
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`✅ Directory scan complete: Processed ${allFiles.length} files in ${duration}ms.`);
  }

  private async processAndSaveReport(filePath: string, reportsPath: string): Promise<void> {
    try {
      const id = path.relative(reportsPath, filePath).replace(/\\/g, '/');

      // If report is already in cache (from DB or file cache), skip it.
      if (KnowledgeBaseService.sharedReports.has(id)) {
        return;
      }

      const stats = await fs.stat(filePath);
      if (stats.size > KnowledgeBaseService.MAX_FILE_SIZE) {
        logger.warn(`Skipping large file: ${filePath}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      let content: string;
      let metadata: AuditReport['metadata'];

      if (ext === '.json') {
        const raw = await fs.readFile(filePath, 'utf-8');
        let jsonData: any;
        try {
          jsonData = JSON.parse(raw);
        } catch (err) {
          logger.warn(`Invalid JSON in ${filePath}:`, err);
          return;
        }

        content = this.extractContentFromJson(jsonData);

        metadata = {
          title: jsonData.title,
          contract: jsonData.metadata?.contract || undefined,
          platform: jsonData.metadata?.protocol || undefined,
          date: jsonData.metadata?.date || undefined,
          tags: [jsonData.vulnerability?.type, jsonData.vulnerability?.category].filter(Boolean),
          severity: jsonData.vulnerability?.impact || undefined,
          category: jsonData.vulnerability?.category || undefined,
          cve: jsonData.cve || undefined,
        } as AuditReport['metadata'];
      } else {
        // Fallback for .txt reports
        content = await fs.readFile(filePath, 'utf-8');
        metadata = this.extractMetadataFromFile(content, filePath);
      }

      const report: AuditReport = {
        id,
        source: 'solodit_comprehensive',
        filePath,
        content,
        metadata,
      };

      // This generates the embedding and adds it to the `report` object
      await this.saveReportToDatabase(report);

      // Now, store the report in memory WITHOUT its content to save RAM
      const { content: _c, ...reportForMemory } = report;
      KnowledgeBaseService.sharedReports.set(report.id, reportForMemory);
    } catch (error) {
      logger.warn(`Could not process file ${filePath}:`, error);
    }
  }

  private async saveReportToDatabase(report: AuditReport): Promise<void> {
    try {
      // Create embedding
      const textToEmbed = `${report.metadata.title || report.id}\n${(
        report.content || ''
      ).substring(0, 1000)}`;
      const embedding = await this.runtime.useModel(ModelType.TEXT_EMBEDDING, {
        text: textToEmbed,
      });

      // Update in-memory object
      report.embedding = embedding as number[];

      // Skip database save and use in-memory cache only
      // This bypasses the PgLite errors while still providing search functionality
      logger.info(`💾 Generated embedding for report ${report.id} (using in-memory cache only)`);

      // Attempt to save to file cache if database is unavailable
      try {
        const cacheDir = path.join(process.cwd(), 'cache', 'embeddings');

        // Create cache directory if it doesn't exist
        try {
          await fs.mkdir(cacheDir, { recursive: true });
        } catch (err) {
          // Ignore directory exists error
        }

        // Save embedding to file cache
        const cacheFile = path.join(cacheDir, `${report.id}.json`);
        await fs.writeFile(
          cacheFile,
          JSON.stringify(
            {
              id: report.id,
              embedding: report.embedding,
              metadata: report.metadata,
            },
            null,
            2
          )
        );
      } catch (cacheError) {
        logger.warn(`Could not save to file cache for ${report.id}:`, cacheError);
      }
    } catch (error) {
      logger.error(`❌ Failed to generate embedding for report ${report.id}:`, error);
    }
  }

  /**
   * Search for audit reports using vector similarity
   * @param query The search query string
   * @param specialization (Optional) Agent's specialization for context
   * @param topK (Optional) Number of results to return
   */
  async search(query: string, _specialization?: string, topK = 5): Promise<AuditReport[]> {
    if (!this.isInitialized) {
      logger.warn('Search called before RAG was initialized. Waiting for it...');
      await (KnowledgeBaseService.initializationPromise || this.initialize());
    }

    const queryEmbedding = (await this.runtime.useModel(ModelType.TEXT_EMBEDDING, {
      text: query,
    })) as number[];

    if (!queryEmbedding) {
      return [];
    }

    const reportsWithEmbeddings = Array.from(this.reports.values()).filter(
      (report) => report.embedding && report.embedding.length > 0
    );

    const similarities = reportsWithEmbeddings.map((report) => ({
      report,
      similarity: this.cosineSimilarity(queryEmbedding, report.embedding!),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);

    const topResults = similarities.slice(0, topK).map((s) => s.report);

    // Re-hydrate the content for the top results from disk
    const hydratedResults = await Promise.all(
      topResults.map(async (report) => {
        if (report.filePath && !report.content) {
          try {
            const fileContent = await fs.readFile(report.filePath, 'utf-8');
            const ext = path.extname(report.filePath).toLowerCase();

            if (ext === '.json') {
              const jsonData = JSON.parse(fileContent);
              return { ...report, content: this.extractContentFromJson(jsonData) };
            } else {
              return { ...report, content: fileContent };
            }
          } catch (error) {
            logger.warn(`Could not re-read content for report ${report.id}:`, error);
            return { ...report, content: 'Error: Could not load content.' };
          }
        }
        return report;
      })
    );

    return hydratedResults;
  }

  /**
   * Calculates cosine similarity between two vectors.
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

    if (magA === 0 || magB === 0) {
      return 0;
    }

    return dotProduct / (magA * magB);
  }

  get capabilityDescription(): string {
    return 'Ultra-fast management and semantic search over 46,000+ smart contract audit reports with streaming, batching, and parallel processing optimizations.';
  }

  private async getAllFilesRecursive(dir: string): Promise<string[]> {
    const allFiles: string[] = [];
    async function scanDirectory(currentDir: string): Promise<void> {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        const processing = entries.map(async (entry) => {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (
            entry.isFile() &&
            (entry.name.endsWith('.txt') || entry.name.endsWith('.json')) &&
            entry.name !== 'vulnerability_knowledge_base.txt' &&
            entry.name !== 'protocol_knowledge_base.txt'
          ) {
            allFiles.push(fullPath);
          }
        });
        await Promise.all(processing);
      } catch (error) {
        logger.warn(`Could not read directory ${currentDir}:`, error);
      }
    }
    await scanDirectory(dir);
    return allFiles;
  }

  private extractMetadataFromFile(content: string, filePath: string): AuditReport['metadata'] {
    const metadata: AuditReport['metadata'] = {};
    const lines = content.split('\n');
    metadata.title = lines[0] || 'Untitled Report';
    metadata.tags = [this.inferCategoryFromPath(filePath)];
    return metadata;
  }

  private inferCategoryFromPath(filePath: string): string {
    const dir = path.dirname(filePath);
    const parts = dir.split(path.sep);
    return parts[parts.length - 1] || 'general';
  }

  /**
   * Loads embeddings from the file cache
   */
  private async loadFromFileCache(): Promise<number> {
    try {
      const cacheDir = path.join(process.cwd(), 'cache', 'embeddings');

      try {
        await fs.access(cacheDir);
      } catch (err) {
        logger.info('No embedding cache directory found - skipping cache loading');
        return 0;
      }

      logger.info(`⚡ Loading embeddings from file cache: ${cacheDir}`);

      const files = await fs.readdir(cacheDir);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      logger.info(`Found ${jsonFiles.length} cached embedding files`);

      const reportsBasePath = path.join(
        process.cwd(),
        'scripts/data/solodit_comprehensive/individual_reports'
      );
      let loadedCount = 0;

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(cacheDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const cachedData = JSON.parse(content);

          if (!cachedData.id || !cachedData.embedding) {
            continue;
          }

          // If we already have this report in memory, just add the embedding
          const existingReport = KnowledgeBaseService.sharedReports.get(cachedData.id);
          if (existingReport) {
            existingReport.embedding = cachedData.embedding;
            loadedCount++;
          }
          // Otherwise store the ID for later when we load the full report
          else {
            // We'll store a minimal placeholder that will be filled in when we process files
            const reportId = cachedData.id;
            const fullFilePath = path.join(reportsBasePath, reportId); // Construct absolute path

            KnowledgeBaseService.sharedReports.set(reportId, {
              id: reportId,
              source: 'solodit_comprehensive',
              filePath: fullFilePath, // Use absolute path
              content: '', // Will be filled in when we process the actual file
              embedding: cachedData.embedding,
              metadata: cachedData.metadata || {},
            });
            loadedCount++;
          }
        } catch (err) {
          logger.warn(`Failed to load cached embedding from ${file}:`, err);
        }
      }

      return loadedCount;
    } catch (err) {
      logger.warn('Failed to load from file cache:', err);
      return 0;
    }
  }

  /**
   * Extracts the content block from a JSON audit report object.
   */
  private extractContentFromJson(jsonData: any): string {
    return [
      jsonData.title,
      jsonData.description,
      jsonData.exploitScenario,
      Array.isArray(jsonData.vulnerability)
        ? JSON.stringify(jsonData.vulnerability)
        : JSON.stringify(jsonData.vulnerability || {}),
    ]
      .filter(Boolean)
      .join('\n');
  }
}

export default KnowledgeBaseService;
