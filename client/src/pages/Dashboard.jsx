
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import LogoutButton from "../components/LogoutButton";

const STATUS_STYLES = {
  open: "border-slate-600 bg-slate-800 text-slate-200",
  in_progress: "border-cyan-800 bg-cyan-950 text-cyan-300",
  blocked: "border-amber-800 bg-amber-950 text-amber-300",
  resolved: "border-emerald-800 bg-emerald-950 text-emerald-300",
};

const PRIORITY_STYLES = {
  low: "text-slate-400",
  medium: "text-cyan-300",
  high: "text-amber-300",
  critical: "text-red-400",
};

const PROJECT_STATUSES = [
  { label: "Active", key: "active", color: "bg-[#22D3EE]" },
  { label: "Completed", key: "completed", color: "bg-emerald-400" },
  { label: "Archived", key: "archived", color: "bg-slate-400" },
];

const ISSUE_STATUSES = [
  { label: "Open", key: "open", color: "bg-slate-400" },
  { label: "In progress", key: "in_progress", color: "bg-[#22D3EE]" },
  { label: "Blocked", key: "blocked", color: "bg-amber-400" },
  { label: "Resolved", key: "resolved", color: "bg-emerald-400" },
];

function formatLabel(value = "") {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5 transition-colors hover:border-[#3D5863]">
      <p className="text-sm font-medium text-[#9DA7B3]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#E6EDF3]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[#9DA7B3]">{description}</p>
    </div>
  );
}

function StatusRow({ label, count, total, color }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[#E6EDF3]">{label}</span>
        <span className="text-[#9DA7B3]">
          {count} ({percentage}%)
        </span>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-[#0D1117]"
        role="progressbar"
        aria-label={`${label} issues`}
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-[#0D1117] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-8 w-56 rounded-lg bg-[#161B22]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-32 rounded-xl border border-[#30363D] bg-[#161B22]"
            />
          ))}
        </div>
        <div className="h-72 rounded-xl border border-[#30363D] bg-[#161B22]" />
      </div>
    </main>
  );
}

