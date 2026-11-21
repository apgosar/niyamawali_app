import { redirect } from "next/navigation";

// Rankings are not shown to students any more. Old bookmarks / installed-app links land on the home screen.
export default function LeaderboardGone() {
  redirect("/");
}
