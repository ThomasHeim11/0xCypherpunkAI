import { AgentVote, VoteEngineConfig } from './types';
import { logger } from '@elizaos/core';

export class VoteEngine {
  private config: VoteEngineConfig;
  private pendingVotes: Map<string, AgentVote[]> = new Map();
  private voteTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: VoteEngineConfig) {
    this.config = config;
  }

  /**
   * Submit a vote from an agent for a specific finding
   */
  submitVote(vote: AgentVote): void {
    const { findingId } = vote;

    if (!this.pendingVotes.has(findingId)) {
      this.pendingVotes.set(findingId, []);
    }

    const votes = this.pendingVotes.get(findingId)!;

    // Check if agent already voted
    const existingVoteIndex = votes.findIndex((v) => v.agentId === vote.agentId);
    if (existingVoteIndex >= 0) {
      votes[existingVoteIndex] = vote; // Update existing vote
      logger.info(`🔄 Agent ${vote.agentName} updated vote for finding ${findingId}`);
    } else {
      votes.push(vote);
      logger.info(
        `✅ Agent ${vote.agentName} voted on finding ${findingId}: ${vote.vote} (${vote.confidence}%)`
      );
    }

    this.checkConsensus(findingId);
  }

  /**
   * Check if consensus has been reached for a finding
   */
  private checkConsensus(findingId: string): boolean {
    const votes = this.pendingVotes.get(findingId) || [];

    if (votes.length < this.config.minimumVotes) {
      return false;
    }

    const consensus = this.calculateConsensus(votes);

    if (consensus.consensusReached) {
      logger.info(
        `🎯 Consensus reached for finding ${findingId}: ${consensus.finalDecision} (${consensus.confidenceScore}%)`
      );
      this.clearTimeout(findingId);
      return true;
    }

    return false;
  }

  /**
   * Calculate consensus from votes
   */
  calculateConsensus(votes: AgentVote[]): {
    consensusReached: boolean;
    finalDecision: 'CONFIRMED' | 'REJECTED' | 'UNCERTAIN';
    confidenceScore: number;
    voteBreakdown: Record<string, number>;
  } {
    if (votes.length === 0) {
      return {
        consensusReached: false,
        finalDecision: 'UNCERTAIN',
        confidenceScore: 0,
        voteBreakdown: {},
      };
    }

    // Calculate weighted votes if enabled
    const weightedVotes = this.config.weightingEnabled ? this.applyWeights(votes) : votes;

    // Count votes by decision
    const voteBreakdown = weightedVotes.reduce(
      (acc, vote) => {
        acc[vote.vote] = (acc[vote.vote] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalVotes = weightedVotes.length;
    const confirmedVotes = voteBreakdown.CONFIRMED || 0;
    const rejectedVotes = voteBreakdown.REJECTED || 0;

    // Calculate percentages
    const confirmedPercentage = confirmedVotes / totalVotes;
    const rejectedPercentage = rejectedVotes / totalVotes;

    // Determine final decision
    let finalDecision: 'CONFIRMED' | 'REJECTED' | 'UNCERTAIN';
    let consensusReached = false;

    if (confirmedPercentage >= this.config.consensusThreshold) {
      finalDecision = 'CONFIRMED';
      consensusReached = true;
    } else if (rejectedPercentage >= this.config.consensusThreshold) {
      finalDecision = 'REJECTED';
      consensusReached = true;
    } else {
      finalDecision = 'UNCERTAIN';
      consensusReached = false;
    }

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(weightedVotes, finalDecision);

    return {
      consensusReached,
      finalDecision,
      confidenceScore,
      voteBreakdown,
    };
  }

  /**
   * Apply agent weights to votes
   */
  private applyWeights(votes: AgentVote[]): AgentVote[] {
    if (!this.config.agentWeights) {
      return votes;
    }

    return votes.map((vote) => ({
      ...vote,
      confidence: vote.confidence * (this.config.agentWeights![vote.agentId] || 1.0),
    }));
  }

  /**
   * Calculate final confidence score based on votes and decision
   */
  private calculateConfidenceScore(votes: AgentVote[], decision: string): number {
    if (votes.length === 0) return 0;

    // Get votes that match the final decision
    const matchingVotes = votes.filter((vote) => vote.vote === decision);

    if (matchingVotes.length === 0) return 0;

    // Calculate average confidence of matching votes
    const avgConfidence =
      matchingVotes.reduce((sum, vote) => sum + vote.confidence, 0) / matchingVotes.length;

    // Weight by consensus strength
    const consensusStrength = matchingVotes.length / votes.length;

    return Math.round(avgConfidence * consensusStrength);
  }

  /**
   * Start timeout for a finding
   */
  startVoteTimeout(findingId: string, callback: (findingId: string) => void): void {
    if (this.voteTimeouts.has(findingId)) {
      clearTimeout(this.voteTimeouts.get(findingId)!);
    }

    const timeout = setTimeout(
      () => {
        logger.warn(`⏰ Vote timeout reached for finding ${findingId}`);
        callback(findingId);
        this.voteTimeouts.delete(findingId);
      },
      this.config.timeoutMinutes * 60 * 1000
    );

    this.voteTimeouts.set(findingId, timeout);
  }

  /**
   * Clear timeout for a finding
   */
  private clearTimeout(findingId: string): void {
    if (this.voteTimeouts.has(findingId)) {
      clearTimeout(this.voteTimeouts.get(findingId)!);
      this.voteTimeouts.delete(findingId);
    }
  }

  /**
   * Get votes for a specific finding
   */
  getVotes(findingId: string): AgentVote[] {
    return this.pendingVotes.get(findingId) || [];
  }

  /**
   * Get final result for a finding
   */
  getFinalResult(findingId: string): {
    consensusReached: boolean;
    finalDecision: 'CONFIRMED' | 'REJECTED' | 'UNCERTAIN';
    confidenceScore: number;
    totalVotes: number;
  } {
    const votes = this.getVotes(findingId);
    const consensus = this.calculateConsensus(votes);

    return {
      ...consensus,
      totalVotes: votes.length,
    };
  }

  /**
   * Clear votes for a finding (after processing)
   */
  clearVotes(findingId: string): void {
    this.pendingVotes.delete(findingId);
    this.clearTimeout(findingId);
  }

  /**
   * Get current vote engine statistics
   */
  getStats(): {
    pendingFindings: number;
    totalVotes: number;
    activeTimeouts: number;
  } {
    const totalVotes = Array.from(this.pendingVotes.values()).reduce(
      (sum, votes) => sum + votes.length,
      0
    );

    return {
      pendingFindings: this.pendingVotes.size,
      totalVotes,
      activeTimeouts: this.voteTimeouts.size,
    };
  }
}
