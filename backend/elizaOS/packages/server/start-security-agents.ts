#!/usr/bin/env bun
import 'dotenv/config';
import { AgentServer, allCharacters } from './dist/index.js';
import { logger } from '@elizaos/core';

/**
 * 🚀 Server Startup Script for 0xCypherpunkAI
 *
 * This script initializes a single AgentServer and registers all 11 specialized
 * security agents, ensuring they share the same runtime environment and services.
 * This is the correct, efficient way to run the multi-agent system.
 */
async function main() {
  logger.info('🚀 Initializing 0xCypherpunkAI Agent Server...');
  const agentServer = new AgentServer();

  try {
    // Initialize the server first (DB, etc.)
    await agentServer.initialize();
    logger.info('✅ Agent Server initialized.');

    // Start the HTTP/Socket.IO server and wait for it to be listening
    const port = parseInt(process.env.SERVER_PORT || '3001', 10);
    await agentServer.start(port);
    logger.info(`🎉 0xCypherpunkAI Server is running at http://localhost:${port}`);

    // Now, with the server running, start all the agents
    logger.info(`Found ${allCharacters.length} security agents to register...`);
    for (const character of allCharacters) {
      try {
        await agentServer.startAgent(character);
        logger.info(`✅ Registered agent: ${character.name}`);
      } catch (agentError) {
        logger.error(`❌ Failed to start agent: ${character.name}`, agentError);
      }
    }

    logger.info('✅ All security agents registered successfully.');
  } catch (error) {
    logger.error('❌ Failed to start 0xCypherpunkAI Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down security agent swarm...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down security agent swarm...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Unhandled error in main execution:', error);
  process.exit(1);
});
