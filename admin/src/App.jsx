import React from "react";
import Home from "./pages/Home/Home";
import ListMovies from "./pages/ListMovies/ListMovies";

import { Routes, Route, useSearchParams, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard/Dashboard";
import BookingsPage from "./pages/BookingsPage/BookingsPage";

export default function App() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    );
    const token = searchParams.get("token") || hashParams.get("token");
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
      localStorage.setItem("accessToken", token);

      // Remove token from URL for security
      window.history.replaceState(null, "", window.location.pathname);
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/listmovies" element={<ListMovies />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/bookings" element={<BookingsPage />} />
    </Routes>
  );
}
