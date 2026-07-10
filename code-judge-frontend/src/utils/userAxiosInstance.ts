import axios, { AxiosInstance } from "axios";

interface userAxiosConfig {
    endpoint? : string
}

const createUserAxiosInstance = (
  config: userAxiosConfig = {}
) : AxiosInstance => {
    const { endpoint = "/api/v1/user" } = config;
    const axiosInstance = axios.create({
        baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`,
        headers: {
        "Content-Type": "application/json",
        },  
    });
    return axiosInstance;
}

const userDirectAxiosInstance = (config: userAxiosConfig = {}) : AxiosInstance => {
    const axiosInstance = axios.create({
        baseURL: `${process.env.NEXT_JUDGE0_URL}`,
        headers: {
        "Content-Type": "application/json",
        },  
    });
    return axiosInstance;
}

const userApi = createUserAxiosInstance();
export { userApi };


const userDirectApi = userDirectAxiosInstance();
export { userDirectApi };