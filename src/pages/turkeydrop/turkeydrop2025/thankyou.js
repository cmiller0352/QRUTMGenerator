import { Link } from 'react-router-dom';
import "./turkeydrop2025.css";

export default function ThankYou2025() {
  return (
    <div style={{
      maxWidth: 600,
      margin: '4rem auto',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center'
    }}>
      <Link to="/turkeydrop2025" style={{ textDecoration: 'none' }}>
        <h1 style={{ fontSize: '3rem', margin: 0 }}>🎉</h1>
      </Link>
      <h2 style={{ marginTop: 8 }}>Thank You for Registering!</h2>
      <p>Your RSVP has been received. We look forward to seeing you at the Effingham Turkey Drop.</p>
      <p>Please bring your Military or Veteran ID on pickup day.</p>
      {/* Per request: hide the "Return" button; the emoji above is clickable. */}
    </div>
  );
}