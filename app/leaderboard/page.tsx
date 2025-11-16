import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LeaderboardPage() {
  // Redirect to home page - leaderboard is now on the main page
  redirect('/');
}
