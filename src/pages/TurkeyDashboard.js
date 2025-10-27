// src/pages/TurkeyDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Prefer your shared client if you have one:
// import { supabase } from "../lib/supabaseClient";
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ---- helpers -------------------------------------------------------------

const PAGE_SIZE = 25;

function fmtDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString();
}

function toCsv(rows) {
  if (!rows || rows.length === 0) return new Blob([""], { type: "text/csv;charset=utf-8;" });
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ];
  return new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
}

async function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Post directly to your Edge Function for manual adds.
// NOTE: TURNSTILE_BYPASS=1 must be set in the function env for this to work from admin.
async function createRsvpViaEdge(payload) {
  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reserve-rsvp`;
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify({ ...payload, cf_turnstile_token: "admin-bypass" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Reserve failed (${res.status})`);
  return json;
}

// ---- component ----------------------------------------------------------

export default function AdminDashboard() {
  // Filters
  const [eventFilter, setEventFilter] = useState("");      // e.g., "Turkey Drop"
  const [dateFrom, setDateFrom] = useState("");            // yyyy-mm-dd
  const [dateTo, setDateTo] = useState("");                // yyyy-mm-dd
  const [search, setSearch] = useState("");                // name/email/phone/city/state

  // Table state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal for manual add
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    event_id: "",       // required: paste an event UUID or your event slug if that’s what you store
    slot_id: "",        // required: a slot id that exists
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "IL",
    postal_code: "",
    status: "Veteran",
    branch_of_service: ["Army"],
    era_list: ["Post-9/11"],
    era_other: null,
    rhp_client_status: false,
    peer_contact_opt_in: false,
    raffle_opt_in: false,
    consent: true,
  });

  const fromISO = useMemo(() => (dateFrom ? `${dateFrom}T00:00:00` : null), [dateFrom]);
  const toISO   = useMemo(() => (dateTo   ? `${dateTo}T23:59:59.999` : null), [dateTo]);

  // Fetch rows
  useEffect(() => {
    let isCancelled = false;

    async function run() {
      setLoading(true);
      setErrorMsg("");

      try {
        // NOTE: We’re querying the view v_rsvps_export
        let q = supabase
          .from("v_rsvps_export")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false });

        if (eventFilter?.trim()) {
          // matches event_name text (case-insensitive)
          q = q.ilike("event_name", `%${eventFilter.trim()}%`);
        }
        if (fromISO) q = q.gte("created_at", fromISO);
        if (toISO)   q = q.lte("created_at", toISO);

        // naive text search across a few fields (client side after pull)
        // We still push down pagination to Supabase for speed.
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        q = q.range(from, to);

        const { data, error, count } = await q;
        if (error) throw error;

        let filtered = data ?? [];

        if (search.trim()) {
          const s = search.trim().toLowerCase();
          filtered = filtered.filter((r) =>
            [
              r.first_name,
              r.last_name,
              r.email,
              r.phone,
              r.city,
              r.state,
              r.slot_label,
              r.event_name,
            ]
              .map((x) => String(x ?? "").toLowerCase())
              .some((v) => v.includes(s))
          );
        }

        if (!isCancelled) {
          setRows(filtered);
          // if we client-filtered, total might be off—use count when no search, else approximate
          setTotal(search.trim() ? from + filtered.length + 1 : count ?? 0);
        }
      } catch (e) {
        if (!isCancelled) setErrorMsg(e.message || "Failed to load RSVPs");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    run();
    return () => (isCancelled = true);
  }, [eventFilter, fromISO, toISO, page, search]);

  // delete one row via RPC
  async function handleDelete(id) {
    if (!window.confirm("Delete this RSVP? This will also adjust the slot's taken count.")) return;
    try {
      const { error } = await supabase.rpc("rsvp_delete", { p_id: id });
      if (error) throw error;
      // optimistic UI: remove locally
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  // Replace the existing handleExport() in TurkeyDashboard.js with this:
async function handleExport() {
  try {
    const baseUrl = process.env.REACT_APP_SUPABASE_URL;
    const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!baseUrl || !anonKey) throw new Error("Missing Supabase env vars");

    // We export from the VIEW so we get all nicely joined labels
    const endpoint = `${baseUrl}/rest/v1/v_rsvps_export`;

    // Build query params to respect current filters + search (but ignore pagination)
    const params = new URLSearchParams();

    // Select all columns in the view (you can narrow this if desired)
    params.set("select", "*");

    // Order for deterministic CSV
    params.set("order", "created_at.asc");

    // Filters
    if (eventFilter?.trim()) {
      // ilike on event_name (server-side)
      params.set("event_name", `ilike.*${eventFilter.trim()}*`);
    }
    if (fromISO) params.set("created_at", `gte.${fromISO}`);
    if (toISO)   params.append("created_at", `lte.${toISO}`); // multiple filters OK via repeated keys

    // Server-side OR search across common fields (matches your client search behavior)
    if (search?.trim()) {
      const s = search.trim().replace(/[,()]/g, ""); // keep it simple + safe
      // PostgREST OR syntax
      const orExpr =
        `or=(` +
        [
          `first_name.ilike.*${s}*`,
          `last_name.ilike.*${s}*`,
          `email.ilike.*${s}*`,
          `phone.ilike.*${s}*`,
          `city.ilike.*${s}*`,
          `state.ilike.*${s}*`,
          `slot_label.ilike.*${s}*`,
          `event_name.ilike.*${s}*`,
        ].join(",") +
        `)`;
      params.set("or", orExpr);
    }

    const url = `${endpoint}?${params.toString()}`;

    const resp = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "text/csv",
      },
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`CSV export failed (${resp.status}) ${txt.slice(0, 200)}`);
    }

    const csv = await resp.text();

    // Reuse your existing download helper if you want — or do it inline:
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    await downloadBlob(blob, `rsvps_export_${stamp}.csv`);
  } catch (e) {
    console.error("Export CSV error:", e);
    alert(e.message || "Export failed");
  }
}


  // manual add submit (posts to Edge Function)
  async function submitAdd(e) {
    e.preventDefault();
    try {
      const payload = {
        ...addForm,
        // the Edge Function accepts snake_case or camelCase
        event_id: addForm.event_id,
        slot_id: addForm.slot_id,
        first_name: addForm.first_name,
        last_name: addForm.last_name,
        email: addForm.email,
        phone: addForm.phone,
        address1: addForm.address1,
        address2: addForm.address2 || null,
        city: addForm.city,
        state: addForm.state,
        postal_code: addForm.postal_code,
        status: addForm.status,
        branch_of_service: addForm.branch_of_service,
        era_list: addForm.era_list,
        era_other: addForm.era_other,
        rhp_client_status: addForm.rhp_client_status,
        peer_contact_opt_in: addForm.peer_contact_opt_in,
        raffle_opt_in: addForm.raffle_opt_in,
        consent: true,
      };
      await createRsvpViaEdge(payload);
      alert("RSVP added");
      setShowAdd(false);
      // refresh page 0 to see newest
      setPage(0);
    } catch (err) {
      alert(err.message || "Failed to add RSVP");
    }
  }

  return (
    <div className="container py-4">
      <h1 className="mb-3">RSVP Admin</h1>

      {/* Filters */}
      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-3">
          <label className="form-label">Event (name contains)</label>
          <input
            className="form-control"
            placeholder="e.g., Turkey"
            value={eventFilter}
            onChange={(e) => { setEventFilter(e.target.value); setPage(0); }}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">From date</label>
          <input
            type="date"
            className="form-control"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">To date</label>
          <input
            type="date"
            className="form-control"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Search</label>
          <input
            className="form-control"
            placeholder="name, email, phone, city…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="col-md-2 d-flex gap-2">
          <button className="btn btn-outline-secondary w-100" onClick={handleExport}>
            Export CSV
          </button>
          <button className="btn btn-success w-100" onClick={() => setShowAdd(true)}>
            Add RSVP
          </button>
        </div>
      </div>

      {/* Table */}
      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
      <div className="table-responsive">
        <table className="table table-sm table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th>Created</th>
              <th>Event</th>
              <th>Slot</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Branches</th>
              <th>Era (legacy)</th>
              <th>City/State</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr><td colSpan={11} className="text-center py-4">No results</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.created_at)}</td>
                <td>{r.event_name}</td>
                <td>{r.slot_label}</td>
                <td>{r.first_name} {r.last_name}</td>
                <td>{r.email}</td>
                <td>{r.phone}</td>
                <td>{r.status}</td>
                <td>{Array.isArray(r.branch_of_service) ? r.branch_of_service.join("; ") : r.branch_of_service}</td>
                <td>
                  <div>{r.era}</div>
                  <small className="text-muted">
                    {Array.isArray(r.era_list) ? r.era_list.join(", ") : r.era_list}
                  </small>
                </td>
                <td>{r.city}, {r.state}</td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-2">
        <div>{loading ? "Loading…" : `Showing page ${page + 1}`}</div>
        <div className="btn-group">
          <button className="btn btn-outline-secondary" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
          <button className="btn btn-outline-secondary" disabled={rows.length < PAGE_SIZE || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>

      {/* Add Modal (very basic) */}
      {showAdd && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.5)" }}>
          <div className="modal-dialog modal-lg">
            <form className="modal-content" onSubmit={submitAdd}>
              <div className="modal-header">
                <h5 className="modal-title">Add RSVP</h5>
                <button type="button" className="btn-close" onClick={() => setShowAdd(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Event ID</label>
                    <input className="form-control" value={addForm.event_id} onChange={(e)=>setAddForm(f=>({...f,event_id:e.target.value}))} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Slot ID</label>
                    <input className="form-control" value={addForm.slot_id} onChange={(e)=>setAddForm(f=>({...f,slot_id:e.target.value}))} required />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">First name</label>
                    <input className="form-control" value={addForm.first_name} onChange={(e)=>setAddForm(f=>({...f,first_name:e.target.value}))} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Last name</label>
                    <input className="form-control" value={addForm.last_name} onChange={(e)=>setAddForm(f=>({...f,last_name:e.target.value}))} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={addForm.email} onChange={(e)=>setAddForm(f=>({...f,email:e.target.value}))} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Phone</label>
                    <input className="form-control" placeholder="10 digits" value={addForm.phone} onChange={(e)=>setAddForm(f=>({...f,phone:e.target.value}))} required />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Address 1</label>
                    <input className="form-control" value={addForm.address1} onChange={(e)=>setAddForm(f=>({...f,address1:e.target.value}))} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Address 2</label>
                    <input className="form-control" value={addForm.address2||""} onChange={(e)=>setAddForm(f=>({...f,address2:e.target.value}))} />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">City</label>
                    <input className="form-control" value={addForm.city} onChange={(e)=>setAddForm(f=>({...f,city:e.target.value}))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">State</label>
                    <input className="form-control" value={addForm.state} onChange={(e)=>setAddForm(f=>({...f,state:e.target.value}))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">ZIP</label>
                    <input className="form-control" value={addForm.postal_code} onChange={(e)=>setAddForm(f=>({...f,postal_code:e.target.value}))} required />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={addForm.status} onChange={(e)=>setAddForm(f=>({...f,status:e.target.value}))}>
                      <option>Veteran</option>
                      <option>Active Duty</option>
                      <option>Guard/Reserve</option>
                    </select>
                  </div>

                  <div className="col-md-8">
                    <label className="form-label">Branch(es) of Service</label>
                    <input className="form-control"
                      value={addForm.branch_of_service.join(", ")}
                      onChange={(e)=>setAddForm(f=>({...f,branch_of_service:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))}
                      placeholder="e.g., Army, Air National Guard"
                    />
                  </div>

                  <div className="col-md-8">
                    <label className="form-label">Service Era(s)</label>
                    <input className="form-control"
                      value={addForm.era_list.join(", ")}
                      onChange={(e)=>setAddForm(f=>({...f,era_list:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))}
                      placeholder="e.g., Pre-9/11, Persian Gulf War/Desert Storm Era"
                    />
                    <div className="form-text">Use the exact labels you validated earlier.</div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Era (Other)</label>
                    <input className="form-control" value={addForm.era_other || ""} onChange={(e)=>setAddForm(f=>({...f,era_other:e.target.value || null}))} />
                  </div>

                  <div className="col-md-12 d-flex gap-3 mt-2">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="c1"
                        checked={addForm.rhp_client_status}
                        onChange={(e)=>setAddForm(f=>({...f,rhp_client_status:e.target.checked}))} />
                      <label className="form-check-label" htmlFor="c1">RHP Client</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="c2"
                        checked={addForm.peer_contact_opt_in}
                        onChange={(e)=>setAddForm(f=>({...f,peer_contact_opt_in:e.target.checked}))} />
                      <label className="form-check-label" htmlFor="c2">Peer Contact OK</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="c3"
                        checked={addForm.raffle_opt_in}
                        onChange={(e)=>setAddForm(f=>({...f,raffle_opt_in:e.target.checked}))} />
                      <label className="form-check-label" htmlFor="c3">Raffle Opt-in</label>
                    </div>
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAdd(false)}>Close</button>
                <button type="submit" className="btn btn-primary">Add RSVP</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
