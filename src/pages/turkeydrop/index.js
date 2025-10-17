import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../utils/supabaseClient";

const EVENT_ID = "effingham-2025"; // events.id
const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "";

// Multi-select options
const BRANCHES = [
  "Army","Army Reserve","Marine Corps","Marine Corps Reserve","Navy","Navy Reserve",
  "Air Force","Air Force Reserve","Coast Guard","Coast Guard Reserve","Space Force"
];
const ERAS = [
  "WWII","Korean War Era","Vietnam War Era","Cold War","Persian Gulf War","OIF/OEF/OND","Other"
];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida",
  "Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine",
  "Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska",
  "Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee",
  "Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

const styles = {
  field: { display: "grid", gap: 6 },
  row: { display: "grid", gap: 12, gridTemplateColumns: "2fr 1fr 1fr" },
  error: { color: "crimson", fontSize: "0.9em", marginTop: 4 },
  invalidInput: { borderColor: "crimson", outlineColor: "crimson" },
  subtleBtn: { border: "1px solid #ddd", background: "#fafafa", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }
};

export default function TurkeyDropRSVP() {
  // form state
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [digits,    setDigits]    = useState("");

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city,     setCity]     = useState("");
  const [state,    setState]    = useState("Illinois");
  const [zip,      setZip]      = useState("");

  const [status, setStatus] = useState("Veteran");
  const [branches, setBranches] = useState([]);
  const [eras, setEras] = useState([]);
  const [eraOther, setEraOther] = useState("");

  const [rhpClient, setRhpClient] = useState(false);
  const [peerContact, setPeerContact] = useState(false);

  const [raffle,  setRaffle]  = useState(false);
  const [consent, setConsent] = useState(false);

  const [slotId,         setSlotId]         = useState("");
  const [slots,          setSlots]          = useState([]);
  const [loadingSlots,   setLoadingSlots]   = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message,    setMessage]    = useState("");
  const [errors,     setErrors]     = useState({});

  // refs (auto focus)
  const phoneRef  = useRef(null);
  const addr1Ref  = useRef(null);
  const zipRef    = useRef(null);
  const statusRef = useRef(null);

  // ---------------- Turnstile state (CRA) ----------------
  const [scriptReady, setScriptReady] = useState(false);
  const [widgetId, setWidgetId] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");

  // load Turnstile script once
  useEffect(() => {
    if (!SITE_KEY) return; // no key set yet
    if (document.getElementById("cf-turnstile-script")) {
      setScriptReady(!!window.turnstile);
      return;
    }
    const s = document.createElement("script");
    s.id = "cf-turnstile-script";
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => setScriptReady(true);
    document.head.appendChild(s);
  }, []);

  // render invisible widget once script is ready
  useEffect(() => {
    if (!scriptReady || !window.turnstile || widgetId || !SITE_KEY) return;
    const id = window.turnstile.render("#turnstile-container", {
      sitekey: SITE_KEY,
      size: "invisible",
      callback: (token) => setCaptchaToken(token),
      "expired-callback": () => setCaptchaToken(""),
      "error-callback": () => setCaptchaToken(""),
      retry: "auto",
    });
    setWidgetId(id);
  }, [scriptReady, widgetId]);

  // bridge: resolve when token arrives
  useEffect(() => {
    if (!captchaToken) return;
    const ev = new CustomEvent("cf-turnstile-token", { detail: { token: captchaToken } });
    document.dispatchEvent(ev);
  }, [captchaToken]);

  const getTurnstileToken = async () => {
    if (!window.turnstile || !widgetId) return "";
    if (captchaToken) return captchaToken;
    return new Promise((resolve) => {
      const onToken = (e) => {
        resolve(e.detail.token);
        document.removeEventListener("cf-turnstile-token", onToken);
      };
      document.addEventListener("cf-turnstile-token", onToken);
      window.turnstile.execute(widgetId);
      setTimeout(() => {
        document.removeEventListener("cf-turnstile-token", onToken);
        resolve("");
      }, 3000);
    });
  };
  // -------------------------------------------------------

  // load pickup windows
  useEffect(() => {
    const load = async () => {
      setLoadingSlots(true);
      const { data, error } = await supabase
        .from("pickup_slots")
        .select("id,label,capacity,taken,start_utc")
        .eq("event_id", EVENT_ID)
        .order("start_utc", { ascending: true });
      if (error) setMessage(`❌ Could not load pickup windows: ${error.message}`);
      else setSlots(data || []);
      setLoadingSlots(false);
    };
    load();
  }, []);

  // phone formatting + auto-jump
  const formatPhone = (d) => {
    const a = d.slice(0, 3);
    const b = d.slice(3, 6);
    const c = d.slice(6, 10);
    if (d.length <= 3) return `(${a}`;
    if (d.length <= 6) return `(${a}) ${b}`;
    return `(${a}) ${b}-${c}`;
  };
  const onPhoneChange = (e) => {
    const nextDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setDigits(nextDigits);
    setPhone(formatPhone(nextDigits));
    if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
  };
  useEffect(() => {
    if (digits.length === 10 && document.activeElement === phoneRef.current && addr1Ref.current) {
      addr1Ref.current.focus();
    }
  }, [digits]);
  const clearPhone = () => { setDigits(""); setPhone(""); phoneRef.current?.focus(); };

  // zip formatting + auto-jump
  const onZipChange = (e) => {
    const next = e.target.value.replace(/\D/g, "").slice(0, 5);
    setZip(next);
    if (errors.zip) setErrors((p) => ({ ...p, zip: undefined }));
  };
  useEffect(() => {
    if (zip.length === 5 && document.activeElement === zipRef.current && statusRef.current) {
      statusRef.current.focus();
    }
  }, [zip]);

  // helpers
  const isEmail = (v) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(v);
  const remaining = (s) => {
    const cap = typeof s.capacity === "number" ? s.capacity : 0;
    return Math.max(0, cap - (s.taken || 0));
  };

  const toggleInArray = (arrSetter, arr, val) => {
    if (arr.includes(val)) arrSetter(arr.filter(v => v !== val));
    else arrSetter([...arr, val]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);
    setErrors({});

    const newErrors = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required.";
    if (!lastName.trim())  newErrors.lastName  = "Last name is required.";
    if (!email.trim() || !isEmail(email.trim())) newErrors.email = "A valid email is required.";
    if (digits.length !== 10) newErrors.phone  = "Enter a valid 10-digit phone number.";
    if (!address1.trim()) newErrors.address1 = "Address is required.";
    if (!city.trim())     newErrors.city     = "City is required.";
    if (!state.trim())    newErrors.state    = "State is required.";
    if (zip.length !== 5) newErrors.zip      = "ZIP must be 5 digits.";
    if (!status) newErrors.status = "Please select a status.";
    if (branches.length === 0) newErrors.branches = "Select at least one branch.";
    if (eras.length === 0) newErrors.eras = "Select at least one service era.";
    if (eras.includes("Other") && eraOther.trim().length < 2) newErrors.eraOther = "Please describe your era.";
    if (!slotId) newErrors.slot   = "Please choose a pickup window.";
    if (!consent) newErrors.consent = "You must consent before submitting.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitting(false);
      const firstKey = Object.keys(newErrors)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // ensure we have a Turnstile token
    let token = captchaToken;
    if (!token && window.turnstile && widgetId) token = await getTurnstileToken();
    if (!token) {
      setSubmitting(false);
      setMessage("❌ Human verification failed. Please try again.");
      return;
    }

    const payload = {
      event_id: EVENT_ID,
      slot_id:  slotId,
      first_name: firstName.trim(),
      last_name:  lastName.trim(),
      email:      email.trim(),
      phone,
      status,
      branch_of_service: branches,
      era_list: eras,
      era_other: eras.includes("Other") ? eraOther.trim() : null,
      rhp_client_status: rhpClient,
      peer_contact_opt_in: peerContact,
      raffle_opt_in: raffle,
      consent,
      address1: address1.trim(),
      address2: address2.trim() || null,
      city:      city.trim(),
      state:     state.trim(),
      postal_code: zip.trim(),
      cf_turnstile_token: token,
    };

    try {
      const { data, error } = await supabase.functions.invoke("reserve-rsvp", { body: payload });
      if (error) {
        const friendly = "Something went wrong — please refresh and try again, or call (312) 942-8387.";
        setMessage(`❌ ${error.message || friendly}`);
        return;
      }
      if (data?.ok || data?.success) {
        window.location.href = "/turkeydrop/thankyou";
      } else {
        const friendly = "Something went wrong — please refresh and try again, or call (312) 942-8387.";
        setMessage(`⚠️ ${data?.error || friendly}`);
      }
    } catch (err) {
      const friendly = "Something went wrong — please refresh and try again, or call (312) 942-8387.";
      setMessage(`❌ ${err.message || friendly}`);
    } finally {
      setCaptchaToken(""); // next submit gets fresh token
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Effingham Turkey Drop RSVP</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Choose a pickup window. One kit per household (feeds ~4). Please bring Military/Veteran ID or DD214.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={styles.field} data-field="firstName">
          <span>First Name</span>
          <input value={firstName} onChange={(e)=>{ setFirstName(e.target.value); if (errors.firstName) setErrors(p=>({ ...p, firstName:undefined })); }} style={errors.firstName?styles.invalidInput:undefined}/>
          {errors.firstName && <span style={styles.error}>{errors.firstName}</span>}
        </label>

        <label style={styles.field} data-field="lastName">
          <span>Last Name</span>
          <input value={lastName} onChange={(e)=>{ setLastName(e.target.value); if (errors.lastName) setErrors(p=>({ ...p, lastName:undefined })); }} style={errors.lastName?styles.invalidInput:undefined}/>
          {errors.lastName && <span style={styles.error}>{errors.lastName}</span>}
        </label>

        <label style={styles.field} data-field="email">
          <span>Email </span>
          <input value={email} onChange={(e)=>{ setEmail(e.target.value); if (errors.email) setErrors(p=>({ ...p, email:undefined })); }} placeholder="you@example.com" style={errors.email?styles.invalidInput:undefined}/>
          {errors.email && <span style={styles.error}>{errors.email}</span>}
        </label>

        <div data-field="phone">
          <label style={{ display:"grid", gap:6, marginBottom:6 }}>
            <span>Phone</span>
            <div style={{ display:"flex", gap:8 }}>
              <input
                ref={phoneRef}
                value={phone}
                onChange={onPhoneChange}
                placeholder="(555) 123-4567"
                inputMode="numeric"
                pattern="\(\d{3}\)\s\d{3}-\d{4}"
                style={{ flex:1, ...(errors.phone?styles.invalidInput:{}) }}
              />
              {digits.length>0 && <button type="button" onClick={clearPhone} style={styles.subtleBtn}>Clear</button>}
            </div>
          </label>
          {errors.phone && <span style={styles.error}>{errors.phone}</span>}
        </div>

        <label style={styles.field} data-field="address1">
          <span>Address</span>
          <input ref={addr1Ref} value={address1} onChange={(e)=>{ setAddress1(e.target.value); if (errors.address1) setErrors(p=>({ ...p, address1:undefined })); }} style={errors.address1?styles.invalidInput:undefined}/>
          {errors.address1 && <span style={styles.error}>{errors.address1}</span>}
        </label>

        <label style={styles.field}>
          <span>Address 2 <em style={{ color:"#777", fontStyle:"normal" }}>(apt/unit optional)</em></span>
          <input value={address2} onChange={(e)=> setAddress2(e.target.value)}/>
        </label>

        <div style={styles.row}>
          <label style={styles.field} data-field="city">
            <span>City</span>
            <input value={city} onChange={(e)=>{ setCity(e.target.value); if (errors.city) setErrors(p=>({ ...p, city:undefined })); }} style={errors.city?styles.invalidInput:undefined}/>
            {errors.city && <span style={styles.error}>{errors.city}</span>}
          </label>

          <label style={styles.field} data-field="state">
            <span>State</span>
            <select value={state} onChange={(e)=>{ setState(e.target.value); if (errors.state) setErrors(p=>({ ...p, state:undefined })); }} style={errors.state?styles.invalidInput:undefined}>
              {US_STATES.map((s)=> <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.state && <span style={styles.error}>{errors.state}</span>}
          </label>

          <label style={styles.field} data-field="zip">
            <span>ZIP</span>
            <input ref={zipRef} value={zip} onChange={onZipChange} inputMode="numeric" pattern="\d{5}" placeholder="#####" style={errors.zip?styles.invalidInput:undefined}/>
            {errors.zip && <span style={styles.error}>{errors.zip}</span>}
          </label>
        </div>

        <label style={styles.field} data-field="status">
          <span>Status</span>
          <select ref={statusRef} value={status} onChange={(e)=>{ setStatus(e.target.value); if (errors.status) setErrors(p=>({ ...p, status:undefined })); }} style={errors.status?styles.invalidInput:undefined}>
            <option>Veteran</option>
            <option>Active Duty</option>
            <option>Guard/Reserve</option>
          </select>
          {errors.status && <span style={styles.error}>{errors.status}</span>}
        </label>

        {/* Branch of Service (multi-select via checkboxes) */}
        <fieldset style={{ border:"1px solid #eee", borderRadius:8, padding:12 }} data-field="branches">
          <legend>Branch of Service (select all that apply)</legend>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {BRANCHES.map((b) => (
              <label key={b} style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input
                  type="checkbox"
                  checked={branches.includes(b)}
                  onChange={() => toggleInArray(setBranches, branches, b)}
                />
                <span>{b}</span>
              </label>
            ))}
          </div>
          {errors.branches && <span style={styles.error}>{errors.branches}</span>}
        </fieldset>

        {/* Service Era (multi-select) */}
        <fieldset style={{ border:"1px solid #eee", borderRadius:8, padding:12 }} data-field="eras">
          <legend>Service Era (select all that apply)</legend>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {ERAS.map((e) => (
              <label key={e} style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input
                  type="checkbox"
                  checked={eras.includes(e)}
                  onChange={() => toggleInArray(setEras, eras, e)}
                />
                <span>{e}</span>
              </label>
            ))}
          </div>
          {errors.eras && <span style={styles.error}>{errors.eras}</span>}
          {eras.includes("Other") && (
            <label style={{ display:"grid", gap:6, marginTop:8 }} data-field="eraOther">
              <span>If "Other", please describe</span>
              <input value={eraOther} onChange={(e)=>{ setEraOther(e.target.value); if (errors.eraOther) setErrors(p=>({ ...p, eraOther:undefined })); }} style={errors.eraOther?styles.invalidInput:undefined}/>
              {errors.eraOther && <span style={styles.error}>{errors.eraOther}</span>}
            </label>
          )}
        </fieldset>

        {/* New required question: are you an RHP client? */}
        <fieldset style={{ border:"1px solid #eee", borderRadius:8, padding:12 }} data-field="rhpClient">
          <legend>Are you a client of the Road Home Program?</legend>
          <label style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input type="checkbox" checked={rhpClient} onChange={(e)=> setRhpClient(e.target.checked)} />
            <span>Yes</span>
          </label>
        </fieldset>

        {/* Peer contact opt-in */}
        <fieldset style={{ border:"1px solid #eee", borderRadius:8, padding:12 }} data-field="peerContact">
          <legend>Would you like to be contacted by a peer veteran or family member of the RHP team about services?</legend>
          <label style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input type="checkbox" checked={peerContact} onChange={(e)=> setPeerContact(e.target.checked)} />
            <span>Yes, please reach out.</span>
          </label>
        </fieldset>

        <label style={styles.field} data-field="slot">
          <span>Pickup Window</span>
          <select value={slotId} onChange={(e)=>{ setSlotId(e.target.value); if (errors.slot) setErrors(p=>({ ...p, slot:undefined })); }} disabled={loadingSlots || slots.length===0} style={errors.slot?styles.invalidInput:undefined}>
            <option value="" disabled>{loadingSlots ? "Loading…" : "Select a window"}</option>
            {slots.map((s)=>{
              const rem = remaining(s);
              return (
                <option key={s.id} value={s.id} disabled={rem<=0}>
                  {s.label} {rem<=0 ? "— FULL" : `— ${rem} left`}
                </option>
              );
            })}
          </select>
          {errors.slot && <span style={styles.error}>{errors.slot}</span>}
        </label>

        <label style={{ display:"flex", alignItems:"center", gap:8 }}>
          <input type="checkbox" checked={raffle} onChange={(e)=> setRaffle(e.target.checked)}/>
          <span>Enter me in the Texas Roadhouse gift card raffle.</span>
        </label>

        <label style={{ display:"flex", alignItems:"center", gap:8 }}>
          <input type="checkbox" checked={consent} onChange={(e)=>{ setConsent(e.target.checked); if (errors.consent) setErrors(p=>({ ...p, consent:undefined })); }}/>
          <span>I consent to Road Home Program storing my info for pickup and follow-up communications.</span>
        </label>
        {errors.consent && <span style={styles.error}>{errors.consent}</span>}

        {/* Turnstile container (invisible) */}
        <div id="turnstile-container" style={{ height: 0, overflow: "hidden" }} />

        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Reserve My Pickup Time"}
        </button>
      </form>

      {message && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: 6,
            background: message.startsWith("✅") ? "#e6ffed" : "#ffe6e6",
            color: message.startsWith("✅") ? "#046c4e" : "#a10000",
            border: `1px solid ${message.startsWith("✅") ? "#67c887" : "#ff7a7a"}`
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}