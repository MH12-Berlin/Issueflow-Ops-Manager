
import Activity from "../models/Activity.js";

export const recordActivity = async (
  { issue, actor, action, changes = {} },
  session
) => {
  const [activity] = await Activity.create(
    [
      {
        issue,
        actor,
        action,
        changes,
      },
    ],
    { session }
  );

  return activity;
};
