import ProtectedRoute from "@/components/layout/ProtectedRoute";

export default function AttorneyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute role="lawyer">
      {children}
    </ProtectedRoute>
  );
}
