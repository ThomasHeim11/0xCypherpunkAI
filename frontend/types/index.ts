export interface Agent {
  id: string;
  name: string;
  description: string;
  specialty: string;
  confidence: number;
  status: "active" | "scanning" | "idle";
  color: string;
}

export interface ScanResult {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  location: string;
  confidence: number;
  agentConsensus: number;
  recommendation: string;
  affectedAgents: number;
}

export interface Repository {
  name: string;
  description: string;
  language: string;
  private: boolean;
  url?: string;
}

export interface SecurityScan {
  id: string;
  repository: string;
  status: "pending" | "scanning" | "completed" | "failed";
  overallConfidence: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  scanDuration: string;
  results: ScanResult[];
  agentVotes: AgentVote[];
  createdAt: Date;
}

export interface AgentVote {
  agentId: string;
  name: string;
  vote: "critical" | "high" | "medium" | "low";
  confidence: number;
  color: string;
}

export interface Stats {
  value: string;
  label: string;
  icon: string;
  color: string;
}
