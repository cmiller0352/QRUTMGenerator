// src/pages/TurkeyDashboard.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../utils/supabaseClient";

const PAGE_SIZE = 25;
const VIEW = "v_rsvps_admin";
const BASE_TABLE = "rsvps";
const FALLBACK_SLOT_CAPACITY = 80;
const OPEN_HOUSE_EVENT_ID = "open-house-2026";
const OPEN_HOUSE_EVENT_NAME = "Open House (2026)";
const OPEN_HOUSE_EVENT_DATE = "2026-03-26T00:00:00Z";
const OPEN_HOUSE_CAPACITY = 100;
const OPEN_HOUSE_EVENT = {
  id: OPEN_HOUSE_EVENT_ID,
  name: OPEN_HOUSE_EVENT_NAME,
  date_utc: OPEN_HOUSE_EVENT_DATE,
};

const THEME = {
  green: "#006633",
  yellow: "#F2AE00",
  lightYellow: "#FEF3B5",
  white: "#EFEFEF",
  black: "#000000",
  rowHighlight: "#E7F4EC",
};

const CONTACT_OPTIONS = ["Email", "Phone", "Text"];
const VETERAN_OPTIONS = [
  "Veteran",
  "Active Duty",
  "Guard/Reserve",
  "Family Member/Caregiver",
  "Provider/Community Partner",
  "Other",
];
const DATE_RANGE_OPTIONS = [
  { label: "All time", value: "all", hours: null },
  { label: "Last 24 hours", value: "24h", hours: 24 },
  { label: "Last 7 days", value: "7d", hours: 24 * 7 },
  { label: "Last 30 days", value: "30d", hours: 24 * 30 },
];

const SLOT_ORDER = [
  "11:00–11:30 am",
  "11:30–12:00 pm",
  "12:00–12:30 pm",
  "12:30–1:00 pm",
  "1:00–1:30 pm",
  "1:30–2:00 pm",
];

function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{label}</span>
      {React.cloneElement(children, {
        style: {
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          outline: "none",
          background: "#fff",
          ...(children.props.style || {}),
        },
      })}
    </label>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    </label>
  );
}

