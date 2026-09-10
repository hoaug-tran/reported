import React from "react";
import { Box, Skeleton, Card, CardContent } from "@mui/material";
import { useThemeContext } from "../../contexts/ThemeContext";

const smoothFadeSx = {
  animation: "smoothSkeletonFade 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards",
  "@keyframes smoothSkeletonFade": {
    "0%": { opacity: 0.2 },
    "100%": { opacity: 1 },
  },
};

export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  const { tokens } = useThemeContext();

  return (
    <Box
      sx={{
        ...smoothFadeSx,
        backgroundColor: tokens.surface,
        borderRadius: "8px",
        border: `1px solid ${tokens.border}`,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${tokens.border}`,
          display: "flex",
          gap: 2,
          alignItems: "center",
        }}
      >
        <Skeleton
          variant="rectangular"
          width={140}
          height={28}
          sx={{ borderRadius: 1 }}
        />
        <Skeleton
          variant="rectangular"
          width={100}
          height={28}
          sx={{ borderRadius: 1 }}
        />
      </Box>
      {Array.from({ length: rows }).map((_, idx) => (
        <Box
          key={idx}
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom:
              idx < rows - 1 ? `1px solid ${tokens.border}` : "none",
            gap: 2,
          }}
        >
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}
          >
            <Skeleton variant="circular" width={20} height={20} />
            <Box sx={{ flex: 1, maxWidth: 500 }}>
              <Skeleton variant="text" width="80%" height={24} />
              <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                <Skeleton variant="text" width={60} height={18} />
                <Skeleton variant="text" width={120} height={18} />
                <Skeleton
                  variant="rectangular"
                  width={45}
                  height={18}
                  sx={{ borderRadius: 1 }}
                />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width={50} height={20} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export const DetailSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box
      sx={{
        ...smoothFadeSx,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "1fr 340px" },
        gap: 3.5,
        alignItems: "start",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Skeleton variant="text" width="70%" height={40} sx={{ mb: 1 }} />
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Skeleton
              variant="rectangular"
              width={80}
              height={26}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton variant="text" width={200} height={20} />
          </Box>
        </Box>

        <Box
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: "8px",
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surface,
          }}
        >
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Skeleton variant="text" width="30%" height={16} />
              <Skeleton variant="text" width="90%" height={24} />
            </Box>
            <Box>
              <Skeleton variant="text" width="30%" height={16} />
              <Skeleton variant="text" width="90%" height={24} />
            </Box>
          </Box>
          <Skeleton
            variant="rectangular"
            width="100%"
            height={80}
            sx={{ borderRadius: 1 }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={140}
            sx={{ borderRadius: "8px" }}
          />
        </Box>

        <Box sx={{ mt: 3, pt: 2 }}>
          <Skeleton variant="text" width={140} height={28} sx={{ mb: 2 }} />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={100}
            sx={{ borderRadius: "8px", mb: 2 }}
          />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={100}
            sx={{ borderRadius: "8px" }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          p: 2.5,
          borderRadius: "8px",
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
        }}
      >
        <Box>
          <Skeleton variant="text" width={60} height={16} sx={{ mb: 0.5 }} />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={36}
            sx={{ borderRadius: 1 }}
          />
        </Box>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={36}
          sx={{ borderRadius: 1 }}
        />
        <Skeleton variant="text" width="100%" height={1} />
        <Box>
          <Skeleton variant="text" width={80} height={16} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width={140} height={20} />
        </Box>
        <Box>
          <Skeleton variant="text" width={100} height={16} sx={{ mb: 0.8 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Skeleton variant="circular" width={22} height={22} />
            <Skeleton variant="text" width={120} height={20} />
          </Box>
        </Box>
        <Box>
          <Skeleton variant="text" width={60} height={16} sx={{ mb: 0.8 }} />
          <Box sx={{ display: "flex", gap: 0.8 }}>
            <Skeleton
              variant="rectangular"
              width={50}
              height={22}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width={65}
              height={22}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export const DashboardSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box
      sx={{ ...smoothFadeSx, display: "flex", flexDirection: "column", gap: 3 }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card
            key={idx}
            sx={{
              backgroundColor: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: "8px",
              p: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Skeleton variant="text" width="50%" height={20} />
              <Skeleton variant="circular" width={24} height={24} />
            </Box>
            <Skeleton variant="text" width="30%" height={36} />
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 340px" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Skeleton
            variant="rectangular"
            width="100%"
            height={240}
            sx={{ borderRadius: "8px" }}
          />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={320}
            sx={{ borderRadius: "8px" }}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Skeleton
            variant="rectangular"
            width="100%"
            height={200}
            sx={{ borderRadius: "8px" }}
          />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={200}
            sx={{ borderRadius: "8px" }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export const AppShellSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box
      sx={{
        ...smoothFadeSx,
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: tokens.background,
      }}
    >
      <Box
        sx={{
          width: 240,
          height: "100vh",
          backgroundColor: tokens.surface,
          borderRight: `1px solid ${tokens.border}`,
          p: 2,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={110} height={26} />
        </Box>
        {Array.from({ length: 7 }).map((_, idx) => (
          <Skeleton
            key={idx}
            variant="rectangular"
            width="100%"
            height={36}
            sx={{ borderRadius: 1 }}
          />
        ))}
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: 60,
            px: 3,
            borderBottom: `1px solid ${tokens.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: tokens.surface,
          }}
        >
          <Skeleton variant="text" width={200} height={26} />
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Skeleton
              variant="rectangular"
              width={220}
              height={36}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
          </Box>
        </Box>
        <Box sx={{ flex: 1, p: 3, overflowY: "auto" }}>
          <DashboardSkeleton />
        </Box>
      </Box>
    </Box>
  );
};

