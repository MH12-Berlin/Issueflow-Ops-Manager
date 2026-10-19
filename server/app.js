import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import teamProjectRoutes from "./routes/teamProjectRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import projectIssueRoutes from "./routes/projectIssueRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "IssueFlow API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/teams/:teamId/projects", teamProjectRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/projects/:projectId/issues", projectIssueRoutes);
app.use("/api/dashboard", dashboardRoutes);

export default app;
