// src/pages/TurkeyDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";

const PAGE_SIZE = 25;

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
  // Filters
  const [eventFilter, setEventFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState(""); // e.g., "Army"

  // Table state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Normalize dates to ISO
  const fromISO = useMemo(() => (fromDate ? `${fromDate}T00:00:00` : null), [fromDate]);
  const toISO = useMemo(() => (toDate ? `${toDate}T23:59:59.999` : null), [toDate]);

  /** Build a Supabase query with filters + server-side search (no .range yet) */
  const buildQuery = () => {
    let q = supabase
      .from("v_rsvps_export")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (eventFilter?.trim()) q = q.ilike("event_name", `%${eventFilter.trim()}%`);
    if (fromISO) q = q.gte("created_at", fromISO);
    if (toISO) q = q.lte("created_at", toISO);
    if (cityFilter?.trim()) q = q.ilike("city", `%${cityFilter.trim()}%`);

    // Branch filter that works with text[] using array overlap
    if (branchFilter?.trim()) q = q.overlaps("branch_of_service", [branchFilter.trim()]);

    // Global search across scalar fields (now including flattened txt columns)
    if (search?.trim()) {
      const s = search.trim().replace(/[(),]/g, "");
      const digits = s.replace(/\D/g, "");
      const scalarCols = [
        "first_name", "last_name", "email", "phone", "city", "state",
        "slot_label", "event_name", "status", "era", "era_other",
        "postal_code", "ticket_code",
        "branch_of_service_txt",   // from updated view
        "era_list_txt",            // from updated view
      ];
      const clauses = scalarCols.map((c) => `${c}.ilike.%${s}%`);
      if (digits.length >= 4) clauses.push(`phone_digits.ilike.%${digits}%`);
      q = q.or(clauses.join(","));
    }

    return q;
  };

  /** Fetch current page */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        let q = buildQuery();
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        q = q.range(from, to);

        const { data, error, count } = await q;
        if (error) throw error;

        if (!cancelled) {
          setRows(data ?? []);
          setTotal(count ?? 0);
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter, fromISO, toISO, cityFilter, branchFilter, search, page]);

  // Reset to first page when filters change
  useEffect(() => { setPage(0); }, [eventFilter, fromISO, toISO, cityFilter, branchFilter, search]);

  /** Export ALL matching rows */
  const exportAll = async () => {
    try {
      setLoading(true);
      let q = buildQuery();
      const { data, error } = await q;
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
      const csv =
        cols.map((c) => esc(c.h)).join(",") + "\n" +
        rows.map((r) => cols.map((c) => esc(c.a(r))).join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `rsvps_export_${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
      alert(e.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>RSVP Admin</h1>
        <div style={{ color: "#6b7280" }}>Search runs server-side across all pages.</div>
      </header>

      {/* Filters Card */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.8fr 0.8fr 1fr 0.8fr 0.6fr auto auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <LabeledInput label="Event (contains)" placeholder="e.g., Turkey Drop" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} />
          <LabeledInput label="From date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <LabeledInput label="To date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <LabeledInput label="City (contains)" placeholder="e.g., Effingham" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
          <LabeledInput label="Branch (array match)" placeholder="e.g., Army" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} />
          <LabeledInput label="Search (all fields)" placeholder="name, email, phone, etc." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button onClick={exportAll} variant="secondary">Export CSV</Button>
          <Button onClick={() => (window.location.href = "/admin/add-rsvp")}>Add RSVP</Button>
        </div>
        {err ? <div style={{ color: "#b91c1c", marginTop: 8 }}>{err}</div> : null}
      </section>

      {/* Table Card */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
              <tr>
                {["Created","Event","Slot","Name","Email","Phone","Status","Branch(es)","Era / Eras","City/State"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 16 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 16 }}>No results</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={td}>{fmtDate(r.created_at)}</td>
                    <td style={td}>{r.event_name}</td>
                    <td style={td}>{r.slot_label}</td>
                    <td style={td}><strong>{`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()}</strong></td>
                    <td style={td}>{r.email}</td>
                    <td style={td}>{r.phone}</td>
                    <td style={td}>{r.status}</td>
                    <td style={td}>{Array.isArray(r.branch_of_service) ? r.branch_of_service.join(", ") : r.branch_of_service ?? ""}</td>
                    <td style={td}>
                      <div>{r.era}</div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        {Array.isArray(r.era_list) ? r.era_list.join(", ") : r.era_list ?? ""}
                      </div>
                    </td>
                    <td style={td}>{[r.city, r.state].filter(Boolean).join(", ")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", padding: 12, borderTop: "1px solid #e5e7eb" }}>
          <div style={{ color: "#6b7280" }}>
            Page <strong>{page + 1}</strong> of <strong>{Math.max(1, Math.ceil(total / PAGE_SIZE))}</strong> • {total} total
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
            <Button variant="ghost" disabled={loading || (page + 1) >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* UI helpers */
function LabeledInput({ label, ...props }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#374151" }}>
      <span>{label}</span>
      <input {...props} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", ...(props.style || {}) }} />
    </label>
  );
}
function Button({ children, onClick, disabled, variant = "primary" }) {
  const styles = {
    primary: { background: "#166534", color: "#fff", border: "1px solid #14532d" },
    secondary: { background: "#f3f4f6", color: "#111827", border: "1px solid #e5e7eb" },
    ghost: { background: "#fff", color: "#111827", border: "1px solid #e5e7eb" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "10px 14px", borderRadius: 8, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", ...styles }}>
      {children}
    </button>
  );
}
const td = { padding: "12px 10px", verticalAlign: "top", fontSize: 14 };
