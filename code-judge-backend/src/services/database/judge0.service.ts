// Judge0 API client. The URL and optional auth token are read from the
// environment so a self-hosted instance (default) or a remote Judge0
// deployment can be used without changing code.
import axios from "axios";

const baseURL = process.env.JUDGE0_API_URL?.trim() || "http://localhost:2358";
const apiKey = process.env.JUDGE0_API_KEY?.trim();

const headers: Record<string, string> = {
  "Content-Type": "application/json",
};

if (apiKey) {
  headers["X-Auth-Token"] = apiKey;
}

const judge0 = axios.create({
  baseURL,
  headers,
});

export default judge0;

// when you write judge0.get("/languages"); it is equivalent to axios.get("http://localhost:2358/languages", { headers: { "Content-Type": "application/json" } });
