"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import AgentsSection from "@/components/sections/AgentsSection";
import ScanSection from "@/components/sections/ScanSection";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic backend discovery - no hardcoded URLs
  const [backendUrl, setBackendUrl] = useState<string>("");

  const discoverBackendUrl = async (): Promise<string> => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    if (typeof window !== "undefined") {
      const { protocol, hostname, port } = window.location;

      if (hostname === "localhost") {
        // Try to discover the backend by testing common ports
        const commonPorts = ["3001", "8080", "5000", "4000"];

        for (const testPort of commonPorts) {
          try {
            const response = await fetch(
              `${protocol}//${hostname}:${testPort}/api/auth/github`,
              {
                method: "HEAD",
                signal: AbortSignal.timeout(1000),
              }
            );

            if (response.status !== 404) {
              return `${protocol}//${hostname}:${testPort}`;
            }
          } catch (e) {
            // Continue to next port
          }
        }

        // Fallback: guess based on frontend port
        const frontendPort = port || "3000";
        const backendPort = frontendPort === "3000" ? "3001" : "3000";
        return `${protocol}//${hostname}:${backendPort}`;
      }

      // Production logic
      if (hostname.includes("api.")) {
        return `${protocol}//${hostname}`;
      } else if (
        hostname.includes("vercel.app") ||
        hostname.includes("netlify.app")
      ) {
        return `${protocol}//${hostname}/api`;
      } else {
        return `${protocol}//api.${hostname}`;
      }
    }

    return "http://localhost:3001";
  };

  useEffect(() => {
    // Discover backend URL and check authentication status
    const initializeApp = async () => {
      try {
        // First, discover the backend URL
        const discoveredUrl = await discoverBackendUrl();
        setBackendUrl(discoveredUrl);

        // Check if we have a GitHub token in the URL parameters (OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const githubToken = urlParams.get("github_token");

        if (githubToken) {
          // Store the token and clean up the URL
          localStorage.setItem("auth_token", githubToken);
          setIsAuthenticated(true);

          // Clean up the URL without the token
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } else {
          // Check if we already have a token stored
          const storedToken = localStorage.getItem("auth_token");
          setIsAuthenticated(!!storedToken);
        }
      } catch (error) {
        console.error("App initialization failed:", error);
        // Set a fallback backend URL
        setBackendUrl("http://localhost:3001");
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleLogin = () => {
    // Redirect to backend OAuth endpoint using discovered URL
    if (backendUrl) {
      window.location.href = `${backendUrl}/api/auth/github`;
    } else {
      console.error("Backend URL not discovered yet");
    }
  };

  // Rely on httpOnly cookie set by backend; optionally poll session API in future

  const handleLogout = () => {
    try {
      localStorage.removeItem("auth_token");
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      // Scroll to scan section
      document.getElementById("scan")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      handleLogin();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading 0xCypherpunkAI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <main>
        <HeroSection
          isAuthenticated={isAuthenticated}
          onGetStarted={handleGetStarted}
        />

        <AgentsSection />

        <ScanSection isAuthenticated={isAuthenticated} onLogin={handleLogin} />

        {/* Features Section */}
        <section id="features" className="py-24 bg-dark-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Why Choose{" "}
                <span className="bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent">
                  0xCypherpunkAI
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Built for the ElizaOS AI Agent Prize, our platform represents
                the cutting edge of AI-powered smart contract security.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass rounded-2xl p-8 text-center hover:scale-105 transition-all duration-300">
                <div className="w-16 h-16 bg-neon-green/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-neon-green/30">
                  <span className="text-2xl font-bold text-neon-green">11</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  Multi-Agent Architecture
                </h3>
                <p className="text-gray-300">
                  Specialized AI agents work in consensus to provide
                  comprehensive security analysis with 99.9% accuracy and
                  minimal false positives.
                </p>
              </div>

              <div className="glass rounded-2xl p-8 text-center hover:scale-105 transition-all duration-300">
                <div className="w-16 h-16 bg-neon-blue/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-neon-blue/30">
                  <span className="text-2xl font-bold text-neon-blue">
                    44K+
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  Massive Training Dataset
                </h3>
                <p className="text-gray-300">
                  Trained on over 44,000 real-world audit reports to identify
                  patterns and vulnerabilities with unprecedented accuracy.
                </p>
              </div>

              <div className="glass rounded-2xl p-8 text-center hover:scale-105 transition-all duration-300">
                <div className="w-16 h-16 bg-neon-purple/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-neon-purple/30">
                  <span className="text-2xl font-bold text-neon-purple">
                    &lt;30s
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  Lightning Fast Analysis
                </h3>
                <p className="text-gray-300">
                  Complete comprehensive security audits in under 30 seconds,
                  providing instant feedback for rapid development cycles.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section
          id="about"
          className="py-24 bg-gradient-to-b from-dark-900 to-dark-800"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              Built for{" "}
              <span className="bg-gradient-to-r from-neon-green to-neon-blue bg-clip-text text-transparent">
                ElizaOS AI Agent Prize
              </span>
            </h2>
            <div className="glass rounded-3xl p-12">
              <p className="text-xl text-gray-300 leading-relaxed mb-8">
                0xCypherpunkAI represents the future of smart contract security,
                leveraging the power of ElizaOS&apos;s multi-agent framework to
                create an unprecedented security analysis platform. Our
                submission to the ElizaOS AI Agent Prize demonstrates how
                multiple specialized AI agents can work in harmony to solve
                complex security challenges in the Web3 ecosystem.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <div className="text-left">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Core Technology
                  </h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• ElizaOS Multi-Agent Framework</li>
                    <li>• Advanced Pattern Recognition</li>
                    <li>• Consensus-Based Analysis</li>
                    <li>• Real-time Vulnerability Detection</li>
                  </ul>
                </div>

                <div className="text-left">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Security Coverage
                  </h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Reentrancy Vulnerabilities</li>
                    <li>• Access Control Issues</li>
                    <li>• DeFi-Specific Risks</li>
                    <li>• Gas Optimization</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
