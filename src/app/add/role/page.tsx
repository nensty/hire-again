import { AddPage } from "@/components/add-page";
export const metadata = { title: "Share a role" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  return <AddPage kind="role" edit={(await searchParams).edit} />;
}
