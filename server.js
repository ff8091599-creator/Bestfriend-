const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(",") : true },
  maxHttpBufferSize: 1e5
});
const PORT = process.env.PORT || 3000;
app.disable("x-powered-by");
app.use(express.static(path.join(__dirname, "public"), { etag: true, maxAge: "1h" }));
app.get("/health", (_req, res) => res.json({ ok: true, service: "only-two-signaling" }));

// Rooms are ephemeral. Only socket membership is kept in memory; no chat history is stored.
function validRoom(room) {
  return typeof room === "string" && /^[A-Z0-9-]{6,12}$/.test(room);
}
function roomMembers(room) {
  const set = io.sockets.adapter.rooms.get(room);
  return set ? [...set] : [];
}
function isMember(socket, room) {
  return validRoom(room) && socket.data.room === room && roomMembers(room).includes(socket.id);
}

io.on("connection", socket => {
  socket.data.room = null;
  socket.data.lastChatAt = 0;

  socket.on("join-room", (payload, callback) => {
    const room = payload && String(payload.room || "").toUpperCase();
    const reply = typeof callback === "function" ? callback : () => {};
    if (!validRoom(room)) return reply({ ok: false, error: "Invite code format is invalid." });
    if (socket.data.room) return reply({ ok: false, error: "Leave your current room first." });
    const members = roomMembers(room);
    if (members.length >= 2) return reply({ ok: false, error: "This room already has two connected members." });
    socket.join(room);
    socket.data.room = room;
    const otherMembers = roomMembers(room).filter(id => id !== socket.id);
    if (otherMembers.length) {
      socket.to(room).emit("peer-joined");
      socket.emit("peer-joined");
    }
    reply({ ok: true, peerPresent: otherMembers.length > 0 });
  });

  socket.on("leave-room", () => {
    const room = socket.data.room;
    if (!room) return;
    socket.leave(room);
    socket.data.room = null;
    socket.to(room).emit("peer-left");
  });

  socket.on("chat-message", (payload, callback) => {
    const reply = typeof callback === "function" ? callback : () => {};
    const room = payload && payload.room;
    const text = payload && payload.text;
    if (!isMember(socket, room)) return reply({ ok: false, error: "Join the room before messaging." });
    if (typeof text !== "string" || !text.trim() || text.length > 2000) {
      return reply({ ok: false, error: "Message must be between 1 and 2000 characters." });
    }
    const now = Date.now();
    if (now - socket.data.lastChatAt < 250) return reply({ ok: false, error: "Please wait a moment before sending another message." });
    socket.data.lastChatAt = now;
    // Important: this relay receives plaintext chat. Do not use for confidential content.
    socket.to(room).emit("chat-message", { text: text.trim(), sentAt: now });
    reply({ ok: true });
  });

  socket.on("signal", payload => {
    const room = payload && payload.room;
    const kind = payload && payload.kind;
    const data = payload && payload.data;
    if (!isMember(socket, room)) return;
    if (!["offer", "answer", "ice", "hangup"].includes(kind)) return;
    // Signal payload is forwarded to the other room member. No signaling persistence.
    socket.to(room).emit("signal", { kind, data });
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (room) socket.to(room).emit("peer-left");
  });
});

server.listen(PORT, () => {
  console.log(`Only Two server listening on port ${PORT}`);
});
