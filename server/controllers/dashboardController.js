
import Team from "../models/Team.js";
import Project from "../models/Project.js";
import Issue from "../models/Issue.js";

const ISSUE_STATUSES = ["open", "in_progress", "blocked", "resolved"];

export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const teams = await Team.find({
      "members.user": userId,
    }).select("_id");

    const teamIds = teams.map((team) => team._id);

    const issueFilter = {
      team: { $in: teamIds },
    };

    const projectFilter = {
      team: { $in: teamIds },
    };

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      archivedProjects,
      totalIssues,
      statusCounts,
      assignedToMe,
      reportedByMe,
      recentIssues,
    ] = await Promise.all([
      Project.countDocuments(projectFilter),
      Project.countDocuments({ ...projectFilter, status: "active" }),
      Project.countDocuments({ ...projectFilter, status: "completed" }),
      Project.countDocuments({ ...projectFilter, status: "archived" }),
      Issue.countDocuments(issueFilter),
      Issue.aggregate([
        { $match: issueFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Issue.countDocuments({
        ...issueFilter,
        assignee: userId,
      }),
      Issue.countDocuments({
        ...issueFilter,
        reporter: userId,
      }),
      Issue.find(issueFilter)
        .sort({ updatedAt: -1, _id: -1 })
        .limit(5)
        .populate("project", "name key")
        .populate("assignee", "name email")
        .populate("reporter", "name email")
        .populate("team", "name"),
    ]);

    const issuesByStatus = Object.fromEntries(
      ISSUE_STATUSES.map((status) => [status, 0])
    );

    for (const item of statusCounts) {
      if (Object.hasOwn(issuesByStatus, item._id)) {
        issuesByStatus[item._id] = item.count;
      }
    }

    return res.status(200).json({
      success: true,
      summary: {
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          archived: archivedProjects,
        },
        issues: {
          total: totalIssues,
          byStatus: issuesByStatus,
          assignedToMe,
          reportedByMe,
        },
        recentIssues,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve dashboard summary",
    });
  }
};
