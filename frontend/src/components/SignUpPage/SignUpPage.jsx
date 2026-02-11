import React, { useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Calendar,
  Film,
  Clapperboard,
  Ticket,
  Phone,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BeamsBackground } from "../ui/beams-background";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api/auth";

const inputCls =
  "flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/40 transition pl-10";
const labelCls = "block text-sm font-medium text-gray-300 mb-1.5 uppercase tracking-wider text-xs";

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    birthDate: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    else if (formData.fullName.length < 2) newErrors.fullName = "Full name must be at least 2 characters";

    if (!formData.username.trim()) newErrors.username = "Username is required";
    else if (formData.username.length < 3) newErrors.username = "Username must be at least 3 characters";

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";

    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) newErrors.phone = "Phone number must be 10 digits";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

    if (!formData.birthDate) newErrors.birthDate = "Birth date is required";
    else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age < 13) newErrors.birthDate = "You must be at least 13 years old";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        birthDate: formData.birthDate,
        password: formData.password,
      };

      const response = await axios.post(`${API_BASE}/register`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data && response.data.success) {
        toast.success("🎬 Account created successfully! Redirecting to login...");
        if (response.data.token) localStorage.setItem("token", response.data.token);
        if (response.data.user) localStorage.setItem("user", JSON.stringify(response.data.user));

        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
      } else {
        toast.error(response.data?.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      const serverMsg = err?.response?.data?.message || err?.message || "Server error";
      if (serverMsg.toLowerCase().includes("email")) setErrors((prev) => ({ ...prev, email: serverMsg }));
      else if (serverMsg.toLowerCase().includes("username")) setErrors((prev) => ({ ...prev, username: serverMsg }));
      else if (serverMsg.toLowerCase().includes("phone")) setErrors((prev) => ({ ...prev, phone: serverMsg }));
      else toast.error(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BeamsBackground intensity="medium" className="min-h-screen flex flex-col items-center justify-center p-4">
      <ToastContainer position="top-right" autoClose={2000} theme="dark" />

      <div className="w-full max-w-2xl z-10 my-8">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 mb-4">
              <Ticket className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-widest uppercase">
              Join Our Cinema
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Create your account and start your cinematic journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className={labelCls}>Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`${inputCls} ${errors.fullName ? "border-red-500/50 focus:ring-red-500/50" : ""}`}
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.fullName && <p className="text-xs text-red-400 mt-1">{errors.fullName}</p>}
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className={labelCls}>Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clapperboard size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className={`${inputCls} ${errors.username ? "border-red-500/50 focus:ring-red-500/50" : ""}`}
                    placeholder="Choose a username"
                  />
                </div>
                {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className={labelCls}>Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`${inputCls} ${errors.email ? "border-red-500/50 focus:ring-red-500/50" : ""}`}
                    placeholder="your@email.com"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className={labelCls}>Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className={`${inputCls} ${errors.phone ? "border-red-500/50 focus:ring-red-500/50" : ""}`}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
              </div>

              {/* Birth Date */}
              <div>
                <label htmlFor="birthDate" className={labelCls}>Date of Birth</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={handleChange}
                    className={`${inputCls} ${errors.birthDate ? "border-red-500/50 focus:ring-red-500/50" : ""}`}
                  />
                </div>
                {errors.birthDate && <p className="text-xs text-red-400 mt-1">{errors.birthDate}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={labelCls}>Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`${inputCls} ${errors.password ? "border-red-500/50 focus:ring-red-500/50" : ""}`}
                    placeholder="Create a strong password"
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
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-8 w-full flex items-center justify-center gap-2 h-11 rounded-md text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  CREATING ACCOUNT...
                </>
              ) : (
                <>
                  <Film size={18} />
                  CREATE CINEMA ACCOUNT
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-white/10 pt-6">
            <p className="text-sm text-gray-400">
              Already have an account?{" "}
              <a href="/login" className="text-red-400 hover:text-red-300 transition">
                Sign in to your account
              </a>
            </p>
          </div>
        </div>
      </div>
    </BeamsBackground>
  );
};

export default SignUpPage;
