import React from "react";
import SdRsvpPage from "./SdRsvpPage";
import { SD_EVENTS } from "./sdEvents";

export default function ChowCall() {
  return <SdRsvpPage event={SD_EVENTS.chowCall} />;
}

