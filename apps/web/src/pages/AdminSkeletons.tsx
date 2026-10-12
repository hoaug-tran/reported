import React from "react";
import {
  Box,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useThemeContext } from "../contexts/ThemeContext";

export const OverviewSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();
  const barHeights = [45, 75, 35, 85, 60, 40, 95, 50, 70, 65, 80, 55, 90, 70];

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            xl: "repeat(5, 1fr)",
          },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        {[...Array(5)].map((_, i) => (
          <Paper
            key={i}
            sx={{
              p: 2.4,
              backgroundColor: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: "8px",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Skeleton variant="text" width={110} height={18} />
              <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: "6px" }} />
            </Box>
            <Skeleton variant="text" width={80} height={42} sx={{ mt: 1.2, mb: 0.6 }} />
            <Skeleton variant="text" width={140} height={18} />
          </Paper>
        ))}
      </Box>

      <Paper
        sx={{
          p: { xs: 2.2, sm: 3 },
          mb: 3.5,
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: "12px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <Skeleton variant="rounded" width={34} height={34} sx={{ borderRadius: "8px" }} />
            <Box>
              <Skeleton variant="text" width={280} height={26} />
              <Box sx={{ display: "flex", gap: 1, mt: 0.8 }}>
                <Skeleton variant="rounded" width={85} height={22} sx={{ borderRadius: "20px" }} />
                <Skeleton variant="rounded" width={110} height={22} sx={{ borderRadius: "16px" }} />
                <Skeleton variant="rounded" width={90} height={22} sx={{ borderRadius: "16px" }} />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 2, p: 1, borderRadius: "8px", border: `1px solid ${tokens.border}` }}>
            <Skeleton variant="text" width={60} height={18} />
            <Skeleton variant="text" width={60} height={18} />
            <Skeleton variant="text" width={60} height={18} />
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(7, 1fr)", sm: "repeat(14, 1fr)" },
            gap: { xs: 1, sm: 1.4 },
            alignItems: "flex-end",
            height: 220,
            pt: 2,
            pb: 1,
          }}
        >
          {barHeights.map((h, i) => (
            <Box key={i} sx={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              <Skeleton variant="text" width={22} height={16} sx={{ mb: 0.8 }} />
              <Box sx={{ width: "100%", maxWidth: 34, height: 125, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <Skeleton variant="rounded" width="100%" height={`${h}%`} sx={{ borderRadius: "6px 6px 0 0" }} />
              </Box>
              <Box sx={{ mt: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Skeleton variant="text" width={30} height={14} />
                <Skeleton variant="text" width={36} height={16} />
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2.5, mb: 3.5 }}>
        {[...Array(3)].map((_, i) => (
          <Paper key={i} sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
            <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.6 }}>
              {[...Array(4)].map((_, j) => (
                <Box key={j} sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Skeleton variant="circular" width={14} height={14} />
                      <Skeleton variant="text" width={110} height={18} />
                    </Box>
                    <Skeleton variant="rounded" width={34} height={22} sx={{ borderRadius: "12px" }} />
                  </Box>
                  <Skeleton variant="rounded" height={4} sx={{ borderRadius: 2 }} />
                </Box>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>

      <Paper sx={{ p: 3, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
          <Skeleton variant="text" width={240} height={26} />
          <Skeleton variant="text" width={140} height={20} />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" }, gap: 2 }}>
          {[...Array(5)].map((_, i) => (
            <Box key={i} sx={{ p: 2, borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: tokens.surfaceSecondary }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 1.2 }}>
                <Skeleton variant="circular" width={34} height={34} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="80%" height={18} />
                  <Skeleton variant="text" width="50%" height={14} />
                </Box>
              </Box>
              <Skeleton variant="rounded" width={90} height={22} sx={{ borderRadius: "12px" }} />
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export const WorkspacesSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2 }}>
        <Skeleton variant="rounded" width={360} height={38} sx={{ borderRadius: "6px" }} />
        <Skeleton variant="rounded" width={150} height={38} sx={{ borderRadius: "6px" }} />
      </Box>
      <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
        <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2 } }}>
          <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: "30%" }}>Workspace</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "20%" }}>Chủ sở hữu</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "10%" }}>Thành viên</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "10%" }}>Dự án</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "10%" }}>Issues</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "10%" }}>Ngày tạo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: "10%" }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(6)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.4 }}>
                    <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: "8px" }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width={140} height={20} />
                      <Skeleton variant="text" width={80} height={16} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="text" width={110} height={18} />
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={34} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={34} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={34} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={85} height={18} />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.8 }}>
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const ProjectsSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2.5 }}>
        <Skeleton variant="rounded" width={360} height={38} sx={{ borderRadius: "6px" }} />
        <Skeleton variant="rounded" width={140} height={38} sx={{ borderRadius: "6px" }} />
      </Box>
      <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
        <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2 } }}>
          <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: "12%" }}>Key</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "35%" }}>Tên Dự Án</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "23%" }}>Workspace</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "10%" }}>Issues</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "10%" }}>Ngày tạo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: "10%" }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(6)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton variant="rounded" width={48} height={24} sx={{ borderRadius: "12px" }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={160} height={20} />
                  <Skeleton variant="text" width={220} height={16} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={130} height={18} />
                  <Skeleton variant="text" width={80} height={14} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={34} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={85} height={18} />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.8 }}>
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const UsersSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 1.5, flex: 1, maxWidth: 600 }}>
          <Skeleton variant="rounded" width="70%" height={38} sx={{ borderRadius: "6px" }} />
          <Skeleton variant="rounded" width={150} height={38} sx={{ borderRadius: "6px" }} />
        </Box>
        <Skeleton variant="rounded" width={150} height={38} sx={{ borderRadius: "6px" }} />
      </Box>
      <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
        <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2 } }}>
          <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: "24%" }}>Thành viên</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "22%" }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "18%" }}>Vai trò</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "8%" }}>Workspaces</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "8%" }}>Bài viết</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "8%" }}>Bình luận</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "10%" }}>Ngày tạo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: "12%" }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(6)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.4 }}>
                    <Skeleton variant="circular" width={34} height={34} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width={120} height={20} />
                      <Skeleton variant="text" width={75} height={16} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={160} height={18} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rounded" width={110} height={24} sx={{ borderRadius: "12px" }} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={32} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={32} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={32} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={85} height={18} />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.8 }}>
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const PostsSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={300} height={38} sx={{ borderRadius: "6px" }} />
        <Skeleton variant="rounded" width={150} height={38} sx={{ borderRadius: "6px" }} />
        <Skeleton variant="rounded" width={150} height={38} sx={{ borderRadius: "6px" }} />
        <Skeleton variant="rounded" width={180} height={38} sx={{ borderRadius: "6px" }} />
      </Box>
      <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
        <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2 } }}>
          <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: "35%" }}>Bài viết</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "15%" }}>Workspace</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "15%" }}>Tác giả</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "15%" }}>Trạng thái</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "8%" }}>Bình luận</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "10%" }}>Ngày tạo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: "12%" }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(6)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                    <Skeleton variant="rounded" width={90} height={22} sx={{ borderRadius: "12px" }} />
                    <Skeleton variant="text" width={220} height={20} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={110} height={18} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={90} height={18} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rounded" width={100} height={24} sx={{ borderRadius: "12px" }} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={32} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={85} height={18} />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.8 }}>
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const CommentsSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={340} height={38} sx={{ borderRadius: "6px" }} />
        <Skeleton variant="rounded" width={160} height={38} sx={{ borderRadius: "6px" }} />
      </Box>
      <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
        <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2 } }}>
          <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: "18%" }}>Tác giả</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "20%" }}>Bài viết</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "32%" }}>Nội dung</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "8%" }}>Likes</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "10%" }}>Trạng thái</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: "12%" }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(6)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="text" width={90} height={18} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={140} height={18} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="90%" height={18} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={32} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rounded" width={75} height={24} sx={{ borderRadius: "12px" }} />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.8 }}>
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const ReactionsSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        <Skeleton variant="rounded" width={180} height={38} sx={{ borderRadius: "6px" }} />
      </Box>
      <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
        <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2 } }}>
          <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: "20%" }}>Thành viên</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "15%" }}>Biểu tượng</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "30%" }}>Bình luận mục tiêu</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "20%" }}>Bài viết</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "10%" }}>Thời gian</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: "5%" }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(6)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="text" width={90} height={18} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Skeleton variant="circular" width={16} height={16} />
                    <Skeleton variant="text" width={80} height={18} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="85%" height={18} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={140} height={18} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={110} height={16} />
                </TableCell>
                <TableCell align="right">
                  <Skeleton variant="rounded" width={28} height={28} sx={{ ml: "auto", borderRadius: "6px" }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const LabelsSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2.5 }}>
        <Skeleton variant="rounded" width={320} height={38} sx={{ borderRadius: "6px" }} />
        <Skeleton variant="rounded" width={140} height={38} sx={{ borderRadius: "6px" }} />
      </Box>
      <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
        <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2 } }}>
          <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: "20%" }}>Nhãn</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "35%" }}>Mô tả</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "20%" }}>Workspace</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "10%" }}>Issues sử dụng</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "10%" }}>Ngày tạo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: "10%" }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(6)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                    <Skeleton variant="circular" width={14} height={14} />
                    <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: "12px" }} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={200} height={18} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={110} height={18} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={32} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={85} height={18} />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.8 }}>
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: "6px" }} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const RepositoriesSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
        <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2 } }}>
          <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: "30%" }}>Repositories</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "25%" }}>Workspace</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "15%" }}>Default Branch</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "12%" }}>Pull Requests</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "10%" }}>Ngày liên kết</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: "8%" }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                    <Skeleton variant="circular" width={18} height={18} />
                    <Skeleton variant="text" width={180} height={20} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={130} height={18} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rounded" width={60} height={24} sx={{ borderRadius: "12px" }} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="rounded" width={32} height={24} sx={{ mx: "auto", borderRadius: "12px" }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={85} height={18} />
                </TableCell>
                <TableCell align="right">
                  <Skeleton variant="rounded" width={28} height={28} sx={{ ml: "auto", borderRadius: "6px" }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const QueuesSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Skeleton variant="text" width={260} height={26} />
          <Skeleton variant="text" width={360} height={18} />
        </Box>
        <Skeleton variant="rounded" width={160} height={38} sx={{ borderRadius: "6px" }} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
        {[...Array(2)].map((_, i) => (
          <Paper key={i} sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2 }}>
              <Skeleton variant="circular" width={18} height={18} />
              <Skeleton variant="text" width={160} height={22} />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
              {[...Array(4)].map((_, j) => (
                <Box key={j} sx={{ p: 1.6, borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: tokens.surfaceSecondary }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.8 }}>
                    <Skeleton variant="text" width={140} height={20} />
                    <Skeleton variant="rounded" width={85} height={22} sx={{ borderRadius: "12px" }} />
                  </Box>
                  <Skeleton variant="text" width="90%" height={16} />
                </Box>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export const AuditLogsSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
        <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2 } }}>
          <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: "18%" }}>Thời gian</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "18%" }}>Người thực hiện</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "18%" }}>Hành động</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "18%" }}>Tài nguyên</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "16%" }}>Địa chỉ IP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: "12%" }}>Chi tiết</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(7)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton variant="text" width={130} height={18} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="text" width={100} height={18} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Skeleton variant="rounded" width={110} height={24} sx={{ borderRadius: "12px" }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={95} height={18} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={85} height={18} />
                </TableCell>
                <TableCell align="right">
                  <Skeleton variant="rounded" width={75} height={28} sx={{ ml: "auto", borderRadius: "6px" }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const DiagnosticsSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 3.5, flexWrap: "wrap" }}>
        <Box>
          <Skeleton variant="text" width={320} height={28} />
          <Skeleton variant="text" width={480} height={20} />
        </Box>
        <Box sx={{ display: "flex", gap: 1.4 }}>
          <Skeleton variant="rounded" width={120} height={38} sx={{ borderRadius: "6px" }} />
          <Skeleton variant="rounded" width={180} height={38} sx={{ borderRadius: "6px" }} />
          <Skeleton variant="rounded" width={140} height={38} sx={{ borderRadius: "6px" }} />
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2.5,
          mb: 3.5,
        }}
      >
        {[...Array(4)].map((_, i) => (
          <Paper key={i} sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Skeleton variant="text" width={130} height={18} />
              <Skeleton variant="circular" width={22} height={22} />
            </Box>
            <Skeleton variant="text" width={90} height={48} sx={{ mt: 1.2 }} />
            <Skeleton variant="rounded" width={100} height={22} sx={{ mt: 0.8, borderRadius: "12px" }} />
          </Paper>
        ))}
      </Box>

      <Skeleton variant="text" width={300} height={22} sx={{ mb: 2 }} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" },
          gap: 2,
          mb: 3.5,
        }}
      >
        {[...Array(10)].map((_, i) => (
          <Paper key={i} sx={{ p: 2.2, backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
            <Skeleton variant="text" width={90} height={18} />
            <Skeleton variant="text" width={55} height={36} sx={{ mt: 0.6 }} />
          </Paper>
        ))}
      </Box>
    </Box>
  );
};
