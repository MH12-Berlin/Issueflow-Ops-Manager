import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import LogoutButton from "../components/LogoutButton";

const statusStyles = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  completed: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  archived: "border-slate-600 bg-slate-700/40 text-slate-400",
};

function ProjectDetailsSkeleton() {
  return (
    <main className="min-h-screen bg-[#0D1117] px-6 py-10 text-[#E6EDF3]">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-4 w-36 rounded bg-[#30363D]" />
        <div className="rounded-2xl border border-[#30363D] bg-[#161B22] p-8">
          <div className="h-5 w-28 rounded bg-[#30363D]" />
          <div className="mt-4 h-9 w-64 max-w-full rounded bg-[#30363D]" />
          <div className="mt-4 h-4 w-full max-w-xl rounded bg-[#30363D]" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 rounded-xl border border-[#30363D] bg-[#1C2128]"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProjectDetails() {
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchProject() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/projects/${projectId}`);

        if (active) {
          setProject(response.data.project);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load project details."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (projectId) {
      fetchProject();
    } else {
      setError("A project ID was not provided.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [projectId]);

  if (loading) {
    return <ProjectDetailsSkeleton />;
  }

  if (error || !project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0D1117] px-5 py-12 text-[#E6EDF3]">
        <section className="w-full max-w-lg rounded-2xl border border-[#30363D] bg-[#161B22] p-7 shadow-xl sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 text-red-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path
                d="M12 8v5m0 3h.01M10.3 3.86 1.82 18.5A2 2 0 0 0 3.55 21h16.9a2 2 0 0 0 1.73-2.5L13.7 3.86a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="mt-5 text-xl font-semibold tracking-tight">
            Unable to open project
          </h1>

          <p role="alert" className="mt-3 text-sm leading-6 text-red-300">
            {error || "Project not found."}
          </p>

          <Link
            to="/projects"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#22D3EE] px-4 py-2.5 text-sm font-semibold text-[#0D1117] transition hover:bg-[#A5F3FC] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:ring-offset-2 focus:ring-offset-[#161B22]"
          >
            <span aria-hidden="true">←</span>
            Back to projects
          </Link>
        </section>
      </main>
    );
  }

  const formattedDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not available";

  const statusClass =
    statusStyles[project.status] ||
    "border-slate-600 bg-slate-700/40 text-slate-400";

  return (
    <main className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <header className="sticky top-0 z-20 border-b border-[#30363D] bg-[#0D1117]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link
            to="/dashboard"
            className="flex shrink-0 items-center gap-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
            aria-label="IssueFlow dashboard"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22D3EE]/10 text-[#22D3EE] ring-1 ring-inset ring-[#22D3EE]/20">
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
            <span className="text-xl font-bold tracking-tight">
              Issue<span className="text-[#22D3EE]">Flow</span>
            </span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex items-center gap-3 text-sm sm:gap-6"
          >
            <Link
              to="/dashboard"
              className="hidden rounded-md text-[#9DA7B3] transition hover:text-[#E6EDF3] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] sm:inline"
            >
              Dashboard
            </Link>

            <Link
              to="/projects"
              aria-current="page"
              className="rounded-md font-semibold text-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
            >
              Projects
            </Link>

            <LogoutButton />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-[#9DA7B3] transition hover:text-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
        >
          <span aria-hidden="true">←</span>
          Back to projects
        </Link>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#30363D] bg-[#161B22]">
          <div className="h-1 w-full bg-gradient-to-r from-[#22D3EE] via-[#22D3EE]/40 to-transparent" />

          <div className="p-6 sm:p-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                <div className="flex h-12 w-fit max-w-32 shrink-0 items-center justify-center self-start rounded-xl border border-[#22D3EE]/20 bg-[#22D3EE]/10 px-3 text-sm font-bold tracking-wide text-[#22D3EE] sm:h-14 sm:max-w-40 sm:px-4">
                  <span className="break-all">{project.key || "PROJECT"}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-[#9DA7B3]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4 shrink-0 text-[#22D3EE]"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-4h4v4"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="break-words">
                      {project.team?.name || "Project workspace"}
                    </span>
                  </p>

                  <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                    {project.name}
                  </h1>

                  <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm leading-7 text-[#9DA7B3] sm:text-base">
                    {project.description || "No description provided."}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${statusClass}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {project.status || "Unknown"}
              </span>
            </div>

            <div className="mt-8 grid gap-4 border-t border-[#30363D] pt-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-[#30363D] bg-[#1C2128] p-5 transition-colors hover:border-[#22D3EE]/30">
                <div className="flex items-center gap-2 text-sm text-[#9DA7B3]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 text-[#22D3EE]"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3M8 4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Project key
                </div>
                <p className="mt-3 break-all font-semibold text-[#E6EDF3]">
                  {project.key || "Not available"}
                </p>
                <p className="mt-1 text-xs text-[#9DA7B3]">
                  Unique identifier for this project
                </p>
              </div>

              <div className="rounded-xl border border-[#30363D] bg-[#1C2128] p-5 transition-colors hover:border-[#22D3EE]/30">
                <div className="flex items-center gap-2 text-sm text-[#9DA7B3]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 text-[#22D3EE]"
                    aria-hidden="true"
                  >
                    <path
                      d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Project lead
                </div>
                <p className="mt-3 break-words font-semibold text-[#E6EDF3]">
                  {project.lead?.name || "Not assigned"}
                </p>
                {project.lead?.email ? (
                  <p className="mt-1 break-all text-sm text-[#9DA7B3]">
                    {project.lead.email}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[#9DA7B3]">
                    No lead assigned yet
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[#30363D] bg-[#1C2128] p-5 transition-colors hover:border-[#22D3EE]/30 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 text-sm text-[#9DA7B3]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 text-[#22D3EE]"
                    aria-hidden="true"
                  >
                    <path
                      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Created by
                </div>
                <p className="mt-3 break-words font-semibold text-[#E6EDF3]">
                  {project.createdBy?.name || "Unknown"}
                </p>
                <p className="mt-1 text-sm text-[#9DA7B3]">
                  {formattedDate}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#30363D] bg-[#161B22]">
          <div className="flex flex-col gap-4 border-b border-[#30363D] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#22D3EE]">
                Workspace
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Issue management
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9DA7B3]">
                Track project work, review issue statuses, manage priorities,
                and follow progress in one place.
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#22D3EE]/20 bg-[#22D3EE]/10 text-[#22D3EE]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            <div className="rounded-xl border border-dashed border-[#3B4653] bg-[#1C2128]/70 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#22D3EE]/10 text-[#22D3EE]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 12h8M12 8v8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#E6EDF3]">
                    All project issues
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#9DA7B3]">
                    Open the project issue list to view work items, filter by
                    status or priority, and manage assignments.
                  </p>
                </div>
              </div>

              <Link
                to={`/projects/${projectId}/issues`}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#22D3EE] px-5 py-3 text-sm font-semibold text-[#0D1117] transition hover:bg-[#197782] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:ring-offset-2 focus:ring-offset-[#1C2128] sm:w-auto"
              >
                View project issues
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h14m-7-7 7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-[#6E7885]">
          IssueFlow · Project workspace
        </footer>
      </div>
    </main>
  );
}