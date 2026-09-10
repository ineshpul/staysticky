import { SearchPage } from "@/components/SearchPage";

export default async function SearchRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <SearchPage initialQuery={q || ""} />;
}
