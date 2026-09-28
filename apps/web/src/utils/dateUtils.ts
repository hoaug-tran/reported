import { TIME_CONSTANTS } from "../constants/index";

export const formatRelativeTime = (dateStr: string, isVi: boolean): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSec < TIME_CONSTANTS.oneMinuteSec) {
    return isVi ? "Vừa xong" : "Just now";
  }

  if (diffInSec < TIME_CONSTANTS.oneHourSec) {
    const mins = Math.floor(diffInSec / TIME_CONSTANTS.oneMinuteSec);
    return isVi ? `${mins} phút trước` : `${mins}m ago`;
  }

  if (diffInSec < TIME_CONSTANTS.oneDaySec) {
    const hours = Math.floor(diffInSec / TIME_CONSTANTS.oneHourSec);
    return isVi ? `${hours} giờ trước` : `${hours}h ago`;
  }

  if (diffInSec < TIME_CONSTANTS.oneMonthSec) {
    const days = Math.floor(diffInSec / TIME_CONSTANTS.oneDaySec);
    return isVi ? `${days} ngày trước` : `${days}d ago`;
  }

  if (diffInSec < TIME_CONSTANTS.oneYearSec) {
    const months = Math.floor(diffInSec / TIME_CONSTANTS.oneMonthSec);
    return isVi ? `${months} tháng trước` : `${months}mo ago`;
  }

  const years = Math.floor(diffInSec / TIME_CONSTANTS.oneYearSec);
  return isVi ? `${years} năm trước` : `${years}y ago`;
};
