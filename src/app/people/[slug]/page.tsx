import { DetailPage } from "@/components/detail-page";
import { getDirectory } from "@/lib/data";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = (await getDirectory()).people.find((p) => p.slug === slug);
  return {
    title: listing
      ? `${listing.full_name} · ${listing.target_role}`
      : "Profile unavailable",
    openGraph: {
      title: listing
        ? `${listing.full_name} is looking for their next team`
        : "People I’d Hire Again",
      description: listing
        ? `${listing.target_role} · ${listing.skills.slice(0, 5).join(" · ")}`
        : "Good people finding each other.",
    },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <DetailPage kind="candidate" slug={(await params).slug} />;
}
