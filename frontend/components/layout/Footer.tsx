import { Shield, Github, Twitter, Globe } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="h-8 w-8 text-neon-green" />
              <div>
                <h3 className="text-xl font-bold text-white">
                  0x<span className="text-neon-green">Cypherpunk</span>AI
                </h3>
                <p className="text-sm text-gray-400 font-mono">
                  ElizaOS AI Agent Prize
                </p>
              </div>
            </div>
            <p className="text-gray-400 max-w-md">
              Revolutionary multi-agent security analysis platform powered by 11
              specialized AI agents and enhanced with 44,000+ audit reports for
              unparalleled smart contract security.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#agents"
                  className="text-gray-400 hover:text-neon-green transition-colors"
                >
                  AI Agents
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="text-gray-400 hover:text-neon-green transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#scan"
                  className="text-gray-400 hover:text-neon-green transition-colors"
                >
                  Security Scan
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className="text-gray-400 hover:text-neon-green transition-colors"
                >
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-neon-green transition-colors"
                >
                  ElizaOS
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-neon-green transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-neon-green transition-colors"
                >
                  API Docs
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-neon-green transition-colors"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between">
          <p className="text-gray-400 text-sm">
            © {currentYear} 0xCypherpunkAI. Built for ElizaOS AI Agent Prize.
          </p>

          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <a
              href="#"
              className="text-gray-400 hover:text-neon-green transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-neon-blue transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-neon-purple transition-colors"
              aria-label="Website"
            >
              <Globe className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
