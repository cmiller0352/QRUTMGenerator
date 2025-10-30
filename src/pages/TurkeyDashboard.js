// src/pages/TurkeyDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";

const PAGE_SIZE = 25;
const VIEW = "v_rsvps_admin";
const FALLBACK_SLOT_CAPACITY = 80;

// Brand palette
const THEME = {
  green: "#006633",
  yellow: "#F2AE00",
  lightYellow: "#FEF3B5",
  white: "#EFEFEF",
  black: "#000000",
};

// Order your labels here if you don't have a true start time in DB:
const SLOT_ORDER = [
  "11:00–11:30 am",
  "11:30–12:00 pm",
  "12:00–12:30 pm",
  "12:30–1:00 pm",
  "1:00–1:30 pm",
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

export default function TurkeyDashboard() {
  const [eventFilter, setEventFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  // NEW: structured filters for exact matching via chips
  const [branchFilter, setBranchFilter] = useState(""); // exact, from chip
  const [eraFilter, setEraFilter] = useState("");       // exact, from chip

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // KPI state
  const [branchCounts, setBranchCounts] = useState({});
  const [eraCounts, setEraCounts] = useState({});
  const [slotCounts, setSlotCounts] = useState({});
  const [slotCapacities, setSlotCapacities] = useState({});
  const [showInsights, setShowInsights] = useState(false);

  const fromISO = useMemo(() => (fromDate ? `${fromDate}T00:00:00` : null), [fromDate]);
  const toISO = useMemo(() => (toDate ? `${toDate}T23:59:59.999` : null), [toDate]);

  const buildQuery = (selectCols = "*") => {
    let q = supabase.from(VIEW).select(selectCols, { count: "exact" }).order("created_at", { ascending: false });

    if (eventFilter?.trim()) q = q.ilike("event_name", `%${eventFilter.trim()}%`);
    if (fromISO) q = q.gte("created_at", fromISO);
    if (toISO) q = q.lte("created_at", toISO);

    // NEW: exact filters from chips (arrays)
    if (branchFilter) q = q.contains("branch_of_service", [branchFilter]);
    if (eraFilter) q = q.contains("era_list", [eraFilter]);

    // Free-text search remains fuzzy (good for names, emails, etc.)
    if (search?.trim()) {
      const s = search.trim().replace(/[(),]/g, "");
      const digits = s.replace(/\D/g, "");

      const cols = [
        "first_name", "last_name", "email", "phone",
        "status", "era", "era_other", "address1", "address2",
        "city", "state", "postal_code", "ticket_code", "slot_label",
        "branch_of_service_txt",
        "era_list_txt",
      ];
      const clauses = cols.map((c) => `${c}.ilike.%${s}%`);
      if (digits.length >= 4) clauses.push(`phone_digits.ilike.%${digits}%`);
      q = q.or(clauses.join(","));
    }
    return q;
  };

  // Table fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        let q = buildQuery("*");
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        q = q.range(from, to);
        const { data, error, count } = await q;
        if (error) throw error;
        if (!cancelled) { setRows(data ?? []); setTotal(count ?? 0); }
      } catch (e) {
        if (!cancelled) setErr(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter, fromISO, toISO, search, page, branchFilter, eraFilter]);

  useEffect(() => { setPage(0); }, [eventFilter, fromISO, toISO, search, branchFilter, eraFilter]);

  // KPI fetch (lightweight)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await buildQuery("branch_of_service, era, era_list, slot_label, slot_capacity");
        if (error) throw error;
        const list = data || [];

        // Branch counts
        const bmap = {};
        for (const r of list) {
          const arr = Array.isArray(r.branch_of_service) ? r.branch_of_service : (r.branch_of_service ? [r.branch_of_service] : []);
          for (const b of arr) {
            const key = (b || "").trim();
            if (!key) continue;
            bmap[key] = (bmap[key] || 0) + 1;
          }
        }

        // Era counts (prefer era_list)
        const emap = {};
        for (const r of list) {
          const items = Array.isArray(r.era_list) && r.era_list.length ? r.era_list : (r.era ? [r.era] : []);
          for (const e of items) {
            const key = (e || "").trim();
            if (!key) continue;
            emap[key] = (emap[key] || 0) + 1;
          }
        }

        // Slot counts + capacity
        const smap = {}; const cap = {};
        for (const r of list) {
          const label = (r.slot_label || "").trim();
          if (!label) continue;
          smap[label] = (smap[label] || 0) + 1;
          if (r.slot_capacity != null) cap[label] = r.slot_capacity;
        }

        if (!cancelled) {
          setBranchCounts(bmap);
          setEraCounts(emap);
          setSlotCounts(smap);
          setSlotCapacities(cap);
        }
      } catch {
        // ignore KPI errors
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter, fromISO, toISO, search, branchFilter, eraFilter]);

  // Export (all rows that match current filters)
  const exportAll = async () => {
    try {
      setLoading(true);
      const { data, error } = await buildQuery("*");
      if (error) throw error;
      const rows = data ?? [];
      const cols = [
        { h: "Created", a: (r) => fmtDate(r.created_at) },
        { h: "Event", a: (r) => r.event_name ?? "" },
        { h: "Slot", a: (r) => r.slot_label ?? "" },
        { h: "First", a: (r) => r.first_name ?? "" },
        { h: "Last", a: (r) => r.last_name ?? "" },
        { h: "Email", a: (r) => r.email ?? "" },
        { h: "Phone", a: (r) => r.phone ?? "" },
        { h: "Status", a: (r) => r.status ?? "" },
        { h: "Branch(es)", a: (r) => (Array.isArray(r.branch_of_service) ? r.branch_of_service.join(", ") : r.branch_of_service ?? "") },
        { h: "Era", a: (r) => r.era ?? "" },
        { h: "Eras (list)", a: (r) => (Array.isArray(r.era_list) ? r.era_list.join(", ") : r.era_list ?? "") },
        { h: "City", a: (r) => r.city ?? "" },
        { h: "State", a: (r) => r.state ?? "" },
        { h: "ZIP", a: (r) => r.postal_code ?? "" },
        { h: "Ticket", a: (r) => r.ticket_code ?? "" },
      ];
      const esc = (v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = cols.map(c => esc(c.h)).join(",") + "\n" +
        rows.map(r => cols.map(c => esc(c.a(r))).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `rsvps_export_${stamp}.csv`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(e.message || "Export failed");
    } finally { setLoading(false); }
  };

  // NEW: chip handlers -> exact filters
  const onBranchChip = (label) => {
    setBranchFilter((prev) => (prev === label ? "" : label));
    setSearch(""); // keep search box for fuzzy; chip uses exact
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onEraChip = (label) => {
    setEraFilter((prev) => (prev === label ? "" : label));
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearAllFilters = () => {
    setBranchFilter("");
    setEraFilter("");
    setSearch("");
    setEventFilter("");
    setFromDate("");
    setToDate("");
  };

  const sortedSlots = Object.keys(slotCounts).sort((a,b) => {
    const ia = SLOT_ORDER.indexOf(a); const ib = SLOT_ORDER.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });

  // Small helpers for UI
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const PagerSummary = () => (
    <div style={pagerRow}>
      <div style={{ color: "#374151" }}>
        <strong>Page {page + 1}</strong> of <strong>{pages}</strong> • <strong>{total}</strong> total
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="ghost" disabled={page===0||loading} onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</Button>
        <Button variant="ghost" disabled={loading || (page+1)>=pages} onClick={()=>setPage(p=>p+1)}>Next</Button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: THEME.green }}>RSVP Admin</h1>
        <div style={{ color: "#6b7280" }}>Search runs server-side across all pages.</div>
      </header>

      {/* --- Insights FIRST (collapsed by default) --- */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 800, color: THEME.black }}>Insights</div>
          <Button variant="ghost" onClick={()=>setShowInsights(s=>!s)}>{showInsights ? "Hide" : "Show"}</Button>
        </div>

        {showInsights && (
          <div style={{ display: "grid", gap: 16 }}>
            <BreakdownCard title="Branch of Service">
              <Chips map={branchCounts} onChipClick={onBranchChip} />
            </BreakdownCard>

            <BreakdownCard title="Era of Service">
              <Chips map={eraCounts} onChipClick={onEraChip} />
            </BreakdownCard>

            <BreakdownCard title="Slot Utilization">
              {sortedSlots.length === 0 ? <div style={{ color: "#6b7280" }}>No data</div> : (
                <div style={{ display: "grid", gap: 8 }}>
                  {sortedSlots.map((slot)=> {
                    const count = slotCounts[slot] || 0;
                    const cap = slotCapacities[slot] ?? FALLBACK_SLOT_CAPACITY;
                    const pct = Math.min(100, Math.round((count / (cap || FALLBACK_SLOT_CAPACITY)) * 100));
                    return (
                      <div key={slot} style={{ display: "grid", gridTemplateColumns: "220px 1fr 90px", gap: 10, alignItems: "center" }}>
                        <div style={{ whiteSpace: "nowrap" }}>{slot}</div>
                        <Progress value={pct} />
                        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <strong>{count}</strong> / {cap || FALLBACK_SLOT_CAPACITY} ({pct}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </BreakdownCard>
          </div>
        )}
      </section>

      {/* --- Filters --- */}
      <section style={card}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.8fr 0.8fr 1.6fr auto",
          gap: 12, alignItems: "end",
        }}>
          <LabeledInput label="Event (contains)" placeholder="e.g., Turkey Drop" value={eventFilter} onChange={(e)=>setEventFilter(e.target.value)}/>
          <LabeledInput label="From date" type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)}/>
          <LabeledInput label="To date" type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)}/>
          <LabeledInput label="Search (fuzzy)" placeholder="Army, Vietnam, name, phone…" value={search} onChange={(e)=>setSearch(e.target.value)}/>
          <Button onClick={exportAll} variant="secondary">Export CSV</Button>
        </div>

        {/* Active filter pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {branchFilter && (
            <Pill onClear={()=>setBranchFilter("")} label={`Branch: ${branchFilter}`} />
          )}
          {eraFilter && (
            <Pill onClear={()=>setEraFilter("")} label={`Era: ${eraFilter}`} />
          )}
          {(branchFilter || eraFilter || eventFilter || fromDate || toDate || search) && (
            <Pill kind="reset" onClear={clearAllFilters} label="Clear all filters" />
          )}
        </div>

        {err ? <div style={{ color: "#b91c1c", marginTop: 8 }}>{err}</div> : null}
      </section>

      {/* --- Table --- */}
      <section style={card}>
        {/* NEW: Top pager */}
        <PagerSummary />

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, background: THEME.white, zIndex: 1 }}>
              <tr>
                {["Created","Event","Slot","Name","Email","Phone","Status","Branch(es)","Era / Eras","City/State"].map((h)=>(
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 16 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 16 }}>No results</td></tr>
              ) : (
                rows.map((r)=>(
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={td}>{fmtDate(r.created_at)}</td>
                    <td style={td}>{r.event_name}</td>
                    <td style={td}>{r.slot_label}</td>
                    <td style={td}><strong>{`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()}</strong></td>
                    <td style={td}>{r.email}</td>
                    <td style={td}>{r.phone}</td>
                    <td style={td}>{r.status}</td>
                    <td style={td}>{Array.isArray(r.branch_of_service)? r.branch_of_service.join(", ") : (r.branch_of_service ?? "")}</td>
                    <td style={td}>
                      <div>{r.era}</div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        {Array.isArray(r.era_list) ? r.era_list.join(", ") : (r.era_list ?? "")}
                      </div>
                    </td>
                    <td style={td}>{[r.city, r.state].filter(Boolean).join(", ")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom pager (existing) */}
        <PagerSummary />
      </section>
    </div>
  );
}

/* UI bits */
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
          ...(props.style || {})
        }}
      />
    </label>
  );
}

function Button({ children, onClick, disabled, variant = "primary" }) {
  const styles = {
    primary: { background: THEME.green, color: "#fff", border: `1px solid ${THEME.black}` },
    secondary: { background: THEME.lightYellow, color: THEME.black, border: `1px solid ${THEME.yellow}` },
    ghost: { background: "#fff", color: THEME.black, border: "1px solid #e5e7eb" },
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
        boxShadow: variant !== "ghost" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
        ...styles
      }}
    >
      {children}
    </button>
  );
}

function BreakdownCard({ title, children }) {
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${THEME.white}`,
      borderRadius: 12,
      padding: 16,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
    }}>
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
  const entries = Object.entries(map).sort((a,b)=> b[1]-a[1]);
  if (entries.length === 0) return <div style={{ color: "#6b7280" }}>No data</div>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {entries.map(([label,count])=>(
        <button
          key={label}
          onClick={()=>onChipClick(label)}
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
            fontWeight: 600
          }}
        >
          <span style={{
            display:"inline-block",
            minWidth: 24,
            textAlign:"center",
            padding: "2px 6px",
            borderRadius: 999,
            background: THEME.yellow,
            color: THEME.black,
            fontWeight: 800
          }}>{count}</span>
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
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      border: `1px solid ${border}`,
      borderRadius: 20,
      background: bg,
      fontSize: 13,
      fontWeight: 600,
      color: THEME.black
    }}>
      {label}
      <button onClick={onClear} style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontWeight: 900
      }}>×</button>
    </span>
  );
}

/* styles */
const card = {
  background: "#fff",
  border: `1px solid ${THEME.white}`,
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  marginBottom: 16
};
const th = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: `2px solid ${THEME.green}`,
  fontWeight: 800,
  fontSize: 13,
  whiteSpace: "nowrap",
  color: THEME.black,
  background: "#fff"
};
const td = { padding: "12px 10px", verticalAlign: "top", fontSize: 14 };
const pagerRow = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "space-between",
  padding: 12,
  borderTop: `1px solid ${THEME.white}`,
  borderBottom: `1px solid ${THEME.white}`,
  background: "#fff"
};
