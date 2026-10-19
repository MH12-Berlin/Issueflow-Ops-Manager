
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import LogoutButton from "../components/LogoutButton";

const STATUSES = ["open", "in_progress", "blocked", "resolved"];
const PRIORITIES = ["low", "medium", "high", "critical"];

const INPUT_CLASS =
  "w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-[#E6EDF3] outline-none focus:border-[#22D3EE] focus:ring-2 focus:ring-cyan-400/15";

const LABEL_CLASS =
  "mb-2 block text-sm font-medium text-[#E6EDF3]";

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

function getArray(data, keys) {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function formatDateTime(date) {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getBadgeStyle(value) {
  const styles = {
    open: "border-slate-600 bg-slate-800 text-slate-200",
    in_progress: "border-cyan-800 bg-cyan-950 text-cyan-300",
    blocked: "border-amber-800 bg-amber-950 text-amber-300",
    resolved: "border-emerald-800 bg-emerald-950 text-emerald-300",
    low: "border-slate-600 bg-slate-800 text-slate-300",
    medium: "border-cyan-800 bg-cyan-950 text-cyan-300",
    high: "border-orange-800 bg-orange-950 text-orange-300",
    critical: "border-red-800 bg-red-950 text-red-300",
    bug: "border-red-800 bg-red-950 text-red-300",
    task: "border-slate-600 bg-slate-800 text-slate-300",
    feature: "border-violet-800 bg-violet-950 text-violet-300",
  };

  return `border ${styles[value] || "border-[#30363D] bg-[#1C2128] text-[#9DA7B3]"}`;
}

function DetailItem({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-[#9DA7B3]">{label}</p>
      <p className="mt-1 break-words font-medium text-[#E6EDF3]">
        {children}
      </p>
    </div>
  );
}

function Message({ children, type = "error" }) {
  const styles =
    type === "success"
      ? "border-emerald-900 bg-emerald-950/30 text-emerald-300"
      : "border-red-900 bg-red-950/40 text-red-300";

  return (
    <div
      role={type === "success" ? "status" : "alert"}
      className={`rounded-lg border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}

function formatChanges(changes) {
  if (!changes || typeof changes !== "object") return "";

  return Object.entries(changes)
    .map(([key, value]) => {
      const label = formatLabel(key);

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        ("from" in value || "to" in value)
      ) {
        return `${label}: ${value.from ?? "—"} → ${value.to ?? "—"}`;
      }

      if (Array.isArray(value)) {
        return `${label}: ${value.join(", ")}`;
      }

      if (value !== null && typeof value === "object") {
        return `${label}: ${JSON.stringify(value)}`;
      }

      return `${label}: ${value ?? "—"}`;
    })
    .join("\n");
}

export default function IssueDetails() {
  const { issueId } = useParams();

  const [issue, setIssue] = useState(null);
  const [activities, setActivities] = useState([]);
  const [comments, setComments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [commentBody, setCommentBody] = useState("");

  const [error, setError] = useState("");
  const [activityError, setActivityError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchIssue = useCallback(async () => {
    const response = await api.get(`/issues/${issueId}`);
    const loadedIssue = response.data?.issue;

    if (!loadedIssue) {
      throw new Error("The issue API did not return an issue.");
    }

    setIssue(loadedIssue);
    setStatus(loadedIssue.status || "open");
    setPriority(loadedIssue.priority || "medium");
  }, [issueId]);

  const fetchActivity = useCallback(async () => {
    try {
      setActivityError("");

      const response = await api.get(`/issues/${issueId}/activity`);

      setActivities(
        getArray(response.data, ["activities", "activity", "history"])
      );
    } catch (err) {
      setActivityError(getErrorMessage(err));
    }
  }, [issueId]);

  const fetchComments = useCallback(async () => {
    try {
      setCommentError("");

      const response = await api.get(`/issues/${issueId}/comments`);

      setComments(getArray(response.data, ["comments"]));
    } catch (err) {
      setCommentError(getErrorMessage(err));
    }
  }, [issueId]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await Promise.all([fetchIssue(), fetchActivity(), fetchComments()]);
    } catch (err) {
      setError(getErrorMessage(err));
      setIssue(null);
    } finally {
      setLoading(false);
    }
  }, [fetchIssue, fetchActivity, fetchComments]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function handleUpdate(event) {
    event.preventDefault();

    if (
      saving ||
      !issue ||
      (status === issue.status && priority === issue.priority)
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.patch(`/issues/${issueId}`, {
        status,
        priority,
      });

      if (response.data?.issue) {
        setIssue(response.data.issue);
        setStatus(response.data.issue.status || status);
        setPriority(response.data.issue.priority || priority);
      } else {
        await fetchIssue();
      }

      await fetchActivity();
      setSuccess("Issue updated successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment(event) {
    event.preventDefault();

    const body = commentBody.trim();

    if (!body || postingComment) return;

    try {
      setPostingComment(true);
      setCommentError("");
      setSuccess("");

      await api.post(`/issues/${issueId}/comments`, { body });

      setCommentBody("");
      await Promise.all([fetchComments(), fetchActivity()]);
      setSuccess("Comment added successfully.");
    } catch (err) {
      setCommentError(getErrorMessage(err));
    } finally {
      setPostingComment(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0D1117] px-4 py-8 text-[#9DA7B3] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-7 w-40 animate-pulse rounded bg-[#161B22]" />
          <div className="h-64 animate-pulse rounded-xl border border-[#30363D] bg-[#161B22]" />
          <div className="h-48 animate-pulse rounded-xl border border-[#30363D] bg-[#161B22]" />
        </div>
      </main>
    );
  }

  if (!issue) {
    return (
      <main className="min-h-screen bg-[#0D1117] px-4 py-8 text-[#E6EDF3] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-4 rounded-xl border border-[#30363D] bg-[#161B22] p-6">
          <h1 className="text-lg font-semibold">Issue unavailable</h1>
          <Message>{error || "Issue not found."}</Message>
          <Link
            to="/projects"
            className="inline-flex text-sm font-medium text-[#22D3EE] hover:text-[#A5F3FC]"
          >
            Back to projects
          </Link>
        </div>
      </main>
    );
  }

  const projectId =
    typeof issue.project === "object" ? issue.project?._id : issue.project;

  const projectName =
    typeof issue.project === "object" ? issue.project?.name : null;

  const identifier =
    issue.identifier ||
    (issue.project?.key && issue.number
      ? `${issue.project.key}-${issue.number}`
      : `Issue ${String(issue._id).slice(-6)}`);

  const hasChanges =
    status !== issue.status || priority !== issue.priority;

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#0D1117] text-[#E6EDF3]">
      <header className="border-b border-[#30363D]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <Link
            to="/dashboard"
            className="shrink-0 text-xl font-bold tracking-tight hover:text-[#22D3EE]"
          >
            IssueFlow
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center justify-end gap-2 sm:gap-4"
          >
            <Link
              to="/dashboard"
              className="rounded-lg px-3 py-2 text-sm text-[#9DA7B3] transition hover:bg-[#161B22] hover:text-[#E6EDF3]"
            >
              Dashboard
            </Link>
            <Link
              to="/projects"
              className="rounded-lg px-3 py-2 text-sm text-[#9DA7B3] transition hover:bg-[#161B22] hover:text-[#E6EDF3]"
            >
              Projects
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        {projectId && (
          <Link
            to={`/projects/${projectId}/issues`}
            className="inline-flex text-sm font-medium text-[#9DA7B3] transition hover:text-[#22D3EE]"
          >
            <span aria-hidden="true" className="mr-2">←</span>
            Back to {projectName || "project issues"}
          </Link>
        )}

        {error && (
          <div className="mt-5">
            <Message>{error}</Message>
          </div>
        )}

        {success && (
          <div className="mt-5">
            <Message type="success">{success}</Message>
          </div>
        )}

        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-xl border border-[#30363D] bg-[#161B22] p-5 sm:p-8">
              <p className="text-sm font-semibold tracking-wide text-[#22D3EE]">
                {identifier}
              </p>

              <h1 className="mt-3 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                {issue.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {[issue.status, issue.priority, issue.type].filter(Boolean).map((value) => (
                  <span
                    key={value}
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeStyle(value)}`}
                  >
                    {formatLabel(value)}
                  </span>
                ))}
              </div>

              <div className="mt-8 border-t border-[#30363D] pt-6">
                <h2 className="font-semibold">Description</h2>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#B1BAC4]">
                  {issue.description || "No description provided."}
                </p>
              </div>

              <div className="mt-6 grid gap-5 border-t border-[#30363D] pt-6 sm:grid-cols-2">
                <DetailItem label="Reporter">
                  {issue.reporter?.name || "Unknown"}
                </DetailItem>
                <DetailItem label="Assignee">
                  {issue.assignee?.name || "Unassigned"}
                </DetailItem>
                <DetailItem label="Created">
                  {formatDateTime(issue.createdAt)}
                </DetailItem>
                <DetailItem label="Last updated">
                  {formatDateTime(issue.updatedAt)}
                </DetailItem>
              </div>
            </section>

            <section className="rounded-xl border border-[#30363D] bg-[#161B22] p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Comments</h2>
              <p className="mt-1 text-sm text-[#9DA7B3]">
                Share updates with your team.
              </p>

              <form onSubmit={handleAddComment} className="mt-5">
                <label htmlFor="comment" className={LABEL_CLASS}>
                  Add a comment
                </label>
                <textarea
                  id="comment"
                  value={commentBody}
                  onChange={(event) => {
                    setCommentBody(event.target.value);
                    setCommentError("");
                  }}
                  maxLength={5000}
                  rows={4}
                  required
                  disabled={postingComment}
                  placeholder="Share an update or ask a question..."
                  className={`${INPUT_CLASS} resize-y`}
                />

                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={postingComment || !commentBody.trim()}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#22D3EE] bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#0D1117] transition hover:bg-[#A5F3FC] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {postingComment ? "Posting..." : "Post comment"}
                  </button>
                </div>
              </form>

              {commentError && (
                <div className="mt-3">
                  <Message>{commentError}</Message>
                </div>
              )}

              <div className="mt-6 space-y-4">
                {comments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#30363D] px-4 py-8 text-center">
                    <p className="text-sm text-[#9DA7B3]">No comments yet.</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <article
                      key={comment._id}
                      className="rounded-lg border border-[#30363D] bg-[#0D1117] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {comment.author?.name || "Team member"}
                        </p>
                        <p className="text-xs text-[#9DA7B3]">
                          {formatDateTime(comment.createdAt)}
                        </p>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#B1BAC4]">
                        {comment.body}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-6">
            <section className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
              <h2 className="font-semibold">Update issue</h2>
              <p className="mt-1 text-sm text-[#9DA7B3]">
                Change the status or priority.
              </p>

              <form onSubmit={handleUpdate} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="status" className={LABEL_CLASS}>
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className={INPUT_CLASS}
                  >
                    {STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {formatLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className={LABEL_CLASS}>
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                    className={INPUT_CLASS}
                  >
                    {PRIORITIES.map((item) => (
                      <option key={item} value={item}>
                        {formatLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={saving || !hasChanges}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#22D3EE] bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#0D1117] transition hover:bg-[#A5F3FC] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
              <h2 className="font-semibold">Activity history</h2>
              <p className="mt-1 text-sm text-[#9DA7B3]">
                Changes recorded for this issue.
              </p>

              {activityError && (
                <div className="mt-3">
                  <Message>{activityError}</Message>
                </div>
              )}

              {activities.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-[#30363D] p-4 text-sm text-[#9DA7B3]">
                  No activity available.
                </p>
              ) : (
                <div className="mt-5 space-y-5">
                  {activities.map((activity) => {
                    const changeText = formatChanges(activity.changes);

                    return (
                      <article
                        key={activity._id}
                        className="relative border-l-2 border-[#164E63] pb-1 pl-4 last:border-l-transparent"
                      >
                        <span
                          className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[#22D3EE]"
                          aria-hidden="true"
                        />
                        <p className="text-sm font-medium">
                          {formatLabel(activity.action || "updated")}
                        </p>
                        <p className="mt-1 text-xs text-[#9DA7B3]">
                          {activity.actor?.name || "Team member"}
                        </p>
                        <p className="mt-1 text-xs text-[#7D8590]">
                          {formatDateTime(activity.createdAt)}
                        </p>
                        {changeText && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#B1BAC4]">
                            {changeText}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
