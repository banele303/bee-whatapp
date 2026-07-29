import { auth } from "@clerk/nextjs/server";

import { BookingsScreen } from "@/components/dashboard/bookings-screen";

export default async function BookingsPage() {
  await auth.protect();

  return <BookingsScreen />;
}
