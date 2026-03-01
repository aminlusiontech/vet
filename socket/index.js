const socketIO = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
// Restrict CORS to your deployed frontend domain(s)
const io = socketIO(server, {
  cors: {
    origin: [
      "https://vafront.lt-webdemolink.com",
      "http://vafront.lt-webdemolink.com",
      "http://localhost:3000",
      "https://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

require("dotenv").config({
  path: "./.env",
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello world from socket server!");
});

// HTTP endpoint for backend to emit notifications
app.post("/notifications/emit", (req, res) => {
  try {
    console.log("📥 Received POST request to /notifications/emit");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));
    
    const { recipientId, notification } = req.body;
    if (!recipientId || !notification) {
      console.log("❌ Missing recipientId or notification in request");
      return res.status(400).json({ error: "recipientId and notification are required" });
    }
    
    // Convert recipientId to string for comparison
    const recipientIdStr = String(recipientId);
    console.log("📤 Attempting to emit notification to:", recipientIdStr);
    console.log("📋 Total connected users:", users.length);
    console.log("📋 Connected users:", users.map(u => ({ userId: String(u.userId), socketId: u.socketId })));
    
    const user = users.find(u => String(u.userId) === recipientIdStr);
    
    if (user) {
      console.log("✅ Found user in connected users, emitting notification...");
      console.log("🔌 Emitting to socket:", user.socketId);
      console.log("📨 Notification payload:", JSON.stringify(notification, null, 2));
      
      io.to(user.socketId).emit("newNotification", notification);
      
      console.log("✅ Notification emitted to user:", recipientIdStr, "via socket:", user.socketId);
      res.json({ success: true, message: "Notification emitted successfully" });
    } else {
      console.log("⚠️ User not connected, notification saved to DB only:", recipientIdStr);
      console.log("🔍 Available user IDs:", users.map(u => String(u.userId)));
      console.log("🔍 Looking for:", recipientIdStr);
      res.json({ success: false, message: "User not connected", availableUsers: users.map(u => String(u.userId)) });
    }
  } catch (error) {
    console.error("❌ Error emitting notification:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ error: error.message });
  }
});

let users = [];

const addUser = (userId, socketId) => {
  const normalizedUserId = String(userId);
  const existing = users.find((u) => String(u.userId) === normalizedUserId);
  if (existing) {
    existing.socketId = socketId;
    console.log("👤 User socket updated (reconnect/tab):", normalizedUserId);
  } else {
    users.push({ userId: normalizedUserId, socketId });
    console.log("👤 User added to socket:", normalizedUserId, "Total users:", users.length);
  }
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
  console.log("👋 User removed from socket. Total users:", users.length);
};

const getUser = (receiverId) => {
  const normalizedReceiverId = String(receiverId);
  return users.find((user) => String(user.userId) === normalizedReceiverId);
};

// Define a message object with a seen property
const createMessage = ({ senderId, receiverId, text, images, conversationId }) => ({
  senderId,
  receiverId,
  text,
  images,
  conversationId,
  seen: false,
});

io.on("connection", (socket) => {
  // when connect
  //   console.log(`a user is connected`);

  // take userId and socketId from user
  socket.on("addUser", (userId) => {
    console.log("👤 addUser event received - userId:", userId, "socketId:", socket.id);
    addUser(userId, socket.id);
    console.log("📊 Total users after add:", users.length);
    console.log("👥 Current users:", users.map(u => ({ userId: String(u.userId), socketId: u.socketId })));
    io.emit("getUsers", users);
  });

  // send and get message
  const messages = {}; // Object to track messages sent to each user

  socket.on("sendMessage", ({ senderId, receiverId, text, images, conversationId }) => {
    const message = createMessage({ senderId, receiverId, text, images, conversationId });

    const user = getUser(receiverId);

    // Store the messages in the `messages` object
    if (!messages[receiverId]) {
      messages[receiverId] = [message];
    } else {
      messages[receiverId].push(message);
    }

    // send the message to the receiver with conversationId
    io.to(user?.socketId).emit("getMessage", {
      ...message,
      conversationId: conversationId || message.conversationId,
    });
  });

  socket.on("messageSeen", ({ senderId, receiverId, messageId }) => {
    const user = getUser(senderId);

    // update the seen flag for the message
    if (messages[senderId]) {
      const message = messages[senderId].find(
        (message) =>
          message.receiverId === receiverId && message.id === messageId
      );
      if (message) {
        message.seen = true;

        // send a message seen event to the sender
        io.to(user?.socketId).emit("messageSeen", {
          senderId,
          receiverId,
          messageId,
        });
      }
    }
  });

  // update and get last message
  socket.on("updateLastMessage", ({ lastMessage, lastMessagesId }) => {
    io.emit("getLastMessage", {
      lastMessage,
      lastMessagesId,
    });
  });

  // Notification events
  socket.on("addNotificationUser", (userId) => {
    // User is already added via addUser, but we can track notification-specific users if needed
    addUser(userId, socket.id);
  });

  //when disconnect
  socket.on("disconnect", () => {
    // console.log(`a user disconnected!`);
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

// Export function to emit notifications (to be used in controllers)
const emitNotification = (recipientId, notification) => {
  // Convert recipientId to string for comparison
  const recipientIdStr = String(recipientId);
  const user = users.find(u => String(u.userId) === recipientIdStr);
  
  if (user) {
    io.to(user.socketId).emit("newNotification", notification);
    console.log("✅ Notification emitted to user:", recipientIdStr);
  } else {
    console.log("⚠️ User not connected, notification saved to DB:", recipientIdStr);
  }
};

module.exports = { emitNotification };

server.listen(process.env.PORT || 4000, () => {
  console.log(`server is running on port ${process.env.PORT || 4000}`);
});
