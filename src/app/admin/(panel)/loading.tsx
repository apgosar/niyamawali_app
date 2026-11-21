import { AdminSkeleton } from "@/components/Skeletons";

// Shown instantly when an admin taps a menu item; the header and menu stay in place.
export default function Loading() {
  return <AdminSkeleton />;
}
