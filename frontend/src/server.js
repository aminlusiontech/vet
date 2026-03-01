// Deployed API base URLs

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://vaback.lt-webdemolink.com";

const BACKEND_BASE_URL =
  process.env.REACT_APP_BACKEND_BASE_URL ||
  "https://vaback.lt-webdemolink.com";

// Local development fallback (commented out for live deployment)

// const API_BASE_URL =
//   process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
// const BACKEND_BASE_URL =
//   process.env.REACT_APP_BACKEND_BASE_URL || "http://localhost:8000";

export const server = `${API_BASE_URL.replace(/\/$/, "")}/api/v2`;

export const backend_url = `${BACKEND_BASE_URL.replace(/\/$/, "")}/`;
