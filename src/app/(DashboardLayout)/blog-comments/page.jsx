import { Suspense } from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlogComments from "@/app/components/blogs/BlogComments";

export default function BlogCommentsPage() {
  return (
    <PageContainer title="Blog comments" description="Moderate comments on blog posts">
      <Suspense fallback={null}>
        <BlogComments />
      </Suspense>
    </PageContainer>
  );
}

export const metadata = { title: "Blog comments" };
