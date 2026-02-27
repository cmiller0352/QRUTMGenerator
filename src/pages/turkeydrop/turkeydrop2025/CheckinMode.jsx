import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../utils/supabaseClient";

const VIEW = "v_rsvps_admin";
const THEME = {
  green: "#006633",
  yellow: "#F2AE00",
  lightYellow: "#FEF3B5",
  white: "#EFEFEF",
};
const METRICS_PAGE_SIZE = 1000;

function fmtPhone(v) {
  return v || "—";
}

function csvEscape(v) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function makeLocalTimestampParts(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return {
    datePart: `${yyyy}-${mm}-${dd}`,
    timePart: `${hh}${min}`,
  };
}

export default function CheckinMode() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewCheckedInOnly, setViewCheckedInOnly] = useState(false);
  const [showUncheckedFirst, setShowUncheckedFirst] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [allEventRows, setAllEventRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [busyById, setBusyById] = useState({});
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [printTimestamp, setPrintTimestamp] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEventsLoading(true);
      try {
        const { data, error } = await supabase
          .from("events")
          .select("id, name, date_utc")
          .order("date_utc", { ascending: false });
        if (error) throw error;
        if (!cancelled) setEvents(data || []);
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setNotice(`Unable to load events: ${err?.message || "Unknown error"}`);
        }
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toHeadCount = useCallback((row) => {
    const n = Number(row?.family_size);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, []);

  const enrichRowsWithCheckins = useCallback(async (list) => {
    const base = Array.isArray(list) ? list : [];
    if (!base.length) return [];
    const ids = base.map((r) => r.id).filter(Boolean);
    if (!ids.length) return base;
    const { data, error } = await supabase
      .from("checkins")
      .select("rsvp_id")
      .in("rsvp_id", ids);
    if (error) return base;
    const checked = new Set((data || []).map((d) => d.rsvp_id));
    return base.map((row) => ({
      ...row,
      checked_in: row.checked_in === true || checked.has(row.id),
    }));
  }, []);

  const matchesSearch = useCallback((row, rawSearch) => {
    if (!rawSearch) return true;
    const safe = rawSearch.replace(/[(),]/g, "").toLowerCase();
    if (!safe) return true;
    const digits = safe.replace(/\D/g, "");
    const haystack = [
      row?.last_name,
      row?.first_name,
      row?.email,
      row?.phone,
    ]
      .map((v) => String(v || "").toLowerCase())
      .join(" ");
    if (haystack.includes(safe)) return true;
    if (digits.length >= 4) {
      const rowDigits = String(row?.phone_digits || row?.phone || "").replace(/\D/g, "");
      if (rowDigits.includes(digits)) return true;
    }
    return false;
  }, []);

  const filterRows = useCallback(
    (list, rawSearch) => (list || []).filter((row) => matchesSearch(row, rawSearch)),
    [matchesSearch]
  );

  const loadEventRows = useCallback(async () => {
    if (!selectedEventId) {
      setAllEventRows([]);
      setRows([]);
      return;
    }
    setLoading(true);
    setNotice("");
    try {
      const eventRows = [];
      let from = 0;
      while (true) {
        const to = from + METRICS_PAGE_SIZE - 1;
        const { data, error } = await supabase
          .from(VIEW)
          .select("*")
          .eq("event_id", selectedEventId)
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        const batch = data || [];
        eventRows.push(...batch);
        if (batch.length < METRICS_PAGE_SIZE) break;
        from += METRICS_PAGE_SIZE;
      }
      const enriched = await enrichRowsWithCheckins(eventRows);
      setAllEventRows(enriched);
      setRows(filterRows(enriched, search));
    } catch (err) {
      setAllEventRows([]);
      setRows([]);
      setNotice(`Load failed: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, enrichRowsWithCheckins, filterRows, search]);

  useEffect(() => {
    loadEventRows();
  }, [loadEventRows, refreshNonce]);

  useEffect(() => {
    setRows(filterRows(allEventRows, search));
  }, [allEventRows, search, filterRows]);

  const setBusy = (id, val) =>
    setBusyById((prev) => ({ ...prev, [id]: val }));

  const markChecked = useCallback((id, checked) => {
    const patchRow = (list) =>
      list.map((r) => (r.id === id ? { ...r, checked_in: checked } : r));
    setAllEventRows((prev) => patchRow(prev));
    setRows((prev) => patchRow(prev));
  }, []);

  const handleCheckIn = async (row) => {
    if (!row?.id) return;
    setNotice("");
    setBusy(row.id, true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-checkin", {
        body: { rsvp_id: row.id },
      });
      if (error) {
        const details = `Check-in failed (${error.code || "no-code"}): ${
          error.message || "Unknown error"
        }`;
        // eslint-disable-next-line no-console
        console.error("admin-checkin invoke error", error);
        setNotice(details);
        alert(details);
        return;
      }
      if (data?.ok !== true) {
        const details = `Check-in failed (${data?.code || "no-code"}): ${
          data?.error || "Unknown error"
        }`;
        // eslint-disable-next-line no-console
        console.error("admin-checkin response error", data);
        setNotice(details);
        alert(details);
        return;
      }
      markChecked(row.id, true);
      setNotice("Checked in.");
    } finally {
      setBusy(row.id, false);
      setRefreshNonce((n) => n + 1);
    }
  };

  const handleUndo = async (row) => {
    if (!row?.id) return;
    if (row.checked_in !== true) return;
    setNotice("");
    setBusy(row.id, true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-uncheckin", {
        body: { rsvp_id: row.id },
      });
      if (error) {
        const details = `Undo failed (${error.code || "no-code"}): ${
          error.message || "Unknown error"
        }`;
        // eslint-disable-next-line no-console
        console.error("admin-uncheckin invoke error", error);
        setNotice(details);
        alert(details);
        return;
      }
      if (data?.ok !== true) {
        const details = `Undo failed (${data?.code || "no-code"}): ${
          data?.error || "Unknown error"
        }`;
        // eslint-disable-next-line no-console
        console.error("admin-uncheckin response error", data);
        setNotice(details);
        alert(details);
        return;
      }
      markChecked(row.id, false);
      setNotice(data?.deleted === 0 ? "Already not checked in." : "Check-in undone.");
    } finally {
      setBusy(row.id, false);
      setRefreshNonce((n) => n + 1);
    }
  };

  const metrics = useMemo(() => {
    const totalRsvps = allEventRows.length;
    const checkedInCount = allEventRows.reduce(
      (sum, row) => sum + (row.checked_in === true ? 1 : 0),
      0
    );
    const totalHeads = allEventRows.reduce((sum, row) => sum + toHeadCount(row), 0);
    const headsCheckedIn = allEventRows.reduce(
      (sum, row) => sum + (row.checked_in === true ? toHeadCount(row) : 0),
      0
    );
    return {
      totalRsvps,
      checkedInCount,
      remainingCount: Math.max(0, totalRsvps - checkedInCount),
      totalHeads,
      headsCheckedIn,
      headsRemaining: Math.max(0, totalHeads - headsCheckedIn),
    };
  }, [allEventRows, toHeadCount]);

  const selectedEvent = useMemo(
    () => events.find((ev) => ev.id === selectedEventId) || null,
    [events, selectedEventId]
  );
  const displayRows = useMemo(() => {
    let list = rows;
    if (viewCheckedInOnly) {
      list = list.filter((row) => row.checked_in === true);
    }
    const indexed = list.map((row, idx) => ({ row, idx }));
    indexed.sort((a, b) => {
      if (showUncheckedFirst) {
        const aChecked = a.row.checked_in === true ? 1 : 0;
        const bChecked = b.row.checked_in === true ? 1 : 0;
        if (aChecked !== bChecked) return aChecked - bChecked;
      }
      const aLast = String(a.row.last_name || "").toLowerCase();
      const bLast = String(b.row.last_name || "").toLowerCase();
      if (aLast !== bLast) return aLast.localeCompare(bLast);
      const aFirst = String(a.row.first_name || "").toLowerCase();
      const bFirst = String(b.row.first_name || "").toLowerCase();
      if (aFirst !== bFirst) return aFirst.localeCompare(bFirst);
      return a.idx - b.idx;
    });
    return indexed.map((item) => item.row);
  }, [rows, viewCheckedInOnly, showUncheckedFirst]);
  const visibleCountLabel = useMemo(
    () => `${displayRows.length} result${displayRows.length === 1 ? "" : "s"}`,
    [displayRows.length]
  );
  const checkedInRows = useMemo(
    () => displayRows.filter((row) => row.checked_in === true),
    [displayRows]
  );

  const buildCsv = useCallback(
    (list) => {
      const sourceRows = list || [];
      const headers = [
        "created_at",
        "event_title",
        "first_name",
        "last_name",
        "email",
        "phone",
        "status",
        "family_size",
        "checked_in",
        "order_id",
        "attendee_index",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
      ];
      const eventFallback = selectedEvent?.name || selectedEventId || "";
      const lines = [headers.map(csvEscape).join(",")];
      for (const row of sourceRows) {
        const record = [
          row.created_at_local || row.created_local || row.created_at || "",
          row.event_title || row.event_name || row.event || eventFallback,
          row.first_name || "",
          row.last_name || "",
          row.email || "",
          row.phone || "",
          row.status || "",
          String(toHeadCount(row)),
          row.checked_in === true ? "TRUE" : "FALSE",
          row.order_id || "",
          row.attendee_index ?? "",
          row.utm_source || "",
          row.utm_medium || "",
          row.utm_campaign || "",
          row.utm_term || "",
          row.utm_content || "",
        ];
        lines.push(record.map(csvEscape).join(","));
      }
      return `${lines.join("\r\n")}\r\n`;
    },
    [selectedEvent, selectedEventId, toHeadCount]
  );

  const handleExportCsv = useCallback(() => {
    if (allEventRows.length === 0) return;
    const csv = buildCsv(allEventRows);
    const { datePart, timePart } = makeLocalTimestampParts(new Date());
    const filename = `rsvps_${datePart}_${timePart}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [allEventRows, buildCsv]);

  const handleExportCheckedInCsv = useCallback(() => {
    if (checkedInRows.length === 0) return;
    const csv = buildCsv(checkedInRows);
    const { datePart, timePart } = makeLocalTimestampParts(new Date());
    const filename = `checked-in_${datePart}_${timePart}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [checkedInRows, buildCsv]);

  const handlePrintList = useCallback(() => {
    if (displayRows.length === 0) return;
    setPrintTimestamp(new Date().toLocaleString());
    window.setTimeout(() => {
      window.print();
    }, 0);
  }, [displayRows.length]);

  return (
    <div className="checkin-root" style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 24 }}>
      <style>{`
        .checkin-print-roster {
          display: none;
        }
        @media print {
          @page {
            margin: 12mm;
          }
          html,
          body {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          .checkin-screen-ui {
            display: none !important;
          }
          .checkin-root {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
            height: auto !important;
          }
          .checkin-print-roster {
            display: block !important;
            position: static !important;
            width: auto !important;
            padding: 0;
            margin: 0;
            background: #fff;
            color: #000;
            font-size: 12px;
            line-height: 1.35;
          }
          .checkin-print-header {
            border-bottom: 2px solid #111;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .checkin-print-header h1 {
            margin: 0 0 6px 0;
            font-size: 24px;
            line-height: 1.2;
          }
          .checkin-print-meta {
            margin: 0;
          }
          .checkin-print-table {
            width: 100%;
            border-collapse: collapse;
          }
          .checkin-print-table th,
          .checkin-print-table td {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            vertical-align: top;
            text-align: left;
          }
          .checkin-print-table th {
            background: #f3f4f6;
            font-weight: 700;
          }
          .checkin-print-table tr {
            break-inside: avoid;
          }
        }
      `}</style>
      <div className="checkin-screen-ui">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, color: THEME.green }}>Check-in Mode</h1>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/admin/rsvps";
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#111827",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Back to RSVP Admin
        </button>
      </div>
      <p style={{ marginTop: 8, color: "#4b5563" }}>
        Search and check in guests quickly.
      </p>

      <section
        style={{
          background: "#fff",
          border: `1px solid ${THEME.white}`,
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          marginBottom: 16,
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <label
            htmlFor="checkin-event"
            style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}
          >
            Event
          </label>
          <select
            id="checkin-event"
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value || "");
              setSearchInput("");
              setSearch("");
              setNotice("");
            }}
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              padding: "10px 12px",
              fontSize: 14,
              outline: "none",
              background: "#fff",
            }}
          >
            <option value="">{eventsLoading ? "Loading events..." : "Select an event..."}</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name || ev.id}
              </option>
            ))}
          </select>
        </div>

        {selectedEventId ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 10 }}>
              <div style={{ color: "#6b7280", fontSize: 12 }}>Total RSVPs</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>
                {metrics.totalRsvps}
              </div>
            </div>
            <div style={{ background: "#ECFDF3", borderRadius: 10, padding: 10 }}>
              <div style={{ color: "#065F46", fontSize: 12 }}>Checked In</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: THEME.green }}>
                {metrics.checkedInCount}
              </div>
            </div>
            <div style={{ background: THEME.lightYellow, borderRadius: 10, padding: 10 }}>
              <div style={{ color: "#92400E", fontSize: 12 }}>Remaining</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#92400E" }}>
                {metrics.remainingCount}
              </div>
            </div>
            <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 10 }}>
              <div style={{ color: "#6b7280", fontSize: 12 }}>Expected Heads</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>
                {metrics.totalHeads}
              </div>
            </div>
            <div style={{ background: "#ECFDF3", borderRadius: 10, padding: 10 }}>
              <div style={{ color: "#065F46", fontSize: 12 }}>Heads Checked In</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: THEME.green }}>
                {metrics.headsCheckedIn}
              </div>
            </div>
            <div style={{ background: THEME.lightYellow, borderRadius: 10, padding: 10 }}>
              <div style={{ color: "#92400E", fontSize: 12 }}>Heads Remaining</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#92400E" }}>
                {metrics.headsRemaining}
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={!selectedEventId}
            placeholder="Search last name, email, or phone"
            style={{
              width: "100%",
              fontSize: 22,
              lineHeight: 1.2,
              padding: "16px 18px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!selectedEventId || allEventRows.length === 0}
            style={{
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background:
                !selectedEventId || allEventRows.length === 0 ? "#f3f4f6" : "#fff",
              color:
                !selectedEventId || allEventRows.length === 0 ? "#9ca3af" : "#111827",
              cursor:
                !selectedEventId || allEventRows.length === 0 ? "not-allowed" : "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportCheckedInCsv}
            disabled={!selectedEventId || checkedInRows.length === 0}
            style={{
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background:
                !selectedEventId || checkedInRows.length === 0 ? "#f3f4f6" : "#fff",
              color:
                !selectedEventId || checkedInRows.length === 0 ? "#9ca3af" : "#111827",
              cursor:
                !selectedEventId || checkedInRows.length === 0 ? "not-allowed" : "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Export Checked-in Only
          </button>
          <button
            type="button"
            onClick={handlePrintList}
            disabled={!selectedEventId || displayRows.length === 0}
            style={{
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background:
                !selectedEventId || displayRows.length === 0 ? "#f3f4f6" : "#fff",
              color:
                !selectedEventId || displayRows.length === 0 ? "#9ca3af" : "#111827",
              cursor:
                !selectedEventId || displayRows.length === 0 ? "not-allowed" : "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Print List
          </button>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={viewCheckedInOnly}
              onChange={(e) => setViewCheckedInOnly(e.target.checked)}
              disabled={!selectedEventId}
            />
            View checked-in only
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={showUncheckedFirst}
              onChange={(e) => setShowUncheckedFirst(e.target.checked)}
              disabled={!selectedEventId}
            />
            Show unchecked first
          </label>
        </div>
        <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
          {!selectedEventId
            ? "Select an event to search and check in guests."
            : loading
            ? "Searching..."
            : visibleCountLabel}
          {selectedEventId && checkedInRows.length === 0 ? (
            <span style={{ marginLeft: 10, color: "#9ca3af" }}>
              No checked-in records to export.
            </span>
          ) : null}
          {notice ? <span style={{ marginLeft: 10 }}>{notice}</span> : null}
        </div>
      </section>

      {selectedEventId ? (
        <section
          style={{
            background: "#fff",
            border: `1px solid ${THEME.white}`,
            borderRadius: 12,
            padding: 8,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          {loading ? (
            <div style={{ padding: 16 }}>Loading...</div>
          ) : displayRows.length === 0 ? (
            <div style={{ padding: 16, color: "#6b7280" }}>No matches found.</div>
          ) : (
            displayRows.map((row) => {
              const busy = !!busyById[row.id];
              const checked = row.checked_in === true;
              return (
                <div
                  key={row.id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    padding: 14,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 800, color: "#111827", fontSize: 18 }}>
                      {`${row.first_name || ""} ${row.last_name || ""}`.trim() || "—"}
                    </div>
                    <div style={{ color: "#374151" }}>
                      <strong>Email:</strong> {row.email || "—"}
                    </div>
                    <div style={{ color: "#374151" }}>
                      <strong>Phone:</strong> {fmtPhone(row.phone)}
                    </div>
                    <div style={{ color: "#374151" }}>
                      <strong>Status:</strong> {row.status || "—"}
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
                  >
                    {checked ? (
                      <>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            borderRadius: 999,
                            fontWeight: 700,
                            background: "#DCF7E6",
                            color: THEME.green,
                            border: "1px solid #A7E3BE",
                          }}
                        >
                          Checked in
                        </span>
                        <button
                          onClick={() => handleUndo(row)}
                          disabled={busy}
                          style={{
                            padding: "12px 18px",
                            borderRadius: 10,
                            border: "1px solid #d1d5db",
                            background: "#fff",
                            cursor: busy ? "not-allowed" : "pointer",
                            fontWeight: 700,
                          }}
                        >
                          {busy ? "Undoing..." : "Undo"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleCheckIn(row)}
                        disabled={busy}
                        style={{
                          padding: "14px 20px",
                          borderRadius: 10,
                          border: "1px solid #000",
                          background: THEME.green,
                          color: "#fff",
                          cursor: busy ? "not-allowed" : "pointer",
                          fontWeight: 800,
                          fontSize: 16,
                        }}
                      >
                        {busy ? "Checking in..." : "Check in"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      ) : null}
      </div>

      <section className="checkin-print-roster">
        <div className="checkin-print-header">
          <h1>Check-in Roster</h1>
          <p className="checkin-print-meta">
            Event: {selectedEvent?.name || selectedEventId || "—"}
          </p>
          <p className="checkin-print-meta">
            Printed: {printTimestamp || new Date().toLocaleString()}
          </p>
          <p className="checkin-print-meta">Rows: {displayRows.length}</p>
        </div>
        <table className="checkin-print-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Heads</th>
              <th>Checked In</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={5}>No entries in current results.</td>
              </tr>
            ) : (
              displayRows.map((row, idx) => (
                <tr key={`print-${row.id || row.rsvp_id || idx}`}>
                  <td>
                    {(row.last_name || "—")}, {(row.first_name || "—")}
                  </td>
                  <td>{row.email || "—"}</td>
                  <td>{fmtPhone(row.phone)}</td>
                  <td>{toHeadCount(row)}</td>
                  <td>{row.checked_in === true ? "YES" : ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
