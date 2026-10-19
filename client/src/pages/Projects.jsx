import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import LogoutButton from "../components/LogoutButton";

const INITIAL_FORM = {
  name: "",
  key: "",
  description: "",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-3 text-sm text-[#E6EDF3] outline-none transition placeholder:text-[#6E7885] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/15";

const LABEL_CLASS = "mb-2 block text-sm font-medium text-[#C9D1D9]";

const STATUS_STYLES = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  completed: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  archived: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

export default function Projects() {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);

  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchTeams() {
      try {
        setLoadingTeams(true);
        setError("");

        const response = await api.get("/teams", {
          signal: controller.signal,
        });
        const teamList = response.data.teams;

        if (!Array.isArray(teamList)) {
          throw new Error("Unexpected teams API response. Check GET /api/teams.");
        }

        setTeams(teamList);
        setSelectedTeamId(teamList.length ? String(teamList[0]._id) : "");
      } catch (err) {
        if (err.code !== "ERR_CANCELED" && !controller.signal.aborted) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingTeams(false);
        }
      }
    }

    fetchTeams();
    return () => controller.abort();
  }, []);

  const fetchProjects = useCallback(
    async (signal) => {
      if (!selectedTeamId) {
        setProjects([]);
        setLoadingProjects(false);
        return;
      }

      try {
        setLoadingProjects(true);
        setError("");

        const response = await api.get(
          `/teams/${selectedTeamId}/projects`,
          { signal }
        );

        if (!signal.aborted) {
          setProjects(response.data.projects || []);
        }
      } catch (err) {
        if (err.code !== "ERR_CANCELED" && !signal.aborted) {
          setProjects([]);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!signal.aborted) {
          setLoadingProjects(false);
        }
      }
    },
    [selectedTeamId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(controller.signal);
    return () => controller.abort();
  }, [fetchProjects]);

  const selectedTeam = teams.find(
    (team) => String(team._id) === selectedTeamId
  );

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "key" ? value.toUpperCase() : value,
    }));
  }

  async function handleCreateProject(event) {
    event.preventDefault();

    if (!selectedTeamId) {
      setError("Select a team before creating a project.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await api.post(
        `/teams/${selectedTeamId}/projects`,
        {
          name: form.name.trim(),
          key: form.key.trim().toUpperCase(),
          description: form.description.trim(),
        }
      );

      const createdProject = response.data.project;

      setProjects((previous) => [
        createdProject,
        ...previous.filter(
          (project) => project._id !== createdProject._id
        ),
      ]);

      setForm(INITIAL_FORM);
      setShowForm(false);
      setSuccess("Project created successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingTeams) {
    return (
      <main className="min-h-screen bg-[#0D1117] px-6 py-10 text-[#E6EDF3]">
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-8 w-40 rounded bg-[#30363D]" />
          <div className="h-32 rounded-2xl border border-[#30363D] bg-[#161B22]" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-48 rounded-2xl border border-[#30363D] bg-[#161B22]"
              />
            ))}
          </div>
        </div>
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
            <span aria-current="page" className="font-semibold text-[#22D3EE]">
              Projects
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#22D3EE]">
              WORKSPACE
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="mt-2 text-sm leading-6 text-[#9DA7B3]">
              Organize work and track issues across your teams.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowForm((previous) => !previous);
            }}
            disabled={!selectedTeamId}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#22D3EE] px-5 py-3 text-sm font-semibold text-[#0D1117] transition hover:bg-[#A5F3FC] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showForm ? "Cancel" : "+ New project"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
          >
            {success}
          </div>
        )}

        {teams.length === 0 ? (
          <section className="rounded-2xl border border-[#30363D] bg-[#161B22] px-6 py-14 text-center">
            <h2 className="text-lg font-semibold">No teams found</h2>
            <p className="mt-2 text-sm leading-6 text-[#9DA7B3]">
              Create or join a team before managing projects.
            </p>
          </section>
        ) : (
          <>
            <section className="mb-6 rounded-2xl border border-[#30363D] bg-[#161B22] p-5 sm:p-6">
              <label htmlFor="team" className={LABEL_CLASS}>
                Select team
              </label>

              <select
                id="team"
                value={selectedTeamId}
                onChange={(event) => {
                  setSelectedTeamId(event.target.value);
                  setShowForm(false);
                  setForm(INITIAL_FORM);
                  setError("");
                  setSuccess("");
                }}
                className={`${INPUT_CLASS} max-w-md`}
              >
                {teams.map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>

              {selectedTeam?.description && (
                <p className="mt-3 text-sm leading-6 text-[#9DA7B3]">
                  {selectedTeam.description}
                </p>
              )}
            </section>

            {showForm && (
              <section className="mb-8 rounded-2xl border border-[#30363D] bg-[#161B22] p-6 sm:p-7">
                <h2 className="text-lg font-semibold">Create a project</h2>
                <p className="mt-1 text-sm text-[#9DA7B3]">
                  Choose a unique project key, such as{" "}
                  <span className="font-semibold text-[#22D3EE]">APP</span>.
                  Issues can then use identifiers such as APP-1.
                </p>

                <form onSubmit={handleCreateProject} className="mt-6 space-y-5">
                  <div>
                    <label htmlFor="name" className={LABEL_CLASS}>
                      Project name
                    </label>
                    <input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      minLength={2}
                      maxLength={100}
                      required
                      placeholder="e.g. Website Redesign"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="key" className={LABEL_CLASS}>
                      Project key
                    </label>
                    <input
                      id="key"
                      name="key"
                      value={form.key}
                      onChange={handleFormChange}
                      minLength={2}
                      maxLength={10}
                      pattern="[A-Za-z][A-Za-z0-9]{1,9}"
                      title="Use 2–10 letters or numbers, starting with a letter."
                      required
                      placeholder="e.g. WEB"
                      className={INPUT_CLASS}
                    />
                    <p className="mt-2 text-xs text-[#9DA7B3]">
                      2–10 characters, starting with a letter.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="description" className={LABEL_CLASS}>
                      Description{" "}
                      <span className="font-normal text-[#6E7885]">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={handleFormChange}
                      maxLength={2000}
                      rows={3}
                      placeholder="What is this project about?"
                      className={INPUT_CLASS}
                    />
                  </div>

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
                      {submitting ? "Creating..." : "Create project"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {selectedTeam?.name || "Team"} projects
              </h2>
              <span className="text-sm text-[#9DA7B3]">
                {projects.length}{" "}
                {projects.length === 1 ? "project" : "projects"}
              </span>
            </div>

            {loadingProjects ? (
              <div className="rounded-2xl border border-[#30363D] bg-[#161B22] p-8 text-center text-sm text-[#9DA7B3]">
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <section className="rounded-2xl border border-dashed border-[#3B4653] bg-[#161B22] px-6 py-14 text-center">
                <h3 className="font-semibold">No projects in this team yet</h3>
                <p className="mt-2 text-sm leading-6 text-[#9DA7B3]">
                  Create the first project to get started.
                </p>
                {!showForm && (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="mt-4 text-sm font-semibold text-[#22D3EE] hover:text-[#A5F3FC]"
                  >
                    + Create a project
                  </button>
                )}
              </section>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <article
                    key={project._id}
                    className="flex min-w-0 flex-col rounded-2xl border border-[#30363D] bg-[#161B22] p-5 transition hover:border-[#22D3EE]/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-medium text-[#9DA7B3]">
                        PROJECT
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                          STATUS_STYLES[project.status] ||
                          "border-slate-500/30 bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {project.status || "unknown"}
                      </span>
                    </div>

                    <h3 className="mt-4 break-words text-lg font-semibold tracking-tight">
                      {project.name}
                    </h3>

                    <p className="mt-2 min-h-10 flex-1 whitespace-pre-wrap break-words text-sm leading-5 text-[#9DA7B3]">
                      {project.description || "No description provided."}
                    </p>

                    <Link
                      to={`/projects/${project._id}`}
                      className="mt-5 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-[#22D3EE] transition hover:text-[#A5F3FC] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
                    >
                      View project details
                      <span aria-hidden="true">→</span>
                    </Link>

                    <div className="mt-4 space-y-1 border-t border-[#30363D] pt-4 text-xs leading-5 text-[#9DA7B3]">
                      <p className="break-words">
                        Lead: {project.lead?.name || "Not assigned"}
                      </p>
                      <p className="break-words">
                        Created by: {project.createdBy?.name || "Unknown"}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        <footer className="pt-8 text-center text-xs text-[#6E7885]">
          IssueFlow · Project workspace
        </footer>
      </div>
    </main>
  );
}