require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// --- Mongoose Schema ---
const messageSchema = new mongoose.Schema({
  nickname: { type: String, default: 'Anonymous', maxlength: 20 },
  grade:    { type: String, default: 'N/A' },
  section:  { type: String, default: 'N/A' },
  channel:  { type: String, default: 'General' },
  message:  { type: String, required: true, maxlength: 500 },
  timestamp:{ type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Socket.io ---
io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  // When a user joins a channel, load previous messages
  socket.on('join-channel', async (channel) => {
    socket.currentChannel = channel;
    try {
      const messages = await Message.find({ channel })
        .sort({ timestamp: -1 })
        .limit(100);
      socket.emit('load-messages', messages);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  });

  // When a user sends a message
  socket.on('send-message', async (data) => {
    try {
      // Basic validation
      const msgText = (data.message || '').trim();
      if (!msgText || msgText.length > 500) return;

      const newMessage = new Message({
        nickname: (data.nickname || '').trim().slice(0, 20) || 'Anonymous',
        grade:    data.grade || 'N/A',
        section:  data.section || 'N/A',
        channel:  data.channel || 'General',
        message:  msgText
      });

      const saved = await newMessage.save();

      // Broadcast to everyone in that channel
      io.emit('new-message', saved);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });
});

// --- Start Server ---
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});