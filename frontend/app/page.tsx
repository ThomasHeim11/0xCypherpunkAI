"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import ScanSection from "@/components/sections/ScanSection";
import { useState } from "react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // This is a placeholder for a real auth flow
  const handleLogin = () => {
    // In a real app, this would trigger an OAuth flow
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      document.getElementById("scan")?.scrollIntoView({ behavior: "smooth" });
    } else {
      handleLogin();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <main className="flex-grow">
        <HeroSection
          isAuthenticated={isAuthenticated}
          onGetStarted={handleGetStarted}
        />
        <ScanSection isAuthenticated={isAuthenticated} onLogin={handleLogin} />
      </main>
      <Footer />
    </div>
  );
}
