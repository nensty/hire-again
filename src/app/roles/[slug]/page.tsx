import { DetailPage } from "@/components/detail-page";
import { getDirectory } from "@/lib/data";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = (await getDirectory()).roles.find((r) => r.slug === slug);
  return {
    title: listing
      ? `${listing.role_title} at ${listing.company_name}`
      : "Role unavailable",
    openGraph: {
      title: listing
        ? `${listing.company_name} is hiring a ${listing.role_title}`
        : "People I’d Hire Again",
      description: listing
        ? `${listing.location} · ${listing.skills.slice(0, 5).join(" · ")}`
        : "Good teams finding good people.",
    },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <DetailPage kind="role" slug={(await params).slug} />;
}
