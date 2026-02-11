import React, { useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Film,
  Popcorn,
  Clapperboard,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BeamsBackground } from "../ui/beams-background";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api/auth";

const inputCls =
  "flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/40 transition pl-10";
const labelCls = "block text-sm font-medium text-gray-300 mb-1.5 uppercase tracking-wider text-xs";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.password || formData.password.length < 6) {
      toast.error("⚠️ Password must be at least 6 characters long.");
      return;
    }
    setIsLoading(true);

    try {
      const payload = { email: formData.email.trim(), password: formData.password };
      const res = await axios.post(`${API_BASE}/login`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      const data = res.data;

      if (data && data.success) {
        toast.success(data.message || "🎬 Login successful! Redirecting...");
        if (data.token) localStorage.setItem("token", data.token);

        try {
          const userToStore = data.user || { email: formData.email };
          localStorage.setItem(
            "cine_auth",
            JSON.stringify({
              isLoggedIn: true,
              email: userToStore.email || formData.email,
              isAdmin: userToStore.isAdmin || false,
            })
          );
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("userEmail", userToStore.email || formData.email || "");
          localStorage.setItem("cine_user_email", userToStore.email || formData.email || "");
          localStorage.setItem("user", JSON.stringify(userToStore));
        } catch (err) {
          console.warn("Failed to persist full user object", err);
        }

        setTimeout(() => {
          if (data?.user?.isAdmin) {
            window.location.href = `http://localhost:5174/?token=${data.token}`;
          } else {
            window.location.href = "/";
          }
        }, 1200);
      } else {
        toast.error(data?.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Server error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BeamsBackground intensity="medium" className="min-h-screen flex flex-col items-center justify-center p-4">
      <ToastContainer position="top-right" autoClose={2000} theme="dark" />
      
      <div className="w-full max-w-md z-10">
        <button
          onClick={() => window.location.href = "/"}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 mb-4">
              <Film className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-widest uppercase">
              Cinema Access
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Enter your credentials to continue the experience
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className={labelCls}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clapperboard size={16} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={labelCls}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Film size={16} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={16} className="text-gray-400 hover:text-white" />
                  ) : (
                    <Eye size={16} className="text-gray-400 hover:text-white" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full flex items-center justify-center gap-2 h-11 rounded-md text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  SIGNING IN...
                </>
              ) : (
                <>
                  <Popcorn size={18} />
                  ACCESS YOUR ACCOUNT
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              Don't have an account?{" "}
              <a href="/signup" className="text-red-400 hover:text-red-300 transition">
                Create one now
              </a>
            </p>
          </div>
        </div>
      </div>
    </BeamsBackground>
  );
};

export default LoginPage;
