
import PageContainer from "@/app/components/container/PageContainer";
import Events from "@/app/components/shared/Events";


export default function SamplePage() {

  return (
    <PageContainer title="Events" description="Manage events and activities">
      <Events/>
    </PageContainer>
  );
};

export const metadata = { title: "My Page" };
