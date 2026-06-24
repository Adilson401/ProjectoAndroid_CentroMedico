import axios from "axios";

export const api = axios.create({
  baseURL: "http://192.168.1.188:3000/api",
  /*baseURL: "http://172.16.209.223:3000/api",*/
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
