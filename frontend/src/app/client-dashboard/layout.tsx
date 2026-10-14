import ProtectedRoute from "@/components/layout/ProtectedRoute";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute role="client">
      {children}
    </ProtectedRoute>
  );
}
