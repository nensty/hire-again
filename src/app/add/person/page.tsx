import { AddPage } from "@/components/add-page";
export const metadata = { title: "Add yourself" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  return <AddPage kind="candidate" edit={(await searchParams).edit} />;
}
