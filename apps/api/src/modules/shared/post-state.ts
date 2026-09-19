import { db, eq, issues, reviewRequests } from "@reported/database";
import { TargetType } from "@reported/contracts";
import { AppError } from "../../middleware/error.js";

export async function assertActivePost(targetType: TargetType, targetId: string) {
  if (targetType === TargetType.ISSUE) {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, targetId),
    });
    if (!issue) throw new AppError(404, "ISSUE_NOT_FOUND", "Issue not found");
    if (issue.isDeleted) {
      throw new AppError(409, "POST_DELETED", "Deleted posts cannot be modified");
    }
    return issue;
  }

  if (targetType === TargetType.REVIEW) {
    const review = await db.query.reviewRequests.findFirst({
      where: eq(reviewRequests.id, targetId),
    });
    if (!review) {
      throw new AppError(404, "REVIEW_NOT_FOUND", "Review request not found");
    }
    if (review.isDeleted) {
      throw new AppError(409, "POST_DELETED", "Deleted posts cannot be modified");
    }
    return review;
  }

  throw new AppError(400, "INVALID_TARGET_TYPE", "Unsupported target type");
}