export const ProjectGridSkeleton: React.FC<{ count?: number }> = ({
  count = 6,
}) => {
  const { tokens } = useThemeContext();

  return (
    <Box
      sx={{
        ...smoothFadeSx,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
        gap: 3,
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <Card
          key={idx}
          sx={{
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: "8px",
            p: 2.5,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 180,
          }}
        >
          <Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1.5,
              }}
            >
              <Skeleton variant="text" width="60%" height={26} />
              <Skeleton
                variant="rectangular"
                width={48}
                height={20}
                sx={{ borderRadius: 1 }}
              />
            </Box>
            <Skeleton variant="text" width="90%" height={18} />
            <Skeleton variant="text" width="70%" height={18} sx={{ mt: 0.5 }} />
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              mt: 3,
              pt: 1.5,
              borderTop: `1px solid ${tokens.border}`,
            }}
          >
            <Skeleton variant="text" width={70} height={18} />
            <Skeleton variant="text" width={70} height={18} />
          </Box>
        </Card>
      ))}
    </Box>
  );
};

export const RepositoryCardSkeleton: React.FC<{ count?: number }> = ({
  count = 4,
}) => {
  const { tokens } = useThemeContext();

  return (
    <Box
      sx={{ ...smoothFadeSx, display: "flex", flexDirection: "column", gap: 2 }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <Card
          key={idx}
          sx={{
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: "8px",
            p: 2.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width={200} height={24} />
              <Skeleton
                variant="rectangular"
                width={55}
                height={20}
                sx={{ borderRadius: 1 }}
              />
              <Skeleton
                variant="rectangular"
                width={70}
                height={20}
                sx={{ borderRadius: 1 }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Skeleton
                variant="rectangular"
                width={80}
                height={28}
                sx={{ borderRadius: 1 }}
              />
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton variant="circular" width={28} height={28} />
            </Box>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              mt: 2,
              pt: 1.5,
              borderTop: `1px solid ${tokens.border}`,
            }}
          >
            <Skeleton
              variant="rectangular"
              width={120}
              height={22}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </Card>
      ))}
    </Box>
  );
};

export const MemberTableSkeleton: React.FC<{ rows?: number }> = ({
  rows = 5,
}) => {
  const { tokens } = useThemeContext();

  return (
    <Box sx={{ ...smoothFadeSx, display: "flex", flexDirection: "column" }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <Box
          key={idx}
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${tokens.border}`,
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minWidth: 200,
            }}
          >
            <Skeleton variant="circular" width={36} height={36} />
            <Box>
              <Skeleton variant="text" width={120} height={20} />
              <Skeleton
                variant="text"
                width={80}
                height={14}
                sx={{ mt: 0.3 }}
              />
            </Box>
          </Box>
          <Skeleton
            variant="text"
            width={160}
            height={20}
            sx={{ display: { xs: "none", sm: "block" } }}
          />
          <Skeleton
            variant="rectangular"
            width={85}
            height={28}
            sx={{ borderRadius: "6px" }}
          />
          <Skeleton
            variant="text"
            width={90}
            height={18}
            sx={{ display: { xs: "none", md: "block" } }}
          />
          <Skeleton variant="circular" width={28} height={28} />
        </Box>
      ))}
    </Box>
  );
};

export const ConnectedAccountsSkeleton: React.FC = () => {
  const { tokens } = useThemeContext();

  return (
    <Box
      sx={{
        ...smoothFadeSx,
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        maxWidth: 640,
      }}
    >
      {Array.from({ length: 3 }).map((_, idx) => (
        <Box
          key={idx}
          sx={{
            p: 2.5,
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box>
              <Skeleton variant="text" width={100} height={22} />
              <Skeleton
                variant="text"
                width={140}
                height={16}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
          <Skeleton
            variant="rectangular"
            width={110}
            height={32}
            sx={{ borderRadius: 1 }}
          />
        </Box>
      ))}
    </Box>
  );
};

export const PostFeedSkeleton: React.FC<{ count?: number }> = ({
  count = 4,
}) => {
  const { tokens } = useThemeContext();

  return (
    <Box
      sx={{
        ...smoothFadeSx,
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <Card
          key={idx}
          sx={{
            p: 2.5,
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: "8px",
          }}
        >
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}
          >
            <Skeleton variant="circular" width={32} height={32} />
            <Box>
              <Skeleton variant="text" width={120} height={18} />
              <Skeleton variant="text" width={80} height={14} />
            </Box>
          </Box>
          <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="100%" height={18} />
          <Skeleton variant="text" width="60%" height={18} sx={{ mb: 2 }} />
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              pt: 1.5,
              borderTop: `1px solid ${tokens.border}`,
            }}
          >
            <Skeleton
              variant="rectangular"
              width={50}
              height={22}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width={60}
              height={22}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width={70}
              height={22}
              sx={{ borderRadius: 1, ml: "auto" }}
            />
          </Box>
        </Card>
      ))}
    </Box>
  );
};
