
import User from "../models/User.js";

export const searchUsers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    if (search.length < 2) {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    const escapedSearch = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const filter = {
      isActive: true,
      $or: [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ],
    };

    if (req.user?.id) {
      filter._id = { $ne: req.user.id };
    }

    const users = await User.find(filter)
      .select("_id name email")
      .sort({ name: 1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Search users error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to search users",
    });
  }
};
