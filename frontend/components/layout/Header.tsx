"use client";

import { useState } from "react";
import { Github, Menu, X, Shield } from "lucide-react";

interface HeaderProps {
  isAuthenticated?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
}

export default function Header({
  isAuthenticated = false,
  onLogin,
  onLogout,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Agents", href: "#agents" },
    { label: "Features", href: "#features" },
    { label: "Scan", href: "#scan" },
    { label: "About", href: "#about" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Shield className="h-8 w-8 text-neon-green" />
              <div className="absolute inset-0 bg-neon-green blur-md opacity-30"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                0x<span className="text-neon-green">Cypherpunk</span>AI
              </h1>
              <p className="text-xs text-gray-400 font-mono">ElizaOS Prize</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-gray-300 hover:text-neon-green transition-colors duration-200 font-medium"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Auth Button */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Connected</span>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center space-x-2 bg-gradient-to-r from-neon-green to-neon-blue text-black px-6 py-2 rounded-lg font-semibold hover:shadow-neon-green transition-all duration-300 hover:scale-105"
              >
                <Github className="h-4 w-4" />
                <span>Connect GitHub</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass border-t border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block px-3 py-2 text-gray-300 hover:text-neon-green transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="px-3 py-2">
              {isAuthenticated ? (
                <button
                  onClick={onLogout}
                  className="w-full text-left text-gray-300 hover:text-white"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={onLogin}
                  className="flex items-center space-x-2 bg-gradient-to-r from-neon-green to-neon-blue text-black px-4 py-2 rounded-lg font-semibold w-full justify-center"
                >
                  <Github className="h-4 w-4" />
                  <span>Connect GitHub</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
