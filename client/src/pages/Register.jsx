import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-[#E6EDF3] outline-none transition placeholder:text-[#6E7885] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/15";

const LABEL_CLASS = "mb-2 block text-sm font-medium text-[#C9D1D9]";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !email || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register", {
        name,
        email,
        password: form.password,
      });

      navigate("/login", {
        replace: true,
        state: {
          message: "Account created successfully. Please log in.",
          email,
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0D1117] px-4 py-10 text-[#E6EDF3]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#22D3EE]/[0.07] blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 rounded-lg text-2xl font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#22D3EE]/20 bg-[#22D3EE]/10 text-[#22D3EE]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M5 5h14v4H5zM5 12h8v7H5zM16 12h3v7h-3z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>
              Issue<span className="text-[#22D3EE]">Flow</span>
            </span>
          </Link>

          <h1 className="mt-7 text-2xl font-semibold tracking-tight">
            Create your account
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#9DA7B3]">
            Start managing projects and issues with your team.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-[#30363D] bg-[#161B22] p-6 shadow-2xl shadow-black/10 sm:p-8"
        >
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-5 text-red-300"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className={LABEL_CLASS}>
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              minLength={2}
              maxLength={100}
              required
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="email" className={LABEL_CLASS}>
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
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
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              minLength={8}
              required
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={LABEL_CLASS}>
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Enter your password again"
              minLength={8}
              required
              className={INPUT_CLASS}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-lg bg-[#22D3EE] px-4 py-3 text-sm font-semibold text-[#0D1117] transition hover:bg-[#A5F3FC] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:ring-offset-2 focus:ring-offset-[#161B22] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-sm text-[#9DA7B3]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#22D3EE] transition hover:text-[#A5F3FC]"
            >
              Log in
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-[#6E7885]">
          Create your account to start organizing work with IssueFlow.
        </p>
      </div>
    </main>
  );
}