import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import LogoutButton from "../components/LogoutButton";

const INITIAL_FORM = {
  title: "",
  description: "",
  type: "bug",
  priority: "medium",
};

const STATUSES = ["open", "in_progress", "blocked", "resolved"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const TYPES = ["bug", "task", "feature"];

const BADGE_STYLES = {
  open: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  in_progress: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  blocked: "border-red-400/20 bg-red-400/10 text-red-300",
  resolved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  low: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  medium: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  high: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  critical: "border-red-400/20 bg-red-400/10 text-red-300",
  bug: "border-red-400/20 bg-red-400/10 text-red-300",
  task: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  feature: "border-violet-400/20 bg-violet-400/10 text-violet-300",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-[#E6EDF3] outline-none transition placeholder:text-[#6E7885] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/15";

const LABEL_CLASS = "mb-2 block text-sm font-medium text-[#C9D1D9]";

function formatLabel(value = "") {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function Badge({ value }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        BADGE_STYLES[value] ||
        "border-slate-500/30 bg-slate-500/10 text-slate-300"
      }`}
    >
      {formatLabel(value || "unknown")}
    </span>
  );
}

export default function ProjectIssues() {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProject() {
      try {
        setLoadingProject(true);
        setError("");

        const response = await api.get(`/projects/${projectId}`, {
          signal: controller.signal,
        });

        setProject(response.data.project);
      } catch (err) {
        if (err.code !== "ERR_CANCELED") {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingProject(false);
        }
      }
    }

    if (!projectId) {
      setError("A project ID was not provided.");
      setLoadingProject(false);
      return () => controller.abort();
    }

    fetchProject();

    return () => controller.abort();
  }, [projectId]);

  const fetchIssues = useCallback(
    async (signal) => {
      const params = { page, limit: 10, sort };

      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (type) params.type = type;

      const response = await api.get(`/projects/${projectId}/issues`, {
        params,
        signal,
      });

      return response.data;
    },
    [projectId, page, search, status, priority, type, sort]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadIssues() {
      try {
        setLoadingIssues(true);
        setError("");

        const data = await fetchIssues(controller.signal);

        if (controller.signal.aborted) return;

        const nextIssues = data.issues || [];

        setIssues(nextIssues);
        setPagination(
          data.pagination || {
            page,
            limit: 10,
            total: nextIssues.length,
            totalPages: nextIssues.length ? 1 : 0,
          }
        );
      } catch (err) {
        if (err.code !== "ERR_CANCELED" && !controller.signal.aborted) {
          setIssues([]);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingIssues(false);
        }
      }
    }

    loadIssues();

    return () => controller.abort();
  }, [fetchIssues, page]);

  function handleFilterChange(setter, value) {
    setter(value);
    setPage(1);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleCreateIssue(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      await api.post(`/projects/${projectId}/issues`, {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        priority: form.priority,
      });

      setForm(INITIAL_FORM);
      setShowForm(false);
      setPage(1);
      setSuccess("Issue created successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    setPriority("");
    setType("");
    setSort("newest");
    setPage(1);
  }

  if (loadingProject) {
    return (
      <main className="min-h-screen bg-[#0D1117] px-6 py-10 text-[#9DA7B3]">
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-4 w-36 rounded bg-[#30363D]" />
          <div className="h-10 w-56 rounded bg-[#30363D]" />
          <div className="h-40 rounded-2xl border border-[#30363D] bg-[#161B22]" />
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0D1117] px-5 py-10 text-[#E6EDF3]">
        <section className="w-full max-w-lg rounded-2xl border border-[#30363D] bg-[#161B22] p-7">
          <h1 className="text-xl font-semibold">Unable to open project</h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-red-300">
            {error || "Project could not be found."}
          </p>
          <Link
            to="/projects"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#0D1117] hover:bg-[#A5F3FC] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
          >
            Back to projects
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <header className="sticky top-0 z-20 border-b border-[#30363D] bg-[#0D1117]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link
            to="/dashboard"
            className="shrink-0 text-xl font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
          >
            Issue<span className="text-[#22D3EE]">Flow</span>
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-4 text-sm sm:gap-6">
            <Link
              to="/dashboard"
              className="hidden text-[#9DA7B3] transition hover:text-[#E6EDF3] sm:inline"
            >
              Dashboard
            </Link>
            <Link
              to="/projects"
              className="text-[#9DA7B3] transition hover:text-[#22D3EE]"
            >
              Projects
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
        <Link
          to={`/projects/${projectId}`}
          className="text-sm font-medium text-[#9DA7B3] transition hover:text-[#22D3EE]"
        >
          ← Back to {project.name}
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#22D3EE]">
              {project.key} / WORKSPACE
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Issues</h1>
            <p className="mt-2 text-sm leading-6 text-[#9DA7B3]">
              Track bugs, tasks, and feature requests for {project.name}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((previous) => !previous);
              setError("");
              setSuccess("");
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#22D3EE] px-5 py-3 text-sm font-semibold text-[#0D1117] transition hover:bg-[#A5F3FC] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:ring-offset-2 focus:ring-offset-[#0D1117]"
          >
            {showForm ? "Cancel" : "+ Create issue"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
          >
            {success}
          </div>
        )}

        {showForm && (
          <section className="mt-6 rounded-2xl border border-[#30363D] bg-[#161B22] p-6 sm:p-7">
            <h2 className="text-lg font-semibold">Create an issue</h2>
            <p className="mt-1 text-sm text-[#9DA7B3]">
              Add a clear title and choose the issue type and priority.
            </p>

            <form onSubmit={handleCreateIssue} className="mt-6 space-y-5">
              <div>
                <label htmlFor="issue-title" className={LABEL_CLASS}>
                  Title
                </label>
                <input
                  id="issue-title"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  minLength={2}
                  maxLength={200}
                  required
                  placeholder="Describe the issue briefly"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="issue-description" className={LABEL_CLASS}>
                  Description
                </label>
                <textarea
                  id="issue-description"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  maxLength={5000}
                  rows={4}
                  placeholder="Add steps, context, or expected behavior"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="issue-type" className={LABEL_CLASS}>
                    Type
                  </label>
                  <select
                    id="issue-type"
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    className={INPUT_CLASS}
                  >
                    {TYPES.map((item) => (
                      <option key={item} value={item}>
                        {formatLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="issue-priority" className={LABEL_CLASS}>
                    Priority
                  </label>
                  <select
                    id="issue-priority"
                    name="priority"
                    value={form.priority}
                    onChange={handleFormChange}
                    className={INPUT_CLASS}
                  >
                    {PRIORITIES.map((item) => (
                      <option key={item} value={item}>
                        {formatLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs leading-5 text-[#9DA7B3]">
                New issues use the backend's default status and are initially
                unassigned.
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(INITIAL_FORM);
                  }}
                  className="min-h-11 rounded-lg border border-[#30363D] px-4 py-2.5 text-sm font-medium text-[#C9D1D9] transition hover:bg-[#1C2128]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-11 rounded-lg bg-[#22D3EE] px-5 py-2.5 text-sm font-semibold text-[#0D1117] transition hover:bg-[#A5F3FC] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create issue"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-[#30363D] bg-[#161B22] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-semibold">Filter issues</h2>
            <p className="mt-1 text-sm text-[#9DA7B3]">
              Narrow results by keyword, status, priority, or type.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label htmlFor="issue-search" className={LABEL_CLASS}>
                Search
              </label>
              <input
                id="issue-search"
                value={search}
                onChange={(event) =>
                  handleFilterChange(setSearch, event.target.value)
                }
                placeholder="Search title, description, or ID"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="status-filter" className={LABEL_CLASS}>
                Status
              </label>
              <select
                id="status-filter"
                value={status}
                onChange={(event) =>
                  handleFilterChange(setStatus, event.target.value)
                }
                className={INPUT_CLASS}
              >
                <option value="">All statuses</option>
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority-filter" className={LABEL_CLASS}>
                Priority
              </label>
              <select
                id="priority-filter"
                value={priority}
                onChange={(event) =>
                  handleFilterChange(setPriority, event.target.value)
                }
                className={INPUT_CLASS}
              >
                <option value="">All priorities</option>
                {PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="type-filter" className={LABEL_CLASS}>
                Issue type
              </label>
              <select
                id="type-filter"
                value={type}
                onChange={(event) =>
                  handleFilterChange(setType, event.target.value)
                }
                className={INPUT_CLASS}
              >
                <option value="">All types</option>
                {TYPES.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sort-issues" className={LABEL_CLASS}>
                Sort by
              </label>
              <select
                id="sort-issues"
                value={sort}
                onChange={(event) =>
                  handleFilterChange(setSort, event.target.value)
                }
                className={INPUT_CLASS}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="priority">Priority</option>
                <option value="updated">Recently updated</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-11 w-full rounded-lg border border-[#30363D] px-3 py-2.5 text-sm font-medium text-[#C9D1D9] transition hover:bg-[#1C2128]"
              >
                Clear filters
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#30363D] bg-[#161B22]">
          <div className="flex items-center justify-between gap-4 border-b border-[#30363D] px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold">Project issues</h2>
              <p className="mt-1 text-xs text-[#9DA7B3]">
                {pagination.total} total
              </p>
            </div>
            <span className="rounded-lg border border-[#30363D] bg-[#1C2128] px-3 py-1.5 text-xs text-[#9DA7B3]">
              Page {pagination.page || page}
              {pagination.totalPages > 0
                ? ` of ${pagination.totalPages}`
                : ""}
            </span>
          </div>

          {loadingIssues ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-xl border border-[#30363D] bg-[#1C2128]"
                />
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#30363D] bg-[#1C2128] text-[#22D3EE]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path
                    d="M8 12h8m-4-4v8m9-4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold">No issues found</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#9DA7B3]">
                Try adjusting your filters, or create an issue to get work
                moving.
              </p>
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  setShowForm(true);
                }}
                className="mt-4 text-sm font-semibold text-[#22D3EE] hover:text-[#A5F3FC]"
              >
                Create an issue →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#30363D]">
              {issues.map((issue) => (
                <article
                  key={issue._id}
                  className="flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-[#1C2128]/60 sm:px-6"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/issues/${issue._id}`}
                        className="break-all text-xs font-semibold text-[#22D3EE] hover:text-[#A5F3FC] hover:underline"
                      >
                        {issue.identifier || `${project.key}-${issue.number}`}
                      </Link>

                      <h3 className="mt-1 break-words font-semibold text-[#E6EDF3]">
                        {issue.title}
                      </h3>

                      {issue.description && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#9DA7B3]">
                          {issue.description}
                        </p>
                      )}

                      <p className="mt-3 break-words text-xs leading-5 text-[#9DA7B3]">
                        Reporter: {issue.reporter?.name || "Unknown"}
                        <span className="mx-2 text-[#4B5563]">·</span>
                        Assignee: {issue.assignee?.name || "Unassigned"}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Badge value={issue.type} />
                      <Badge value={issue.priority} />
                      <Badge value={issue.status} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loadingIssues && pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-[#30363D] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm text-[#9DA7B3]">
                Page {pagination.page || page} of {pagination.totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((previous) => previous - 1)}
                  className="min-h-10 rounded-lg border border-[#30363D] px-4 py-2 text-sm font-medium transition hover:bg-[#1C2128] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((previous) => previous + 1)}
                  className="min-h-10 rounded-lg border border-[#30363D] px-4 py-2 text-sm font-medium transition hover:bg-[#1C2128] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        <footer className="py-8 text-center text-xs text-[#6E7885]">
          IssueFlow · Project workspace
        </footer>
      </div>
    </main>
  );
}