
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

const INPUT_CLASS =
  "w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3.5 py-3 text-sm text-[#E6EDF3] outline-none transition placeholder:text-[#7D8590] hover:border-[#485460] focus:border-[#22D3EE] focus:ring-2 focus:ring-cyan-400/15";

const LABEL_CLASS =
  "mb-2 block text-sm font-medium text-[#E6EDF3]";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const successMessage = location.state?.message;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const token = response.data?.token;

      if (!token) {
        throw new Error("The login response did not contain a token.");
      }

      localStorage.setItem("token", token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0D1117] px-4 py-10 text-[#E6EDF3]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/[0.07] blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-800 bg-[#102C38] text-[#22D3EE]">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M5 5h6v6H5zM13 13h6v6h-6zM13 5h6M5 15v4h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span>
              Issue<span className="text-[#22D3EE]">Flow</span>
            </span>
          </div>

          <h1 className="mt-8 text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#9DA7B3]">
            Sign in to manage your projects and keep work moving.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-[#30363D] bg-[#161B22] p-6 shadow-2xl shadow-black/20 sm:p-8"
        >
          {successMessage && (
            <div
              role="status"
              className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300"
            >
              {successMessage}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm leading-6 text-red-300"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className={LABEL_CLASS}>
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="you@example.com"
              required
              disabled={loading}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="password" className={LABEL_CLASS}>
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              placeholder="Enter your password"
              required
              disabled={loading}
              className={INPUT_CLASS}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#22D3EE] bg-[#22D3EE] px-4 py-3 text-sm font-semibold text-[#0D1117] transition hover:border-[#A5F3FC] hover:bg-[#A5F3FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161B22] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <svg
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="3"
                  opacity=".25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {loading ? "Logging in..." : "Log in"}
          </button>

          <div className="border-t border-[#30363D] pt-5">
            <p className="text-center text-sm text-[#9DA7B3]">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-[#22D3EE] transition hover:text-[#A5F3FC] focus-visible:outline-none focus-visible:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-[#7D8590]">
          Your team's work, organized in one place.
        </p>
      </div>
    </main>
  );
}
