// src/pages/TurkeyDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../utils/supabaseClient";

const PAGE_SIZE = 25;
const VIEW = "v_rsvps_admin";
const BASE_TABLE = "rsvps";
const FALLBACK_SLOT_CAPACITY = 80;

const THEME = {
  green: "#006633",
  yellow: "#F2AE00",
  lightYellow: "#FEF3B5",
  white: "#EFEFEF",
  black: "#000000",
  rowHighlight: "#E7F4EC",
};

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

  // selection & modals
  const [selectedId, setSelectedId] = useState(null);
  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId]
  );
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

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
  const selectedEventName = selectedEvent?.name || "";
  const eventIdentifier = (selectedEventName || "").toLowerCase().trim();
  const isTurkeyEvent = eventIdentifier.includes("turkey drop");
  const isWhiteChristmasEvent = eventIdentifier.includes("white christmas");

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
      console.log("Admin dashboard events:", data); // temporary debug
      setEvents(data || []);
    }
    loadEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  // fetch table
  useEffect(() => {
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
    setPage(0);
  }, [
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
    setInsightsCollapsed(false);
  }, [selectedEventId]);

  // fetch KPIs (includes zero-count slots)
  useEffect(() => {
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
        { h: "Texas Roadhouse Raffle?", a: (r) => (r.raffle_opt_in ? "Yes" : "No") },
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

  // selection & actions
  const onRowClick = (id) => setSelectedId((cur) => (cur === id ? null : id));
  const openEdit = (row) => setEditRow({ ...row });
  const closeEdit = () => setEditRow(null);
  const openDelete = (row) => setDeleteRow(row);
  const closeDelete = () => setDeleteRow(null);

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
      raffle_opt_in,
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
      raffle_opt_in: !!raffle_opt_in,
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
          RSVP Admin
        </h1>
        <div style={{ color: "#6b7280", marginTop: 4 }}>
          {selectedEventName
            ? `Viewing RSVPs for: ${selectedEventName}`
            : "Select an event to begin."}
        </div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          Search runs server-side across all pages.
        </div>
      </header>

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
                  disabled={loading || page + 1 >= Math.max(1, Math.ceil(total / PAGE_SIZE))}
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
                <thead style={{ position: "sticky", top: 0, background: THEME.white, zIndex: 1 }}>
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
                            background: isSel ? "#DCF7E6" : green ? THEME.rowHighlight : "#fff",
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
              <Toggle
                label="Texas Roadhouse Raffle?"
                value={!!editRow.raffle_opt_in}
                onChange={(v) =>
                  setEditRow((s) => ({ ...s, raffle_opt_in: v }))
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
