import axios from "axios";

const judge0 = axios.create({
    baseURL: "http://localhost:2358",
    headers: {
        "Content-Type": "application/json",
    },
});

export default judge0;


// it is just creating a custom axios instance with the base URL of the Judge0 API and setting the content type to JSON. This allows you to make requests to the Judge0 API using this instance without having to specify the base URL and headers every time.
// when you write judge0.get("/languages"); it is equivalent to writing axios.get("http://localhost:2358/languages", { headers: { "Content-Type": "application/json" } });