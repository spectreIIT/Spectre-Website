// ============================================================
//  ChallengeEmbed.jsx
//  Drop this anywhere in your React app
//  Usage: <ChallengeEmbed slug="9GTDB6OXqI" title="Info Disclosure" />
//  Or:    <ChallengeEmbed httpUrl="http://40.82.128.179/pc1yr98q/" title="Info Disclosure" />
// ============================================================

import { useState, useEffect } from "react";

// Convert string to base64url format
const toBase64Url = (str) => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export default function ChallengeEmbed({
  httpUrl,        // pass the raw http:// URL
  slug,           // OR pass the slug directly
  title = "Challenge",
  height = "600px",
  width = "100%",
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Dynamically resolve URL
  const targetUrl = httpUrl;

  if (!targetUrl) {
    return (
      <div style={styles.error}>
        Unknown challenge URL. Please provide a valid httpUrl.
      </div>
    );
  }

  const encodedUrl = toBase64Url(targetUrl);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const embedUrl = `${API_URL}/preview/${encodedUrl}/`;

  return (
    <div style={{ width, position: "relative" }}>
      {/* Loading overlay */}
      {loading && !error && (
        <div style={styles.loading}>
          <span>Loading {title}...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={styles.error}>
          Failed to load challenge. Check that the server is running.
        </div>
      )}

      <iframe
        src={embedUrl}
        width={width}
        height={height}
        style={{ border: "none", display: error ? "none" : "block" }}
        title={title}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        allow="same-origin"
      />
    </div>
  );
}

const styles = {
  loading: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0d1317",
    color: "#00e5a0",
    fontFamily: "monospace",
    fontSize: "14px",
    zIndex: 1,
  },
  error: {
    padding: "1rem",
    background: "rgba(255,77,77,0.1)",
    border: "1px solid rgba(255,77,77,0.3)",
    borderRadius: "6px",
    color: "#ff4d4d",
    fontFamily: "monospace",
    fontSize: "13px",
  },
};
