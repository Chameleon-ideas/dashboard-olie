import PageContainer from "@/app/components/container/PageContainer";
import Reports from '@/app/components/shared/Reports';


export default function ReportsPage() {
  return (
    <PageContainer title="Reports" description="Review content and people reported in the app">
      <Reports/>
    </PageContainer>
  );
};

export const metadata = { title: "Reports" };
