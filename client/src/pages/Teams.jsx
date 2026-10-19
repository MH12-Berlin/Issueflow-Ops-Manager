import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import LogoutButton from "../components/LogoutButton";

const INITIAL_TEAM_FORM = { name: "", description: "" };
const INITIAL_MEMBER_FORM = { role: "member" };

const INPUT_CLASS =
  "w-full rounded-lg border border-[#30363D] bg-[#0D1117] px-3 py-2.5 text-sm text-[#E6EDF3] outline-none transition placeholder:text-[#6E7885] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/15";

const LABEL_CLASS = "mb-2 block text-sm font-medium text-[#C9D1D9]";

const ROLE_STYLES = {
  admin: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  lead: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  member: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function formatRole(role = "") {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getUserId(user) {
  if (!user) return null;
  if (typeof user === "object") return user._id || user.id || null;
  return user;
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

export default function Teams() {
  const [currentUser, setCurrentUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(true);

  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [teamForm, setTeamForm] = useState(INITIAL_TEAM_FORM);
  const [memberForm, setMemberForm] = useState(INITIAL_MEMBER_FORM);

  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [creatingTeam, setCreatingTeam] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchTeams = useCallback(async (signal) => {
    const response = await api.get("/teams", { signal });
    const teamList = response.data.teams;

    if (!Array.isArray(teamList)) {
      throw new Error("Unexpected response from the teams API.");
    }

    if (signal.aborted) return;

    setTeams(teamList);
    setSelectedTeamId((currentId) =>
      teamList.some((team) => String(team._id) === String(currentId))
        ? currentId
        : String(teamList[0]?._id || "")
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const [userResult] = await Promise.allSettled([
          api.get("/auth/me", { signal: controller.signal }),
          fetchTeams(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        if (userResult.status === "fulfilled") {
          setCurrentUser(
            userResult.value.data.user || userResult.value.data
          );
        } else if (userResult.reason?.code !== "ERR_CANCELED") {
          setCurrentUser(null);
        }
      } catch (err) {
        if (err.code !== "ERR_CANCELED" && !controller.signal.aborted) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPage();
    return () => controller.abort();
  }, [fetchTeams]);

  useEffect(() => {
    const query = userSearch.trim();
    const controller = new AbortController();

    if (query.length < 2 || selectedUser || !showMemberForm) {
      setUserResults([]);
      setSearchingUsers(false);
      return () => controller.abort();
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingUsers(true);

        const response = await api.get("/users/search", {
          params: { search: query },
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setUserResults(response.data.users || []);
        }
      } catch (err) {
        if (err.code !== "ERR_CANCELED" && !controller.signal.aborted) {
          setUserResults([]);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingUsers(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [userSearch, selectedUser, showMemberForm]);

  const selectedTeam = teams.find(
    (team) => String(team._id) === String(selectedTeamId)
  );

  const currentUserId = getUserId(currentUser);

  const currentMembership = selectedTeam?.members?.find(
    (member) =>
      String(getUserId(member.user)) === String(currentUserId)
  );

  const canCreateTeam =
    currentUser?.role === "admin" ||
    teams.some((team) =>
      team.members?.some(
        (member) =>
          String(getUserId(member.user)) === String(currentUserId) &&
          member.role === "lead"
      )
    );

  const canManageMembers = currentMembership?.role === "admin";

  function handleTeamFormChange(event) {
    const { name, value } = event.target;
    setTeamForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleMemberFormChange(event) {
    const { name, value } = event.target;
    setMemberForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleCreateTeam(event) {
    event.preventDefault();

    if (!canCreateTeam) {
      setError("Only admins and team leads can create teams.");
      return;
    }

    try {
      setCreatingTeam(true);
      setError("");
      setSuccess("");

      const response = await api.post("/teams", {
        name: teamForm.name.trim(),
        description: teamForm.description.trim(),
      });

      const createdTeam = response.data.team;

      setTeams((previous) => [
        createdTeam,
        ...previous.filter((team) => team._id !== createdTeam._id),
      ]);

      setSelectedTeamId(String(createdTeam._id));
      setTeamForm(INITIAL_TEAM_FORM);
      setShowTeamForm(false);
      setShowMemberForm(false);
      setSuccess("Team created successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreatingTeam(false);
    }
  }

  async function handleAddMember(event) {
    event.preventDefault();

    if (!canManageMembers) {
      setError("Only this team's admins can add members.");
      return;
    }

    if (!selectedUser || !selectedTeamId) {
      setError("Select a user before adding them.");
      return;
    }

    try {
      setAddingMember(true);
      setError("");
      setSuccess("");

      const response = await api.post(
        `/teams/${selectedTeamId}/members`,
        {
          userId: selectedUser._id,
          role: memberForm.role,
        }
      );

      const updatedTeam = response.data.team;

      setTeams((previous) =>
        previous.map((team) =>
          team._id === updatedTeam._id ? updatedTeam : team
        )
      );

      setMemberForm(INITIAL_MEMBER_FORM);
      setSelectedUser(null);
      setUserSearch("");
      setUserResults([]);
      setShowMemberForm(false);
      setSuccess("Team member added successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAddingMember(false);
    }
  }

  function toggleTeamForm() {
    setError("");
    setSuccess("");
    setShowTeamForm((previous) => !previous);
    setTeamForm(INITIAL_TEAM_FORM);
  }

  function toggleMemberForm() {
    setError("");
    setSuccess("");
    setShowMemberForm((previous) => !previous);
    setMemberForm(INITIAL_MEMBER_FORM);
    setSelectedUser(null);
    setUserSearch("");
    setUserResults([]);
  }

  function selectTeam(teamId) {
    setSelectedTeamId(String(teamId));
    setShowMemberForm(false);
    setMemberForm(INITIAL_MEMBER_FORM);
    setSelectedUser(null);
    setUserSearch("");
    setUserResults([]);
    setError("");
    setSuccess("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0D1117] px-6 py-10 text-[#E6EDF3]">
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-8 w-40 rounded bg-[#30363D]" />
          <div className="h-32 rounded-2xl border border-[#30363D] bg-[#161B22]" />
          <div className="h-64 rounded-2xl border border-[#30363D] bg-[#161B22]" />
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

          <nav
            aria-label="Main navigation"
            className="flex items-center gap-3 text-sm sm:gap-6"
          >
            <Link
              to="/dashboard"
              className="hidden text-[#9DA7B3] transition hover:text-[#E6EDF3] sm:inline"
            >
              Dashboard
            </Link>
            <Link
              to="/projects"
              className="hidden text-[#9DA7B3] transition hover:text-[#E6EDF3] sm:inline"
            >
              Projects
            </Link>
            <span aria-current="page" className="font-semibold text-[#22D3EE]">
              Teams
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#22D3EE]">
              WORKSPACE
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Teams</h1>
            <p className="mt-2 text-sm leading-6 text-[#9DA7B3]">
              Organize people and collaborate on projects.
            </p>
          </div>

          {canCreateTeam && (
            <button
              type="button"
              onClick={toggleTeamForm}
              className="min-h-11 rounded-lg bg-[#22D3EE] px-5 py-3 text-sm font-semibold text-[#0D1117] transition hover:bg-[#A5F3FC] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
            >
              {showTeamForm ? "Cancel" : "+ Create team"}
            </button>
          )}
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

        {showTeamForm && canCreateTeam && (
          <section className="mt-6 rounded-2xl border border-[#30363D] bg-[#161B22] p-6">
            <h2 className="text-lg font-semibold">Create a team</h2>

            <form onSubmit={handleCreateTeam} className="mt-5 space-y-5">
              <div>
                <label htmlFor="team-name" className={LABEL_CLASS}>
                  Team name
                </label>
                <input
                  id="team-name"
                  name="name"
                  value={teamForm.name}
                  onChange={handleTeamFormChange}
                  minLength={2}
                  maxLength={80}
                  required
                  placeholder="e.g. Product Engineering"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="team-description" className={LABEL_CLASS}>
                  Description (optional)
                </label>
                <textarea
                  id="team-description"
                  name="description"
                  value={teamForm.description}
                  onChange={handleTeamFormChange}
                  maxLength={500}
                  rows={3}
                  placeholder="What does this team work on?"
                  className={INPUT_CLASS}
                />
              </div>

              <button
                type="submit"
                disabled={creatingTeam}
                className="min-h-11 rounded-lg bg-[#22D3EE] px-5 py-2.5 text-sm font-semibold text-[#0D1117] transition hover:bg-[#A5F3FC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingTeam ? "Creating..." : "Create team"}
              </button>
            </form>
          </section>
        )}

        {teams.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-[#3B4653] bg-[#161B22] p-10 text-center">
            <h2 className="text-lg font-semibold">No teams yet</h2>
            <p className="mt-2 text-sm leading-6 text-[#9DA7B3]">
              {canCreateTeam
                ? "Create your first team to start collaborating."
                : "You have not joined a team yet. Ask a team admin to add you."}
            </p>
          </section>
        ) : (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-[#30363D] bg-[#161B22] p-4">
              <h2 className="px-2 pb-3 text-xs font-semibold tracking-wider text-[#9DA7B3]">
                YOUR TEAMS ({teams.length})
              </h2>

              <div className="space-y-2">
                {teams.map((team) => {
                  const isSelected =
                    String(team._id) === String(selectedTeamId);

                  return (
                    <button
                      key={team._id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => selectTeam(team._id)}
                      className={`w-full rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#22D3EE] ${
                        isSelected
                          ? "border-[#22D3EE]/30 bg-[#22D3EE]/10"
                          : "border-transparent hover:bg-[#1C2128]"
                      }`}
                    >
                      <p
                        className={`break-words font-semibold ${
                          isSelected ? "text-[#22D3EE]" : "text-[#E6EDF3]"
                        }`}
                      >
                        {team.name}
                      </p>
                      <p className="mt-1 text-xs text-[#9DA7B3]">
                        {team.members?.length || 0} members
                      </p>
                    </button>
                  );
                })}
              </div>
            </aside>

            {selectedTeam && (
              <section className="min-w-0 overflow-hidden rounded-2xl border border-[#30363D] bg-[#161B22]">
                <div className="flex flex-col justify-between gap-4 border-b border-[#30363D] p-6 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <h2 className="break-words text-2xl font-bold">
                      {selectedTeam.name}
                    </h2>
                    <p className="mt-2 break-words text-sm leading-6 text-[#9DA7B3]">
                      {selectedTeam.description ||
                        "No team description provided."}
                    </p>
                    <p className="mt-3 text-xs text-[#9DA7B3]">
                      Created by {selectedTeam.createdBy?.name || "Unknown"}
                    </p>
                    <p className="mt-1 text-xs text-[#9DA7B3]">
                      Your role:{" "}
                      <span className="font-medium text-[#E6EDF3]">
                        {formatRole(currentMembership?.role || "member")}
                      </span>
                    </p>
                  </div>

                  {canManageMembers && (
                    <button
                      type="button"
                      onClick={toggleMemberForm}
                      className="min-h-11 shrink-0 rounded-lg border border-[#30363D] px-4 py-2.5 text-sm font-semibold text-[#E6EDF3] transition hover:border-[#22D3EE]/40 hover:bg-[#1C2128] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
                    >
                      {showMemberForm ? "Cancel" : "+ Add member"}
                    </button>
                  )}
                </div>

                {showMemberForm && canManageMembers && (
                  <div className="border-b border-[#30363D] bg-[#1C2128]/50 p-6">
                    <h3 className="font-semibold">Add a team member</h3>
                    <p className="mt-1 text-sm leading-6 text-[#9DA7B3]">
                      Search by name or email and select a user.
                    </p>

                    <form onSubmit={handleAddMember} className="mt-5 space-y-5">
                      <div>
                        <label htmlFor="member-search" className={LABEL_CLASS}>
                          Find a member
                        </label>

                        {selectedUser ? (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#22D3EE]/20 bg-[#22D3EE]/5 p-3">
                            <div className="min-w-0">
                              <p className="break-words font-medium">
                                {selectedUser.name}
                              </p>
                              <p className="break-all text-sm text-[#9DA7B3]">
                                {selectedUser.email}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(null);
                                setUserSearch("");
                                setUserResults([]);
                              }}
                              className="shrink-0 text-sm font-semibold text-[#22D3EE] hover:text-[#A5F3FC]"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              id="member-search"
                              value={userSearch}
                              onChange={(event) => {
                                setUserSearch(event.target.value);
                                setError("");
                              }}
                              placeholder="Search by name or email"
                              autoComplete="off"
                              className={INPUT_CLASS}
                            />

                            {searchingUsers && (
                              <p className="mt-2 text-sm text-[#9DA7B3]">
                                Searching users...
                              </p>
                            )}

                            {!searchingUsers &&
                              userSearch.trim().length >= 2 &&
                              userResults.length === 0 && (
                                <p className="mt-2 text-sm text-[#9DA7B3]">
                                  No matching active users found.
                                </p>
                              )}

                            {userResults.length > 0 && (
                              <div className="mt-2 overflow-hidden rounded-xl border border-[#30363D] bg-[#0D1117]">
                                {userResults.map((user) => (
                                  <button
                                    key={user._id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setUserSearch("");
                                      setUserResults([]);
                                      setError("");
                                    }}
                                    className="block w-full border-b border-[#30363D] px-4 py-3 text-left last:border-0 transition hover:bg-[#1C2128] focus:outline-none focus:bg-[#1C2128]"
                                  >
                                    <span className="block font-medium">
                                      {user.name}
                                    </span>
                                    <span className="mt-0.5 block break-all text-sm text-[#9DA7B3]">
                                      {user.email}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div>
                        <label htmlFor="member-role" className={LABEL_CLASS}>
                          Role
                        </label>
                        <select
                          id="member-role"
                          name="role"
                          value={memberForm.role}
                          onChange={handleMemberFormChange}
                          className={INPUT_CLASS}
                        >
                          <option value="member">Member</option>
                          <option value="lead">Lead</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={addingMember || !selectedUser}
                        className="min-h-11 w-full rounded-lg bg-[#22D3EE] px-4 py-3 text-sm font-semibold text-[#0D1117] transition hover:bg-[#A5F3FC] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {addingMember ? "Adding..." : "Add to team"}
                      </button>
                    </form>
                  </div>
                )}

                <div className="p-5 sm:p-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-semibold">Team members</h3>
                    <span className="text-sm text-[#9DA7B3]">
                      {selectedTeam.members?.length || 0} total
                    </span>
                  </div>

                  {selectedTeam.members?.length ? (
                    <div className="divide-y divide-[#30363D]">
                      {selectedTeam.members.map((member, index) => {
                        const user =
                          member.user && typeof member.user === "object"
                            ? member.user
                            : null;

                        return (
                          <div
                            key={
                              getUserId(member.user) ||
                              `${selectedTeam._id}-${index}`
                            }
                            className="flex items-center justify-between gap-4 py-4"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#22D3EE]/20 bg-[#22D3EE]/10 text-sm font-semibold text-[#22D3EE]">
                                {getInitials(user?.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {user?.name || "Unknown user"}
                                </p>
                                <p className="truncate text-sm text-[#9DA7B3]">
                                  {user?.email || "User details unavailable"}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                                ROLE_STYLES[member.role] ||
                                ROLE_STYLES.member
                              }`}
                            >
                              {formatRole(member.role)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-[#9DA7B3]">
                      No team members to display.
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        <footer className="pt-8 text-center text-xs text-[#6E7885]">
          IssueFlow · Team workspace
        </footer>
      </div>
    </main>
  );
}