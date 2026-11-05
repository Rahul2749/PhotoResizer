import { notFound } from "next/navigation";
import ToolPage from "../../components/tool-page";
import { toolPages } from "../../lib/tool-pages";
import { pageMetadata } from "../../lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return toolPages.map(({ slug }) => ({ tool: slug })); }
export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await params, tool = toolPages.find((item) => item.slug === slug);
  if (!tool) notFound();
  return pageMetadata(`/${tool.slug}`, tool.title, tool.description);
}
export default async function Page({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await params, tool = toolPages.find((item) => item.slug === slug);
  if (!tool) notFound();
  return <ToolPage tool={tool}/>;
}
