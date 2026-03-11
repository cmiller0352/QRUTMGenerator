import React from "react";
import SdRsvpPage from "./SdRsvpPage";
import { SD_EVENTS } from "./sdEvents";
import { chowCallGuestMembers, sdTeamMembers } from "./sdTeamData";

export default function ChowCall() {
  return (
    <SdRsvpPage
      event={{
        ...SD_EVENTS.chowCall,
        teamMembers: [...sdTeamMembers, ...chowCallGuestMembers],
      }}
    />
  );
}
