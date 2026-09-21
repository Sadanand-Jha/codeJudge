import axios from "axios";

const rawBase =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://quizbackend-dun.vercel.app/api";
const API_BASE = rawBase.replace(/\/v1\/?$/, "").replace(/\/$/, "");

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor to unwrap { success, data } envelope
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      if (response.data.success === true && "data" in response.data) {
        const { data, pagination, ...rest } = response.data;
        response.data = data;
        if (pagination) {
          (response as any).pagination = pagination;
        }
      }
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;