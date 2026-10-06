import PageContainer from "@/app/components/container/PageContainer";
import Blogs from "@/app/components/shared/Blogs";

export default function BlogsPage() {
  return (
    <PageContainer title="Blogs" description="Write, schedule and publish blog posts">
      <Blogs />
    </PageContainer>
  );
}

export const metadata = { title: "Blogs" };
