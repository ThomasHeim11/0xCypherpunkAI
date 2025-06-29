import Cookies from "js-cookie";

// Dynamic API URL detection with port discovery
async function discoverBackendPort(): Promise<string | null> {
  const commonPorts = ["3001", "8080", "5000", "4000", "8000"];

  for (const port of commonPorts) {
    try {
      const response = await fetch(`http://localhost:${port}/api/auth/github`, {
        method: "HEAD",
        signal: AbortSignal.timeout(1000), // 1 second timeout
      });

      if (response.status !== 404) {
        return port;
      }
    } catch (e) {
      // Port not available or server error, continue
    }
  }

  return null;
}

function getApiBaseUrl(): string {
  // Environment variable takes precedence
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Client-side detection
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;

    if (hostname === "localhost") {
      // For development, we'll discover the backend port dynamically
      // Start with educated guesses based on frontend port
      const frontendPort = port || "3000";
      const backendPort =
        frontendPort === "3000"
          ? "3001"
          : frontendPort === "3001"
          ? "3000"
          : "3001"; // Default fallback

      return `${protocol}//${hostname}:${backendPort}`;
    }

    // Production - try different patterns
    if (hostname.includes("api.")) {
      return `${protocol}//${hostname}`;
    } else if (
      hostname.includes("vercel.app") ||
      hostname.includes("netlify.app")
    ) {
      // For Vercel/Netlify, try API routes on same domain
      return `${protocol}//${hostname}/api`;
    } else {
      return `${protocol}//api.${hostname}`;
    }
  }

  // Server-side fallback
  return "http://localhost:3001";
}

let API_BASE_URL = getApiBaseUrl(); // backend URL

// For localhost development, try to discover the actual backend port
if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  discoverBackendPort()
    .then((discoveredPort) => {
      if (discoveredPort) {
        API_BASE_URL = `${window.location.protocol}//localhost:${discoveredPort}`;
      }
    })
    .catch(() => {
      // Keep the default
    });
}

export function getAuthToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("auth_token") || undefined;
}

export async function fetchWithAuth<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (init?.headers)
    Object.assign(headers, init.headers as Record<string, string>);
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...init,
    headers,
    credentials: "include", // include cookies just in case
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

// Updated API interface types
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  language: string;
  html_url: string;
  default_branch: string;
  updated_at: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  name: string;
  avatar_url: string;
}

export interface ScanResult {
  scanId: string;
  contractAddress?: string;
  githubRepo?: string;
  githubPath?: string;
  chain?: string;
  status: "PENDING" | "SCANNING" | "VOTING" | "COMPLETED" | "FAILED";
  progress: number; // 0-100
  findings: VulnerabilityFinding[];
  agentVotes: AgentVote[];
  finalConfidenceScore: number;
  totalVotes: number;
  consensusReached: boolean;
  timestamp: Date;
  completedAt?: Date;
}

export interface VulnerabilityFinding {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  description: string;
  location: {
    file: string;
    line: number;
  };
  recommendation: string;
  confidence: number;
}

export interface AgentVote {
  agentId: string;
  findingId: string;
  vote: "CONFIRM" | "REJECT" | "UNCERTAIN";
  confidence: number;
  reasoning?: string;
  timestamp: Date;
}

// API functions
export async function listRepositories(): Promise<GitHubRepo[]> {
  const response = await fetchWithAuth<{
    success: boolean;
    data: GitHubRepo[];
  }>("/api/github/repos");
  return response.data;
}

export async function getUserProfile(): Promise<GitHubUser> {
  const response = await fetchWithAuth<{ success: boolean; data: GitHubUser }>(
    "/api/github/user"
  );
  return response.data;
}

export async function startSecurityScan(data: {
  repository: string;
  path?: string;
}): Promise<ScanResult> {
  const response = await fetchWithAuth<{ success: boolean; data: ScanResult }>(
    "/api/github/scan",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  return response.data;
}

export async function getScanResult(scanId: string): Promise<ScanResult> {
  const response = await fetchWithAuth<{ success: boolean; data: ScanResult }>(
    `/api/results/${scanId}`
  );
  return response.data;
}
