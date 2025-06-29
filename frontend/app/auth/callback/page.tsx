"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("github_token");

    if (token) {
      localStorage.setItem("auth_token", token);
      // Redirect to the main page after storing the token
      router.push("/");
    } else {
      // Handle cases where no token is provided
      console.error("No GitHub token found in callback URL.");
      router.push("/?error=auth_failed");
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-900">
      <Loader2 className="h-12 w-12 animate-spin text-neon-green mb-4" />
      <h1 className="text-2xl font-bold text-white">Authenticating...</h1>
      <p className="text-gray-400">Please wait while we securely log you in.</p>
    </div>
  );
}
