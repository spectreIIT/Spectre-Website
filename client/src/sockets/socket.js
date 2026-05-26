import { io } from 'socket.io-client';

const URL = (import.meta.env.VITE_API_URL || "http://localhost:5000"); // Make sure this points to your server

let deviceId = localStorage.getItem('spectre_deviceId');
if (!deviceId) {
  deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
  localStorage.setItem('spectre_deviceId', deviceId);
}

export const socket = io(URL, {
  autoConnect: false, // We will manually connect in AuthContext or Profile
  query: { deviceId }
});