export default function TurkeyDashboard() {
  // events + filters
  const [activeView, setActiveView] = useState("rsvps");
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [eraFilter, setEraFilter] = useState("");
  const [clientFilter, setClientFilter] = useState(""); // "", "yes", "no"
  const [contactFilter, setContactFilter] = useState(""); // "", "yes", "no"

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // KPIs
  const [branchCounts, setBranchCounts] = useState({});
  const [eraCounts, setEraCounts] = useState({});
  const [slotCounts, setSlotCounts] = useState({});
  const [slotCapacities, setSlotCapacities] = useState({});
  const [clientCounts, setClientCounts] = useState({ yes: 0, no: 0, total: 0 });
  const [contactCounts, setContactCounts] = useState({ yes: 0, no: 0, total: 0 });
  const [familyCount, setFamilyCount] = useState(0);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);
  const [reportingLoading, setReportingLoading] = useState(false);
  const [reportingError, setReportingError] = useState("");
  const [reportingSeatsReserved, setReportingSeatsReserved] = useState(0);
  const [reportingHouseholds, setReportingHouseholds] = useState(0);
  const [reportingSeatsRemaining, setReportingSeatsRemaining] = useState(0);
  const [reportingAvgPartySize, setReportingAvgPartySize] = useState(0);

  // selection & modals
  const [selectedId, setSelectedId] = useState(null);
  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId]
  );
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  // mailing list view
  const [mlRows, setMlRows] = useState([]);
  const [mlTotal, setMlTotal] = useState(0);
  const [mlPage, setMlPage] = useState(0);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState("");
  const [mlSearch, setMlSearch] = useState("");
  const [mlPreferredFilter, setMlPreferredFilter] = useState("");
  const [mlVeteranFilter, setMlVeteranFilter] = useState("");
  const [mlDateRange, setMlDateRange] = useState("all");
  const [mlConsentFilter, setMlConsentFilter] = useState("");
  const [mlSortAsc, setMlSortAsc] = useState(false);
  const [mlExporting, setMlExporting] = useState(false);
  const [mlNoteRow, setMlNoteRow] = useState(null);
  const [mlSelection, setMlSelection] = useState(null);
  const [mlEditRow, setMlEditRow] = useState(null);
  const [mlDeleteRow, setMlDeleteRow] = useState(null);
  const mlPageCount = useMemo(
    () => Math.max(1, Math.ceil(mlTotal / PAGE_SIZE)),
    [mlTotal]
  );

  const mailingRowKey = (row) => row?.id ?? `${row?.created_at}-${row?.email}`;

  const fromISO = useMemo(
    () => (fromDate ? `${fromDate}T00:00:00` : null),
    [fromDate]
  );
  const toISO = useMemo(
    () => (toDate ? `${toDate}T23:59:59.999` : null),
    [toDate]
  );

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );
  const selectedEventName =
    selectedEvent?.name ||
    (selectedEventId === OPEN_HOUSE_EVENT_ID ? OPEN_HOUSE_EVENT_NAME : "");
  const eventIdentifier = (selectedEventName || "").toLowerCase().trim();
  const isTurkeyEvent = eventIdentifier.includes("turkey drop");
  const isWhiteChristmasEvent = eventIdentifier.includes("white christmas");
  const isOpenHouseEvent = selectedEventId === OPEN_HOUSE_EVENT_ID;

  const buildQuery = (selectCols = "*") => {
    if (!selectedEventId) return null;
    let q = supabase
      .from(VIEW)
      .select(selectCols, { count: "exact" })
      .order("created_at", { ascending: false })
      .eq("event_id", selectedEventId);

    if (fromISO) q = q.gte("created_at", fromISO);
    if (toISO) q = q.lte("created_at", toISO);

    // exact filters
    if (branchFilter) q = q.contains("branch_of_service", [branchFilter]);
    if (eraFilter) q = q.contains("era_list", [eraFilter]);
    if (clientFilter === "yes") q = q.eq("rhp_client_status", true);
    if (clientFilter === "no") q = q.eq("rhp_client_status", false);
    if (contactFilter === "yes") q = q.eq("peer_contact_opt_in", true);
    if (contactFilter === "no") q = q.eq("peer_contact_opt_in", false);

    // fuzzy
    if (search?.trim()) {
      const s = search.trim().replace(/[(),]/g, "");
      const digits = s.replace(/\D/g, "");
      const cols = [
        "first_name",
        "last_name",
        "email",
        "phone",
        "status",
        "era",
        "era_other",
        "address1",
        "address2",
        "city",
        "state",
        "postal_code",
        "ticket_code",
        "slot_label",
        "branch_of_service_txt",
        "era_list_txt",
      ];
      const clauses = cols.map((c) => `${c}.ilike.%${s}%`);
      if (digits.length >= 4) clauses.push(`phone_digits.ilike.%${digits}%`);
      q = q.or(clauses.join(","));
    }
    return q;
  };

  useEffect(() => {
    let isMounted = true;
    async function loadEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, date_utc")
        .order("date_utc", { ascending: false });

      if (error) {
        console.error("Error loading events:", error);
        if (!isMounted) return;
        setEvents([]);
        return;
      }

      if (!isMounted) return;
      const normalized = (data || []).map((ev) =>
        ev.id === OPEN_HOUSE_EVENT_ID ? { ...ev, name: OPEN_HOUSE_EVENT_NAME } : ev
      );
      const hasOpenHouse = normalized.some((ev) => ev.id === OPEN_HOUSE_EVENT_ID);
      const merged = hasOpenHouse ? normalized : [OPEN_HOUSE_EVENT, ...normalized];
      console.log("Admin dashboard events:", merged); // temporary debug
      setEvents(merged);
    }
    loadEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  // fetch table
  useEffect(() => {
    if (activeView !== "rsvps") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      if (!selectedEventId) {
        setRows([]);
        setTotal(0);
        setSelectedId(null);
        return;
      }
      setLoading(true);
      try {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const query = buildQuery("*");
        if (!query) return;
        const { data, error, count } = await query.range(from, to);
        if (error) throw error;
        if (!cancelled) {
          setRows(data ?? []);
          setTotal(count ?? 0);
          setSelectedId(null);
        }
      } catch (e) {
        // optional: console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeView,
    selectedEventId,
    fromISO,
    toISO,
    search,
    page,
    branchFilter,
    eraFilter,
    clientFilter,
    contactFilter,
  ]);

  useEffect(() => {
    if (activeView !== "rsvps") return;
    setPage(0);
  }, [
    activeView,
    selectedEventId,
    fromISO,
    toISO,
    search,
    branchFilter,
    eraFilter,
    clientFilter,
    contactFilter,
  ]);

  useEffect(() => {
    if (activeView !== "rsvps" || !selectedEventId) {
      setReportingLoading(false);
      setReportingError("");
      setReportingSeatsReserved(0);
      setReportingHouseholds(0);
      setReportingSeatsRemaining(0);
      setReportingAvgPartySize(0);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setReportingLoading(true);
      setReportingError("");
      const reserved = Number(ticketsTotal) || 0;
      const households = Number(familyCount) || 0;
      const avg = households > 0 ? reserved / households : 0;
      if (!cancelled) {
        setReportingSeatsReserved(reserved);
        setReportingHouseholds(households);
        setReportingAvgPartySize(avg);
      }
      try {
        const { data, error } = await supabase
          .from("v_slot_capacity")
          .select("seats_remaining, capacity, event_id")
          .eq("event_id", selectedEventId);
        if (error) throw error;
        const remaining = (data || []).reduce((sum, row) => {
          const seats = Number(row?.seats_remaining);
          return sum + (Number.isFinite(seats) ? seats : 0);
        }, 0);
        if (!cancelled) {
          setReportingSeatsRemaining(remaining);
          setReportingError("");
        }
      } catch (err) {
        if (!cancelled) {
          setReportingSeatsRemaining(0);
          setReportingError(err?.message || "Failed to load seat capacity");
        }
      } finally {
        if (!cancelled) {
          setReportingLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [activeView, selectedEventId, ticketsTotal, familyCount]);

  useEffect(() => {
    if (activeView !== "rsvps") return;
    setInsightsCollapsed(false);
  }, [selectedEventId, activeView]);

  // fetch KPIs (includes zero-count slots)
  useEffect(() => {
    if (activeView !== "rsvps") return;
    let cancelled = false;
    (async () => {
      if (!selectedEventId) {
        if (!cancelled) {
          setBranchCounts({});
          setEraCounts({});
          setSlotCounts({});
          setSlotCapacities({});
          setClientCounts({ yes: 0, no: 0, total: 0 });
          setContactCounts({ yes: 0, no: 0, total: 0 });
          setFamilyCount(0);
          setTicketsTotal(0);
        }
        return;
      }
      try {
        const query = buildQuery(
          "event_id, branch_of_service, era, era_list, slot_label, slot_capacity, rhp_client_status, peer_contact_opt_in, family_size"
        );
        if (!query) return;
        const { data, error } = await query;
        if (error) throw error;
        const list = data || [];

        const bmap = {};
        for (const r of list) {
          const arr = Array.isArray(r.branch_of_service)
            ? r.branch_of_service
            : r.branch_of_service
            ? [r.branch_of_service]
            : [];
          for (const b of arr) {
            const k = (b || "").trim();
            if (!k) continue;
            bmap[k] = (bmap[k] || 0) + 1;
          }
        }

        const emap = {};
        for (const r of list) {
          const items =
            Array.isArray(r.era_list) && r.era_list.length
              ? r.era_list
              : r.era
              ? [r.era]
              : [];
          for (const e of items) {
            const k = (e || "").trim();
            if (!k) continue;
            emap[k] = (emap[k] || 0) + 1;
          }
        }

        const smap = {};
        const cap = {};
        for (const r of list) {
          const label = (r.slot_label || "").trim();
          if (!label) continue;
          smap[label] = (smap[label] || 0) + 1;
          if (r.slot_capacity != null) cap[label] = r.slot_capacity;
        }

        let cYes = 0,
          cNo = 0,
          pYes = 0,
          pNo = 0;
        for (const r of list) {
          if (r.rhp_client_status === true) cYes++;
          else if (r.rhp_client_status === false) cNo++;
          if (r.peer_contact_opt_in === true) pYes++;
          else if (r.peer_contact_opt_in === false) pNo++;
        }

        if (selectedEventId) {
          try {
            const { data: slotsList } = await supabase
              .from("pickup_slots")
              .select("label, capacity, event_id")
              .eq("event_id", selectedEventId);

            (slotsList || []).forEach((s) => {
              const label = (s.label || "").trim();
              if (!label) return;
              if (!(label in smap)) smap[label] = 0;
              if (cap[label] == null) cap[label] = s.capacity ?? FALLBACK_SLOT_CAPACITY;
            });
          } catch {
            // ignore merge failures; dashboard still renders from RSVPs
          }
        }

        const tickets = list.reduce((sum, r) => {
          const ticketsCountField = Number(r.family_size); // family_size represents tickets claimed
          const normalizedCount =
            Number.isFinite(ticketsCountField) && ticketsCountField > 0
              ? ticketsCountField
              : 1;
          return sum + normalizedCount;
        }, 0);

        if (!cancelled) {
          setBranchCounts(bmap);
          setEraCounts(emap);
          setSlotCounts(smap);
          setSlotCapacities(cap);
          setClientCounts({ yes: cYes, no: cNo, total: list.length });
          setContactCounts({ yes: pYes, no: pNo, total: list.length });
          setFamilyCount(list.length);
          setTicketsTotal(tickets);
        }
      } catch {
        if (!cancelled) {
          setBranchCounts({});
          setEraCounts({});
          setSlotCounts({});
          setSlotCapacities({});
          setClientCounts({ yes: 0, no: 0, total: 0 });
          setContactCounts({ yes: 0, no: 0, total: 0 });
          setFamilyCount(0);
          setTicketsTotal(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeView,
    selectedEventId,
    fromISO,
    toISO,
    search,
    branchFilter,
    eraFilter,
    clientFilter,
    contactFilter,
  ]);

  // export CSV (full fields)
  const exportAll = async () => {
    try {
      setLoading(true);
      const query = buildQuery("*");
      if (!query) {
        alert("Select an event to export.");
        return;
      }
      const { data, error } = await query;
      if (error) throw error;
      const list = data ?? [];

      const cols = [
        { h: "ID", a: (r) => r.id ?? "" },
        { h: "Created", a: (r) => fmtDate(r.created_at) },
        { h: "Event", a: (r) => r.event_name ?? "" },
        { h: "Event ID", a: (r) => r.event_id ?? "" },
        { h: "Slot", a: (r) => r.slot_label ?? "" },
        { h: "Slot ID", a: (r) => r.slot_id ?? "" },
        { h: "First", a: (r) => r.first_name ?? "" },
        { h: "Last", a: (r) => r.last_name ?? "" },
        { h: "Email", a: (r) => r.email ?? "" },
        { h: "Phone", a: (r) => r.phone ?? "" },
        { h: "Phone Digits", a: (r) => r.phone_digits ?? "" },
        { h: "Status", a: (r) => r.status ?? "" },
        {
          h: "Branch(es)",
          a: (r) =>
            Array.isArray(r.branch_of_service)
              ? r.branch_of_service.join(", ")
              : r.branch_of_service ?? "",
        },
        { h: "Branch(es) Text", a: (r) => r.branch_of_service_txt ?? "" },
        { h: "Era", a: (r) => r.era ?? "" },
        {
          h: "Eras (list)",
          a: (r) => (Array.isArray(r.era_list) ? r.era_list.join(", ") : r.era_list ?? ""),
        },
        { h: "Eras (text)", a: (r) => r.era_list_txt ?? "" },
        { h: "Era Other", a: (r) => r.era_other ?? "" },
        { h: "Address 1", a: (r) => r.address1 ?? "" },
        { h: "Address 2", a: (r) => r.address2 ?? "" },
        { h: "City", a: (r) => r.city ?? "" },
        { h: "State", a: (r) => r.state ?? "" },
        { h: "ZIP", a: (r) => r.postal_code ?? "" },
        { h: "RHP Client?", a: (r) => (r.rhp_client_status ? "Yes" : "No") },
        { h: "Peer Contact Opt-In?", a: (r) => (r.peer_contact_opt_in ? "Yes" : "No") },
        {
          h: "Family Size",
          a: (r) => (typeof r.family_size === "number" ? String(r.family_size) : ""),
        },
        { h: "Ticket", a: (r) => r.ticket_code ?? "" },
      ];

      const esc = (v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv =
        cols.map((c) => esc(c.h)).join(",") +
        "\n" +
        list.map((r) => cols.map((c) => esc(c.a(r))).join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `rsvps_export_${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(e.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const buildMailingQuery = useCallback(
    (selectCols = "*") => {
      let query = supabase
        .from("mailing_list_signups")
        .select(selectCols, { count: "exact" })
        .order("created_at", { ascending: mlSortAsc });

    const term = mlSearch.trim();
    if (term) {
      const safe = term.replace(/[(),]/g, "");
      const digits = safe.replace(/\D/g, "");
      const likeVal = `%${safe}%`;
      const clauses = [
        `first_name.ilike.${likeVal}`,
        `last_name.ilike.${likeVal}`,
        `email.ilike.${likeVal}`,
        `phone.ilike.${likeVal}`,
      ];
      if (digits.length >= 4) clauses.push(`phone.ilike.%${digits}%`);
      query = query.or(clauses.join(","));
    }

    if (mlPreferredFilter) query = query.eq("preferred_contact", mlPreferredFilter);
    if (mlVeteranFilter) query = query.eq("veteran_affiliation", mlVeteranFilter);
    if (mlConsentFilter) query = query.eq("consent", mlConsentFilter === "yes");

    const rangeDef = DATE_RANGE_OPTIONS.find((opt) => opt.value === mlDateRange);
      if (rangeDef?.hours) {
        const cutoff = new Date(Date.now() - rangeDef.hours * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", cutoff);
      }

      return query;
    },
    [mlSortAsc, mlSearch, mlPreferredFilter, mlVeteranFilter, mlConsentFilter, mlDateRange]
  );

  useEffect(() => {
    if (activeView !== "mailing") return;
    setMlSelection(null);
    let cancelled = false;
    (async () => {
      setMlLoading(true);
      setMlError("");
      try {
        const from = mlPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const query = buildMailingQuery("*").range(from, to);
        const { data, error, count } = await query;
        if (error) throw error;
        if (!cancelled) {
          setMlRows(data || []);
          setMlTotal(count || 0);
        }
      } catch (err) {
        console.error("Mailing list fetch error", err);
        if (!cancelled) setMlError(err.message || "Failed to load signups");
      } finally {
        if (!cancelled) setMlLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeView, mlPage, buildMailingQuery]);

  useEffect(() => {
    if (activeView !== "mailing") return;
    setMlPage(0);
  }, [activeView, mlSearch, mlPreferredFilter, mlVeteranFilter, mlConsentFilter, mlDateRange]);

  const clearMailingFilters = () => {
    setMlSearch("");
    setMlPreferredFilter("");
    setMlVeteranFilter("");
    setMlConsentFilter("");
    setMlDateRange("all");
    setMlPage(0);
  };

  const exportMailingCsv = async () => {
    try {
      setMlExporting(true);
      const { data, error } = await buildMailingQuery("*");
      if (error) throw error;
      const rows = data || [];
      const headers = [
        "created_at",
        "first_name",
        "last_name",
        "email",
        "phone",
        "postal_code",
        "veteran_affiliation",
        "preferred_contact",
        "interests",
        "consent",
        "source",
        "page_path",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "notes",
      ];
      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map((key) => {
              const val = row[key];
              if (val == null) return "";
              if (Array.isArray(val)) return `"${val.join(" | ").replace(/"/g, '""')}"`;
              const str = String(val);
              return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
            })
            .join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `mailing-list-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message || err}`);
    } finally {
      setMlExporting(false);
    }
  };

  const mlStats = useMemo(() => {
    const now = Date.now();
    const weekCutoff = now - 7 * 24 * 60 * 60 * 1000;
    let last7 = 0;
    let emailCount = 0;
    let otherCount = 0;
    const interestMap = {};

    mlRows.forEach((row) => {
      const created = row?.created_at ? new Date(row.created_at).getTime() : null;
      if (created && created >= weekCutoff) last7 += 1;
      if ((row.preferred_contact || "").toLowerCase() === "email") emailCount += 1;
      else otherCount += 1;
      const interestList = Array.isArray(row.interests)
        ? row.interests
        : row.interests
        ? String(row.interests)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      interestList.forEach((interest) => {
        interestMap[interest] = (interestMap[interest] || 0) + 1;
      });
    });

    const emailPct =
      emailCount + otherCount === 0
        ? 0
        : Math.round((emailCount / (emailCount + otherCount)) * 100);

    const topInterests = Object.entries(interestMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { last7, emailPct, topInterests };
  }, [mlRows]);

  useEffect(() => {
    if (activeView !== "mailing") setMlSelection(null);
  }, [activeView]);

  // selection & actions
  const onRowClick = (id) => setSelectedId((cur) => (cur === id ? null : id));
  const openEdit = (row) => setEditRow({ ...row });
  const closeEdit = () => setEditRow(null);
  const openDelete = (row) => setDeleteRow(row);
  const closeDelete = () => setDeleteRow(null);
  const onMailingRowClick = (row) => {
    const key = mailingRowKey(row);
    setMlSelection((prev) => (prev && prev.key === key ? null : { key, row }));
  };
  const openMailingEdit = (row) =>
    setMlEditRow({
      ...row,
      interests_string: Array.isArray(row.interests)
        ? row.interests.join(", ")
        : row.interests || "",
    });
  const closeMailingEdit = () => setMlEditRow(null);
  const openMailingDelete = (row) => setMlDeleteRow(row);
  const closeMailingDelete = () => setMlDeleteRow(null);

  const handleDeleteConfirm = async () => {
    if (!deleteRow) return;
    try {
      setLoading(true);
      const { error } = await supabase.from(BASE_TABLE).delete().eq("id", deleteRow.id);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== deleteRow.id));
      setTotal((t) => Math.max(0, t - 1));
      if (selectedId === deleteRow.id) setSelectedId(null);
      closeDelete();
    } catch (e) {
      alert(`Delete failed: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMailingDeleteConfirm = async () => {
    if (!mlDeleteRow) return;
    try {
      setMlLoading(true);
      const { error } = await supabase
        .from("mailing_list_signups")
        .delete()
        .eq("id", mlDeleteRow.id);
      if (error) throw error;
      setMlRows((prev) => prev.filter((row) => row.id !== mlDeleteRow.id));
      setMlTotal((t) => Math.max(0, t - 1));
      setMlSelection((prev) => (prev && prev.key === mailingRowKey(mlDeleteRow) ? null : prev));
      closeMailingDelete();
    } catch (err) {
      alert(`Delete failed: ${err.message || err}`);
    } finally {
      setMlLoading(false);
    }
  };

  const handleMailingEditSave = async () => {
    if (!mlEditRow) return;
    const interestList = mlEditRow.interests_string
      ? mlEditRow.interests_string
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const patch = {
      first_name: mlEditRow.first_name?.trim() || null,
      last_name: mlEditRow.last_name?.trim() || null,
      email: mlEditRow.email?.trim() || null,
      phone: mlEditRow.phone?.trim() || null,
      postal_code: mlEditRow.postal_code?.trim() || null,
      veteran_affiliation: mlEditRow.veteran_affiliation || null,
      preferred_contact: mlEditRow.preferred_contact || null,
      consent: !!mlEditRow.consent,
      interests: interestList,
      source: mlEditRow.source?.trim() || null,
      page_path: mlEditRow.page_path?.trim() || null,
      utm_source: mlEditRow.utm_source?.trim() || null,
      utm_medium: mlEditRow.utm_medium?.trim() || null,
      utm_campaign: mlEditRow.utm_campaign?.trim() || null,
      notes: mlEditRow.notes?.trim() || null,
    };
    try {
      setMlLoading(true);
      const { data, error } = await supabase
        .from("mailing_list_signups")
        .update(patch)
        .eq("id", mlEditRow.id)
        .select()
        .single();
      if (error) throw error;
      setMlRows((prev) => prev.map((row) => (row.id === data.id ? data : row)));
      setMlSelection((prev) =>
        prev && prev.row?.id === data.id ? { key: mailingRowKey(data), row: data } : prev
      );
      closeMailingEdit();
    } catch (err) {
      alert(`Update failed: ${err.message || err}`);
    } finally {
      setMlLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editRow) return;
    const {
      id,
      first_name,
      last_name,
      email,
      phone,
      address1,
      address2,
      city,
      state,
      postal_code,
      family_size,
      rhp_client_status,
      peer_contact_opt_in,
    } = editRow;

    const patch = {
      first_name: first_name ?? null,
      last_name: last_name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      address1: address1 ?? null,
      address2: address2 ?? null,
      city: city ?? null,
      state: state ?? null,
      postal_code: postal_code ?? null,
      family_size: (() => {
        const parsed =
          typeof family_size === "number"
            ? family_size
            : Number(family_size);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      })(),
      rhp_client_status: !!rhp_client_status,
      peer_contact_opt_in: !!peer_contact_opt_in,
    };

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(BASE_TABLE)
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
      closeEdit();
    } catch (e) {
      alert(`Update failed: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    setBranchFilter("");
    setEraFilter("");
    setClientFilter("");
    setContactFilter("");
    setSearch("");
    setFromDate("");
    setToDate("");
  };

  const clientPct = clientCounts.total
    ? Math.round((clientCounts.yes / clientCounts.total) * 100)
    : 0;
  const contactPct = contactCounts.total
    ? Math.round((contactCounts.yes / contactCounts.total) * 100)
    : 0;
  const openHousePercentUsed =
    OPEN_HOUSE_CAPACITY > 0
      ? Math.min(100, Math.round(((ticketsTotal || 0) / OPEN_HOUSE_CAPACITY) * 100))
      : 0;
  const slotSummaries = useMemo(() => {
    const countKeys = Object.keys(slotCounts || {});
    const capacityKeys = Object.keys(slotCapacities || {});
    if (countKeys.length === 0 && capacityKeys.length === 0) return [];
    const knownLabels = new Set([...countKeys, ...capacityKeys]);
    const ordered = SLOT_ORDER.filter((label) => knownLabels.has(label));
    const extras = Array.from(knownLabels)
      .filter((label) => !SLOT_ORDER.includes(label))
      .sort((a, b) => a.localeCompare(b));
    const labels = [...ordered, ...extras];
    return labels.map((label) => {
      const count = slotCounts[label] || 0;
      const capacity = slotCapacities[label] ?? FALLBACK_SLOT_CAPACITY;
      const percent =
        capacity > 0 ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
      return { label, count, capacity, percent };
    });
  }, [slotCounts, slotCapacities]);
  const openHouseSummaryCard = (
    <BreakdownCard title="Open House RSVP Summary">
      <div style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          <span>Total RSVPs</span>
          <span>{familyCount}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          <span>Capacity used</span>
          <span>
            {openHousePercentUsed}% ({ticketsTotal} seats / {OPEN_HOUSE_CAPACITY})
          </span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
          Households (RSVP records): {familyCount}
        </div>
        <Progress value={openHousePercentUsed} />
      </div>
    </BreakdownCard>
  );
  const ringCards = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 16,
      }}
    >
      <RingCard
        title="RHP Clients"
        numerator={clientCounts.yes}
        denominator={clientCounts.total}
        percent={clientPct}
        onSliceClick={() => setClientFilter((cur) => (cur === "yes" ? "" : "yes"))}
        onCenterClick={() => setClientFilter("")}
        active={clientFilter === "yes"}
      />
      <RingCard
        title="Peer Contact Opt-In"
        numerator={contactCounts.yes}
        denominator={contactCounts.total}
        percent={contactPct}
        onSliceClick={() => setContactFilter((cur) => (cur === "yes" ? "" : "yes"))}
        onCenterClick={() => setContactFilter("")}
        active={contactFilter === "yes"}
      />
    </div>
  );
  const branchEraBreakdowns = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16,
      }}
    >
      <BreakdownCard title="Branch of Service">
        <Chips
          map={branchCounts}
          onChipClick={(label) =>
            setBranchFilter((cur) => (cur === label ? "" : label))
          }
        />
      </BreakdownCard>
      <BreakdownCard title="Era of Service">
        <Chips
          map={eraCounts}
          onChipClick={(label) => setEraFilter((cur) => (cur === label ? "" : label))}
        />
      </BreakdownCard>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: THEME.green }}>
          {activeView === "rsvps" ? "RSVP Admin" : "Mailing List Signups"}
        </h1>
        <div style={{ color: "#6b7280", marginTop: 4 }}>
          {activeView === "rsvps"
            ? selectedEventName
              ? `Viewing RSVPs for: ${selectedEventName}`
              : "Select an event to begin."
            : "Review submissions captured via the public signup page."}
        </div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          Search runs server-side across all pages.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { key: "rsvps", label: "Event RSVPs" },
            { key: "mailing", label: "Mailing List" },
          ].map((btn) => {
            const active = activeView === btn.key;
            return (
              <button
                key={btn.key}
                onClick={() => setActiveView(btn.key)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: active ? `2px solid ${THEME.green}` : "1px solid #e5e7eb",
                  background: active ? "#E7F4EC" : "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </header>

      {activeView === "mailing" ? (
        <>
          <section style={card}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
                gap: 12,
                alignItems: "end",
              }}
            >
              <label style={{ fontSize: 13, fontWeight: 500 }}>
                Search
                <input
                  value={mlSearch}
                  onChange={(e) => setMlSearch(e.target.value)}
                  placeholder="Name, email, phone"
                  style={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: "8px 10px",
                    fontSize: 14,
                    width: "100%",
                    marginTop: 4,
                  }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 500 }}>
                Preferred contact
                <select
                  value={mlPreferredFilter}
                  onChange={(e) => setMlPreferredFilter(e.target.value)}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: "8px 10px",
                    fontSize: 14,
                    width: "100%",
                    marginTop: 4,
                  }}
                >
                  <option value="">All</option>
                  {CONTACT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 13, fontWeight: 500 }}>
                Veteran affiliation
                <select
                  value={mlVeteranFilter}
                  onChange={(e) => setMlVeteranFilter(e.target.value)}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: "8px 10px",
                    fontSize: 14,
                    width: "100%",
                    marginTop: 4,
                  }}
                >
                  <option value="">All</option>
                  {VETERAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 13, fontWeight: 500 }}>
                Consent
                <select
                  value={mlConsentFilter}
                  onChange={(e) => setMlConsentFilter(e.target.value)}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: "8px 10px",
                    fontSize: 14,
                    width: "100%",
                    marginTop: 4,
                  }}
                >
                  <option value="">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label style={{ fontSize: 13, fontWeight: 500 }}>
                Date range
                <select
                  value={mlDateRange}
                  onChange={(e) => setMlDateRange(e.target.value)}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: "8px 10px",
                    fontSize: 14,
                    width: "100%",
                    marginTop: 4,
                  }}
                >
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={clearMailingFilters}>
                  Clear
                </Button>
                <Button onClick={exportMailingCsv} disabled={mlExporting}>
                  {mlExporting ? "Exporting…" : "Export CSV"}
                </Button>
              </div>
            </div>
          </section>

          <section style={card}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              <StatCard title="Total signups" value={mlTotal} />
              <StatCard title="Last 7 days (page)" value={mlStats.last7} />
              <StatCard title="Prefers email" value={`${mlStats.emailPct}%`} />
              <div
                style={{
                  background: "#fff",
                  border: `1px solid ${THEME.white}`,
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 600 }}>
                  Top interests
                </div>
                {mlStats.topInterests.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>—</div>
                ) : (
                  <ul style={{ paddingLeft: 16, margin: "8px 0 0" }}>
                    {mlStats.topInterests.map(([label, count]) => (
                      <li key={label}>
                        {label} ({count})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ color: "#374151" }}>
                Page <strong>{mlPage + 1}</strong> of <strong>{mlPageCount}</strong> •{" "}
                <strong>{mlTotal}</strong> records
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  variant="ghost"
                  disabled={mlPage === 0 || mlLoading}
                  onClick={() => setMlPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  disabled={mlLoading || mlPage + 1 >= mlPageCount}
                  onClick={() => setMlPage((p) => p + 1)}
                >
                  Next
                </Button>
                {mlSelection?.row && (
                  <>
                    <Button variant="ghost" onClick={() => openMailingEdit(mlSelection.row)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => openMailingDelete(mlSelection.row)}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            {mlError && <div style={{ marginTop: 12, color: "#b91c1c" }}>{mlError}</div>}

            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>
                      <button
                        onClick={() => {
                          setMlSortAsc((prev) => !prev);
                          setMlPage(0);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Created {mlSortAsc ? "↑" : "↓"}
                      </button>
                    </th>
                    {[
                      "First",
                      "Last",
                      "Email",
                      "Phone",
                      "ZIP",
                      "Affiliation",
                      "Contact",
                      "Interests",
                      "Consent",
                      "Source",
                      "Page",
                      "Attribution",
                      "Notes",
                    ].map((label) => (
                      <th key={label} style={th}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mlLoading ? (
                    <tr>
                      <td colSpan={14} style={{ padding: 16 }}>
                        Loading…
                      </td>
                    </tr>
                  ) : mlRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ padding: 16 }}>
                        No signups found.
                      </td>
                    </tr>
                  ) : (
                    mlRows.map((row) => {
                      const rowKey = mailingRowKey(row);
                      const isSel = mlSelection?.key === rowKey;
                      const interestList = Array.isArray(row.interests)
                        ? row.interests
                        : row.interests
                        ? String(row.interests)
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        : [];
                      const attribution = [
                        row.utm_source,
                        row.utm_medium,
                        row.utm_campaign,
                      ].filter(Boolean);
                      const notesPreview =
                        row.notes && row.notes.length > 80
                          ? `${row.notes.slice(0, 80)}…`
                          : row.notes || "—";
                      return (
                        <tr
                          key={rowKey}
                          onClick={() => onMailingRowClick(row)}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                            background: isSel ? "#DCF7E6" : "#fff",
                            cursor: "pointer",
                            outline: isSel ? `2px solid ${THEME.green}` : "none",
                          }}
                        >
                          <td style={td}>{fmtDate(row.created_at)}</td>
                          <td style={td}>{row.first_name || "—"}</td>
                          <td style={td}>{row.last_name || "—"}</td>
                          <td style={td}>{row.email || "—"}</td>
                          <td style={td}>{row.phone || "—"}</td>
                          <td style={td}>{row.postal_code || "—"}</td>
                          <td style={td}>{row.veteran_affiliation || "—"}</td>
                          <td style={td}>{row.preferred_contact || "—"}</td>
                          <td style={td}>
                            <ChipsList list={interestList} />
                          </td>
                          <td style={td}>{row.consent ? "Yes" : "No"}</td>
                          <td style={td}>{row.source || "—"}</td>
                          <td style={td}>{row.page_path || "—"}</td>
                          <td style={td}>
                            {attribution.length ? (
                              <div style={{ fontSize: 12, color: "#374151" }}>
                                {attribution.map((item, idx) => (
                                  <div key={`${item}-${idx}`}>{item}</div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: "#6b7280" }}>—</span>
                            )}
                          </td>
                          <td style={td}>
                            {row.notes ? (
                              <div style={{ display: "grid", gap: 6 }}>
                                <div>{notesPreview}</div>
                                <button
                                  onClick={() => setMlNoteRow(row)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    color: THEME.green,
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                    width: "fit-content",
                                  }}
                                >
                                  View
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: "#6b7280" }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

      {mlNoteRow && (
        <Modal title="Signup Notes" onClose={() => setMlNoteRow(null)}>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{mlNoteRow.notes}</div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
            Submitted {fmtDate(mlNoteRow.created_at)} by {mlNoteRow.email}
          </div>
        </Modal>
      )}
      {mlEditRow && (
        <Modal title="Edit Signup" onClose={closeMailingEdit}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={twoCol}>
              <Field label="First name">
                <input
                  value={mlEditRow.first_name || ""}
                  onChange={(e) => setMlEditRow((prev) => ({ ...prev, first_name: e.target.value }))}
                />
              </Field>
              <Field label="Last name">
                <input
                  value={mlEditRow.last_name || ""}
                  onChange={(e) => setMlEditRow((prev) => ({ ...prev, last_name: e.target.value }))}
                />
              </Field>
            </div>
            <div style={twoCol}>
              <Field label="Email">
                <input
                  value={mlEditRow.email || ""}
                  onChange={(e) => setMlEditRow((prev) => ({ ...prev, email: e.target.value }))}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={mlEditRow.phone || ""}
                  onChange={(e) => setMlEditRow((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </Field>
            </div>
            <div style={twoCol}>
              <Field label="Postal code">
                <input
                  value={mlEditRow.postal_code || ""}
                  onChange={(e) =>
                    setMlEditRow((prev) => ({ ...prev, postal_code: e.target.value }))
                  }
                />
              </Field>
              <Field label="Veteran affiliation">
                <select
                  value={mlEditRow.veteran_affiliation || ""}
                  onChange={(e) =>
                    setMlEditRow((prev) => ({ ...prev, veteran_affiliation: e.target.value }))
                  }
                >
                  <option value="">Select...</option>
                  {VETERAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={twoCol}>
              <Field label="Preferred contact">
                <select
                  value={mlEditRow.preferred_contact || ""}
                  onChange={(e) =>
                    setMlEditRow((prev) => ({ ...prev, preferred_contact: e.target.value }))
                  }
                >
                  <option value="">Select...</option>
                  {CONTACT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={!!mlEditRow.consent}
                  onChange={(e) =>
                    setMlEditRow((prev) => ({ ...prev, consent: e.target.checked }))
                  }
                />
                Consent given
              </label>
            </div>
            <Field label="Interests (comma separated)">
              <textarea
                rows={2}
                value={mlEditRow.interests_string || ""}
                onChange={(e) =>
                  setMlEditRow((prev) => ({ ...prev, interests_string: e.target.value }))
                }
              />
            </Field>
            <Field label="Source">
              <input
                value={mlEditRow.source || ""}
                onChange={(e) => setMlEditRow((prev) => ({ ...prev, source: e.target.value }))}
              />
            </Field>
            <Field label="Page path">
              <input
                value={mlEditRow.page_path || ""}
                onChange={(e) => setMlEditRow((prev) => ({ ...prev, page_path: e.target.value }))}
              />
            </Field>
            <div style={threeCol}>
              <Field label="UTM source">
                <input
                  value={mlEditRow.utm_source || ""}
                  onChange={(e) => setMlEditRow((prev) => ({ ...prev, utm_source: e.target.value }))}
                />
              </Field>
              <Field label="UTM medium">
                <input
                  value={mlEditRow.utm_medium || ""}
                  onChange={(e) => setMlEditRow((prev) => ({ ...prev, utm_medium: e.target.value }))}
                />
              </Field>
              <Field label="UTM campaign">
                <input
                  value={mlEditRow.utm_campaign || ""}
                  onChange={(e) =>
                    setMlEditRow((prev) => ({ ...prev, utm_campaign: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                rows={3}
                value={mlEditRow.notes || ""}
                onChange={(e) => setMlEditRow((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button variant="ghost" onClick={closeMailingEdit}>
                Cancel
              </Button>
              <Button onClick={handleMailingEditSave} disabled={mlLoading}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {mlDeleteRow && (
        <Modal title="Delete Signup" onClose={closeMailingDelete}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>Delete signup for:</div>
            <div style={{ fontWeight: 800 }}>
              {mlDeleteRow.first_name} {mlDeleteRow.last_name}
            </div>
            <div style={{ color: "#6b7280" }}>{mlDeleteRow.email}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="ghost" onClick={closeMailingDelete}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleMailingDeleteConfirm} disabled={mlLoading}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
        </>
      ) : (
        <>
          {/* Filters / Export */}
          <section style={card}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.8fr 0.8fr 1.6fr auto",
                gap: 12,
                alignItems: "end",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value || "");
                    setPage(0);
                    setSelectedId(null);
                  }}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: "8px 10px",
                    fontSize: 14,
                    outline: "none",
                  }}
                >
                  <option value="">Select an event…</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
              <LabeledInput
                label="From date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <LabeledInput
                label="To date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <LabeledInput
                label="Search (fuzzy)"
                placeholder="Army, Vietnam, name, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button onClick={exportAll} variant="secondary">
                Export CSV
              </Button>
            </div>

            {/* filter pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {branchFilter && (
                <Pill onClear={() => setBranchFilter("")} label={`Branch: ${branchFilter}`} />
              )}
              {eraFilter && <Pill onClear={() => setEraFilter("")} label={`Era: ${eraFilter}`} />}
              {clientFilter === "yes" && (
                <Pill onClear={() => setClientFilter("")} label="RHP Clients: Yes" />
              )}
              {contactFilter === "yes" && (
                <Pill onClear={() => setContactFilter("")} label="Peer Contact: Yes" />
              )}
              {(branchFilter ||
                eraFilter ||
                clientFilter ||
                contactFilter ||
                fromDate ||
                toDate ||
                search) && (
                <Pill kind="reset" onClear={clearAllFilters} label="Clear all filters" />
              )}
            </div>
          </section>

          {!selectedEventId ? (
            <section style={card}>
              <div style={{ color: "#6b7280", fontWeight: 600 }}>
                Select an event to view RSVPs.
              </div>
            </section>
          ) : (
            <>
              <section style={card}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 18, color: THEME.green }}>Insights</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {selectedEventName && (
                      <div style={{ color: "#6b7280", fontSize: 13 }}>
                        Showing data for {selectedEventName}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => setInsightsCollapsed((prev) => !prev)}
                      style={{ minWidth: 120 }}
                    >
                      {insightsCollapsed ? "Show insights" : "Hide insights"}
                    </Button>
                  </div>
                </div>

                {insightsCollapsed ? (
                  <div style={{ color: "#6b7280", fontStyle: "italic" }}>
                    Insights collapsed. Use the toggle above to expand.
                  </div>
                ) : isTurkeyEvent ? (
                  <>
                    {ringCards}
                    {branchEraBreakdowns}
                    <BreakdownCard title="Slot Utilization">
                      {slotSummaries.length === 0 ? (
                        <div style={{ color: "#6b7280" }}>No slot data</div>
                      ) : (
                        <div style={{ display: "grid", gap: 12 }}>
                          {slotSummaries.map(({ label, count, capacity, percent }) => (
                            <div key={label} style={{ display: "grid", gap: 6 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontWeight: 600,
                                }}
                              >
                                <span>{label}</span>
                                <span>
                                  {count} / {capacity}
                                </span>
                              </div>
                              <Progress value={percent} />
                            </div>
                          ))}
                        </div>
                      )}
                    </BreakdownCard>
                  </>
                ) : isOpenHouseEvent ? (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#374151",
                          marginBottom: 8,
                        }}
                      >
                        Reporting views (seats-based)
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 16,
                        }}
                      >
                        <StatCard
                          title="Seats reserved"
                          value={reportingSeatsReserved}
                        />
                        <StatCard
                          title="Households"
                          value={reportingHouseholds}
                        />
                        <StatCard
                          title="Seats remaining"
                          value={
                            reportingLoading
                              ? "Loading..."
                              : reportingSeatsRemaining
                          }
                        />
                        <StatCard
                          title="Avg party size"
                          value={Number.isFinite(reportingAvgPartySize)
                            ? reportingAvgPartySize.toFixed(2)
                            : "0.00"}
                        />
                      </div>
                      {reportingError && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                          {reportingError}
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: 16 }}>{openHouseSummaryCard}</div>
                    {ringCards}
                    {branchEraBreakdowns}
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 16,
                        marginBottom: 16,
                      }}
                    >
                      <StatCard
                        title={isWhiteChristmasEvent ? "Families registered" : "Families"}
                        value={familyCount}
                      />
                      <StatCard title="Tickets claimed" value={ticketsTotal} />
                    </div>
                    {ringCards}
                    {branchEraBreakdowns}
                  </>
                )}
              </section>

              <section style={card}>
                <div style={toolbarRow}>
                  <div style={{ color: "#374151" }}>
                    <strong>Page {page + 1}</strong> of{" "}
                    <strong>{Math.max(1, Math.ceil(total / PAGE_SIZE))}</strong> •{" "}
                    <strong>{total}</strong> total
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      variant="ghost"
                      disabled={page === 0 || loading}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={
                        loading || page + 1 >= Math.max(1, Math.ceil(total / PAGE_SIZE))
                      }
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                    {selectedRow && (
                      <>
                        <Button variant="ghost" onClick={() => openEdit(selectedRow)}>
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => openDelete(selectedRow)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead
                      style={{ position: "sticky", top: 0, background: THEME.white, zIndex: 1 }}
                    >
                      <tr>
                        {[
                          "Created",
                          "Event",
                          "Slot",
                          "Name",
                          "Email",
                          "Phone",
                          "Status",
                          "Branch(es)",
                          "Era / Eras",
                          "City/State",
                        ].map((h) => (
                          <th key={h} style={th}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={10} style={{ padding: 16 }}>
                            Loading…
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ padding: 16 }}>
                            No results
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => {
                          const isSel = selectedId === r.id;
                          const green = !!r.peer_contact_opt_in;
                          return (
                            <tr
                              key={r.id}
                              onClick={() => onRowClick(r.id)}
                              style={{
                                borderBottom: "1px solid #f3f4f6",
                                background: isSel
                                  ? "#DCF7E6"
                                  : green
                                  ? THEME.rowHighlight
                                  : "#fff",
                                cursor: "pointer",
                                outline: isSel ? `2px solid ${THEME.green}` : "none",
                              }}
                            >
                              <td style={td}>{fmtDate(r.created_at)}</td>
                              <td style={td}>{r.event_name}</td>
                              <td style={td}>{r.slot_label}</td>
                              <td style={td}>
                                <strong>{`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()}</strong>
                              </td>
                              <td style={td}>{r.email}</td>
                              <td style={td}>{r.phone}</td>
                              <td style={td}>{r.status}</td>
                              <td style={td}>
                                {Array.isArray(r.branch_of_service)
                                  ? r.branch_of_service.join(", ")
                                  : r.branch_of_service ?? ""}
                              </td>
                              <td style={td}>
                                <div>{r.era}</div>
                                <div style={{ color: "#6b7280", fontSize: 12 }}>
                                  {Array.isArray(r.era_list)
                                    ? r.era_list.join(", ")
                                    : r.era_list ?? ""}
                                </div>
                              </td>
                              <td style={td}>{[r.city, r.state].filter(Boolean).join(", ")}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 8, color: "#374151", fontSize: 12 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      background: THEME.rowHighlight,
                      border: "1px solid #cfe7db",
                      marginRight: 6,
                      verticalAlign: "middle",
                    }}
                  />
                  Rows highlighted in green requested a peer contact.
                </div>
              </section>
            </>
          )}

          {/* Edit Modal */}
          {editRow && (
            <Modal title="Edit RSVP" onClose={() => setEditRow(null)}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={twoCol}>
                  <Field label="First name">
                    <input
                      value={editRow.first_name || ""}
                      onChange={(e) => setEditRow((s) => ({ ...s, first_name: e.target.value }))}
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      value={editRow.last_name || ""}
                      onChange={(e) => setEditRow((s) => ({ ...s, last_name: e.target.value }))}
                    />
                  </Field>
                </div>
                <div style={twoCol}>
                  <Field label="Email">
                    <input
                      value={editRow.email || ""}
                      onChange={(e) => setEditRow((s) => ({ ...s, email: e.target.value }))}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      value={editRow.phone || ""}
                      onChange={(e) => setEditRow((s) => ({ ...s, phone: e.target.value }))}
                    />
                  </Field>
                </div>
                <Field label="Address 1">
                  <input
                    value={editRow.address1 || ""}
                    onChange={(e) => setEditRow((s) => ({ ...s, address1: e.target.value }))}
                  />
                </Field>
                <Field label="Address 2">
                  <input
                    value={editRow.address2 || ""}
                    onChange={(e) => setEditRow((s) => ({ ...s, address2: e.target.value }))}
                  />
                </Field>
                <div style={threeCol}>
                  <Field label="City">
                    <input
                      value={editRow.city || ""}
                      onChange={(e) => setEditRow((s) => ({ ...s, city: e.target.value }))}
                    />
                  </Field>
                  <Field label="State">
                    <input
                      value={editRow.state || ""}
                      onChange={(e) => setEditRow((s) => ({ ...s, state: e.target.value }))}
                    />
                  </Field>
                  <Field label="ZIP">
                    <input
                      value={editRow.postal_code || ""}
                      onChange={(e) =>
                        setEditRow((s) => ({ ...s, postal_code: e.target.value }))
                      }
                    />
                  </Field>
                </div>

                <Field label="Family Size">
                  <input
                    type="number"
                    min={1}
                    value={editRow.family_size ?? ""}
                    onChange={(e) =>
                      setEditRow((s) => ({
                        ...s,
                        family_size: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                  />
                </Field>

                <div style={threeCol}>
                  <Toggle
                    label="RHP Client?"
                    value={!!editRow.rhp_client_status}
                    onChange={(v) =>
                      setEditRow((s) => ({ ...s, rhp_client_status: v }))
                    }
                  />
                  <Toggle
                    label="Peer Contact Opt-In?"
                    value={!!editRow.peer_contact_opt_in}
                    onChange={(v) =>
                      setEditRow((s) => ({ ...s, peer_contact_opt_in: v }))
                    }
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <Button variant="ghost" onClick={() => setEditRow(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditSave}>Save</Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Delete Modal */}
          {deleteRow && (
            <Modal title="Delete RSVP" onClose={() => setDeleteRow(null)}>
              <div style={{ display: "grid", gap: 12 }}>
                <div>Are you sure you want to delete:</div>
                <div style={{ fontWeight: 800 }}>
                  {deleteRow.first_name} {deleteRow.last_name}
                </div>
                <div style={{ color: "#6b7280" }}>{deleteRow.email}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button variant="ghost" onClick={() => setDeleteRow(null)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={handleDeleteConfirm}>
                    Delete
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- UI bits ---------- */

function LabeledInput({ label, ...props }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#374151" }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input
        {...props}
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          outline: "none",
          background: "#fff",
          ...(props.style || {}),
        }}
      />
    </label>
  );
}

function Button({ children, onClick, disabled, variant = "primary", style }) {
  const styles = {
    primary: { background: THEME.green, color: "#fff", border: `1px solid ${THEME.black}` },
    secondary: { background: THEME.lightYellow, color: THEME.black, border: `1px solid ${THEME.yellow}` },
    ghost: { background: "#fff", color: THEME.black, border: "1px solid #e5e7eb" },
    danger: { background: "#b91c1c", color: "#fff", border: "1px solid #b91c1c" },
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        ...styles,
        ...(style || {}),
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ title, value }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${THEME.white}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: THEME.green }}>{value}</div>
    </div>
  );
}

function BreakdownCard({ title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${THEME.white}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 8, color: THEME.green }}>{title}</div>
      {children}
    </div>
  );
}

function Progress({ value }) {
  return (
    <div style={{ height: 10, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: THEME.green }} />
    </div>
  );
}

function Chips({ map, onChipClick }) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <div style={{ color: "#6b7280" }}>No data</div>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {entries.map(([label, count]) => (
        <button
          key={label}
          onClick={() => onChipClick(label)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            border: `1px solid ${THEME.yellow}`,
            borderRadius: 20,
            background: THEME.lightYellow,
            fontSize: 13,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              display: "inline-block",
              minWidth: 24,
              textAlign: "center",
              padding: "2px 6px",
              borderRadius: 999,
              background: THEME.yellow,
              color: THEME.black,
              fontWeight: 800,
            }}
          >
            {count}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function ChipsList({ list }) {
  if (!list || list.length === 0) return <span style={{ color: "#6b7280" }}>—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {list.map((item, idx) => (
        <span
          key={`${item}-${idx}`}
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Pill({ label, onClear, kind = "filter" }) {
  const bg = kind === "reset" ? THEME.yellow : THEME.lightYellow;
  const border = kind === "reset" ? THEME.black : THEME.yellow;
  return (
    <button
      onClick={onClear}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        border: `1px solid ${border}`,
        borderRadius: 20,
        background: bg,
        fontSize: 13,
        fontWeight: 600,
        color: THEME.black,
        cursor: "pointer",
      }}
      title={kind === "reset" ? "Clear all filters" : "Clear filter"}
    >
      {label} <span style={{ fontWeight: 900 }}>×</span>
    </button>
  );
}

function RingCard({
  title,
  numerator,
  denominator,
  percent,
  onSliceClick,
  onCenterClick,
  active = false,
}) {
  const size = 120;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = Math.round((circ * Math.min(100, Math.max(0, percent))) / 100);

  return (
    <button
      onClick={onSliceClick}
      aria-label={`Toggle filter: ${title}`}
      style={{
        background: "#fff",
        border: `1px solid ${THEME.white}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        display: "flex",
        gap: 16,
        alignItems: "center",
        cursor: "pointer",
        outline: active ? `2px solid ${THEME.green}` : "none",
        textAlign: "left",
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={THEME.green}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>

        {/* center button clears */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCenterClick();
          }}
          title="Clear filter"
          style={{
            position: "absolute",
            inset: 0,
            margin: "auto",
            width: 70,
            height: 70,
            borderRadius: "50%",
            border: `1px solid ${THEME.yellow}`,
            background: THEME.lightYellow,
            color: THEME.black,
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {numerator}/{denominator}
          <div style={{ fontSize: 10 }}>{percent}%</div>
        </button>
      </div>

      <div style={{ fontWeight: 800, color: active ? THEME.green : THEME.black }}>
        {title}
      </div>
    </button>
  );
}

function Modal({ title, children, onClose }) {
  return createPortal(
    <div style={modalBackdrop} role="dialog" aria-modal="true">
      <div style={modalCard}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={modalClose}>
            ×
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* styles */
const card = {
  background: "#fff",
  border: `1px solid ${THEME.white}`,
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  marginBottom: 16,
};
const th = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: `2px solid ${THEME.green}`,
  fontWeight: 800,
  fontSize: 13,
  whiteSpace: "nowrap",
  color: THEME.black,
  background: "#fff",
};
const td = { padding: "12px 10px", verticalAlign: "top", fontSize: 14 };
const toolbarRow = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "space-between",
  padding: 12,
  borderTop: `1px solid ${THEME.white}`,
  borderBottom: `1px solid ${THEME.white}`,
  background: "#fff",
};
const twoCol = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const threeCol = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
};
const modalCard = {
  width: "min(780px, 100%)",
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 10px 24px rgba(0,0,0,0.2)",
  maxHeight: "90vh",
  overflow: "auto",
};
const modalClose = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  width: 36,
  height: 36,
  fontSize: 18,
  lineHeight: "34px",
  cursor: "pointer",
};
