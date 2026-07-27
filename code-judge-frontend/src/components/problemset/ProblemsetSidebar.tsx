import SidebarCard from "./SidebarCard";
import PayAttentionWidget from "./PayAttentionWidget";
import FilterProblemsWidget from "./FilterProblemsWidget";
import SettingsWidget from "./SettingsWidget";
import LastUnsolvedWidget from "./LastUnsolvedWidget";

export default function ProblemsetSidebar() {
  return (
    <aside className="flex flex-col gap-2">
      <SidebarCard title="Pay attention">
        <PayAttentionWidget />
      </SidebarCard>
      <SidebarCard title="Filter problems">
        <FilterProblemsWidget />
      </SidebarCard>
      <SidebarCard title="Settings">
        <SettingsWidget />
      </SidebarCard>
      <SidebarCard title="Last unsolved">
        <LastUnsolvedWidget />
      </SidebarCard>
    </aside>
  );
}