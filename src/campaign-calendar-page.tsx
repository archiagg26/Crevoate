import { useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import type { CalendarEntry } from "./campaign-ideas";
import { ContentCalendar } from "./content-calendar";
import { updateCampaignCalendar } from "./data";
import { Notice, Page, useRows } from "./ui";

export function CampaignCalendarPage() {
  const { id } = useParams();
  const campaigns = useRows("campaigns");
  const row = campaigns.rows.find((item) => item.id === id);
  const [pending, setPending] = useState<{
    base: typeof row;
    entries: CalendarEntry[];
  }>();
  const visibleEntries = pending?.base === row ? pending?.entries : undefined;
  let body: ReactNode = <p role="status">Loading campaign calendar...</p>;
  if (row) {
    body = (
      <ContentCalendar
        campaign={row.data}
        campaignId={row.id}
        editCampaign={"/planner?edit=" + row.id}
        entries={visibleEntries ?? row.data.calendar ?? []}
        change={async (next) => {
          const previous = visibleEntries ?? row.data.calendar ?? [];
          try {
            await updateCampaignCalendar(row.id, previous, next);
            setPending({ base: row, entries: next });
          } catch (cause) {
            setPending(undefined);
            throw cause;
          } finally {
            campaigns.refresh();
          }
        }}
      />
    );
  } else if (!campaigns.loading) {
    body = (
      <Notice error={campaigns.error || "This campaign is unavailable."} />
    );
  }
  return (
    <Page label="Campaign planner" title="Campaign content calendar">
      {body}
    </Page>
  );
}
