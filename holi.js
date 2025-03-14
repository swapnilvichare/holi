// Required dependencies
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// Define Chat Schema
const ChatMessage = mongoose.model('ChatMessage', {
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});

// Define Image Schema
const Image = mongoose.model('Image', {
    imageUrl: String,
    uploadedAt: { type: Date, default: Date.now }
});

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "holi_images",
        allowedFormats: ['jpg', 'png', 'jpeg']
    }
});
const upload = multer({ storage: storage });

// Socket.io connection for real-time chat
io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('sendMessage', async (data) => {
        const newMessage = new ChatMessage(data);
        await newMessage.save();
        io.emit('receiveMessage', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Upload image route
app.post('/upload', upload.single('image'), async (req, res) => {
    const newImage = new Image({ imageUrl: req.file.path });
    await newImage.save();
    res.json({ imageUrl: req.file.path });
});

// Get all uploaded images
app.get('/images', async (req, res) => {
    const images = await Image.find().sort({ uploadedAt: -1 });
    res.json(images);
});

// Get all chat messages
app.get('/messages', async (req, res) => {
    const messages = await ChatMessage.find().sort({ timestamp: -1 });
    res.json(messages);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
