import PageContainer from "@/app/components/container/PageContainer";
import Groups from '@/app/components/shared/Groups';


export default function GroupsPage() {
  return (
    <PageContainer title="Groups" description="Every group in the app, for clean-up and moderation">
      <Groups/>
    </PageContainer>
  );
};

export const metadata = { title: "Groups" };