function ErrorState({ message, onRetry, retrying }) {
  return (
    <main className="min-h-screen bg-[#0D1117] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl rounded-xl border border-red-900 bg-[#161B22] p-6">
        <h1 className="text-lg font-semibold text-[#E6EDF3]">
          Dashboard unavailable
        </h1>
        <p role="alert" className="mt-2 text-sm text-red-300">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#30363D] bg-[#1C2128] px-4 py-2 text-sm font-medium text-[#E6EDF3] transition hover:bg-[#252D36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {retrying ? "Retrying..." : "Try again"}
        </button>
      </div>
    </main>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboard() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/dashboard/summary", {
          signal: controller.signal,
        });

        const data = response.data?.summary;

        if (!data || typeof data !== "object") {
          throw new Error("The dashboard response is invalid.");
        }

        setSummary(data);
      } catch (err) {
        if (err.code === "ERR_CANCELED" || controller.signal.aborted) {
          return;
        }

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load dashboard. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => controller.abort();
  }, [retryCount]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => setRetryCount((count) => count + 1)}
        retrying={loading}
      />
    );
  }

  const projects = summary?.projects ?? {};
  const issues = summary?.issues ?? {};
  const byStatus = issues.byStatus ?? {};
  const recentIssues = Array.isArray(summary?.recentIssues)
    ? summary.recentIssues
    : [];

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#0D1117] px-4 py-8 text-[#E6EDF3] sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-[#30363D] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-widest text-[#22D3EE]">
              ISSUEFLOW / OVERVIEW
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-[#9DA7B3]">
              An overview of your team's projects and issues.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/projects"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#30363D] bg-[#161B22] px-5 py-2.5 text-sm font-medium transition hover:border-[#22D3EE] hover:bg-[#1C2128] hover:text-[#22D3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
            >
              Project workspace
              <span className="ml-2 text-[#22D3EE]" aria-hidden="true">
                →
              </span>
            </Link>
            <LogoutButton />
          </div>
        </header>

        <section
          aria-label="Summary statistics"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <SummaryCard
            label="Total projects"
            value={projects.total ?? 0}
            description={`${projects.active ?? 0} active projects`}
          />
          <SummaryCard
            label="Total issues"
            value={issues.total ?? 0}
            description={`${byStatus.open ?? 0} open issues`}
          />
          <SummaryCard
            label="Assigned to me"
            value={issues.assignedToMe ?? 0}
            description="Issues assigned to your account"
          />
          <SummaryCard
            label="Reported by me"
            value={issues.reportedByMe ?? 0}
            description="Issues created by your account"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5 sm:p-6 lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Issue status</h2>
              <p className="mt-1 text-sm text-[#9DA7B3]">
                Distribution of issues across your teams.
              </p>
            </div>

            <div className="space-y-5">
              {ISSUE_STATUSES.map((item) => (
                <StatusRow
                  key={item.key}
                  label={item.label}
                  count={byStatus[item.key] ?? 0}
                  total={issues.total ?? 0}
                  color={item.color}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Project overview</h2>
            <p className="mt-1 text-sm text-[#9DA7B3]">
              Project status summary.
            </p>

            <div className="mt-6 space-y-3">
              {PROJECT_STATUSES.map((project) => (
                <div
                  key={project.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#30363D] bg-[#0D1117] p-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${project.color}`}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-[#9DA7B3]">
                      {project.label}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {projects[project.key] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#30363D] bg-[#161B22]">
          <div className="flex flex-col justify-between gap-2 border-b border-[#30363D] p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">
                Recently updated issues
              </h2>
              <p className="mt-1 text-sm text-[#9DA7B3]">
                The latest activity across your team's issues.
              </p>
            </div>
            <span className="text-sm text-[#9DA7B3]">
              {recentIssues.length} shown
            </span>
          </div>

          {recentIssues.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="font-medium">No issues yet</h3>
              <p className="mt-2 text-sm text-[#9DA7B3]">
                Issues will appear here once your team starts creating them.
              </p>
              <Link
                to="/projects"
                className="mt-4 inline-flex text-sm font-medium text-[#22D3EE] hover:text-[#A5F3FC]"
              >
                Browse projects →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-[#30363D] bg-[#0D1117] text-xs uppercase tracking-wide text-[#9DA7B3]">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-medium">
                      Issue
                    </th>
                    <th scope="col" className="px-6 py-4 font-medium">
                      Project
                    </th>
                    <th scope="col" className="px-6 py-4 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 font-medium">
                      Priority
                    </th>
                    <th scope="col" className="px-6 py-4 font-medium">
                      Assignee
                    </th>
                    <th scope="col" className="px-6 py-4 font-medium">
                      Updated
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#30363D]">
                  {recentIssues.map((issue) => (
                    <tr
                      key={issue._id}
                      className="transition-colors hover:bg-[#1C2128]"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/issues/${issue._id}`}
                          className="font-medium text-[#E6EDF3] hover:text-[#22D3EE] focus-visible:outline-none focus-visible:underline"
                        >
                          {issue.title || "Untitled issue"}
                        </Link>
                        <p className="mt-1 text-xs text-[#9DA7B3]">
                          {issue.identifier || "—"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-[#9DA7B3]">
                        {issue.project?.name ?? "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${
                            STATUS_STYLES[issue.status] ??
                            "border-[#30363D] bg-[#1C2128] text-[#9DA7B3]"
                          }`}
                        >
                          {formatLabel(issue.status || "unknown")}
                        </span>
                      </td>

                      <td
                        className={`px-6 py-4 font-medium capitalize ${
                          PRIORITY_STYLES[issue.priority] ?? "text-[#9DA7B3]"
                        }`}
                      >
                        {issue.priority || "—"}
                      </td>

                      <td className="px-6 py-4 text-[#9DA7B3]">
                        {issue.assignee?.name ?? "Unassigned"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-[#9DA7B3]">
                        {formatDate(issue.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
