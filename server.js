const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Camera Schema
const cameraSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  streamUrl: { type: String },
  status: { type: String, enum: ['online', 'offline'], default: 'online' },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Camera = mongoose.model('Camera', cameraSchema);

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Camera Routes

// Get all cameras
app.get('/api/cameras', authenticateToken, async (req, res) => {
  try {
    const { status, location, search } = req.query;
    let filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (location && location !== 'all') {
      filter.location = new RegExp(location, 'i');
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { location: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }

    const cameras = await Camera.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: cameras.length,
      data: cameras,
    });
  } catch (error) {
    console.error('Get cameras error:', error);
    res.status(500).json({ error: 'Failed to fetch cameras' });
  }
});

// Get single camera
app.get('/api/cameras/:id', authenticateToken, async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).populate('createdBy', 'name email');
    
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json({
      success: true,
      data: camera,
    });
  } catch (error) {
    console.error('Get camera error:', error);
    res.status(500).json({ error: 'Failed to fetch camera' });
  }
});

// Create camera
app.post('/api/cameras', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      location,
      latitude,
      longitude,
      streamUrl,
      status = 'online',
      description,
    } = req.body;

    const camera = new Camera({
      name,
      location,
      latitude,
      longitude,
      streamUrl,
      status,
      description,
      createdBy: req.user.id,
    });

    await camera.save();
    await camera.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Camera created successfully',
      data: camera,
    });
  } catch (error) {
    console.error('Create camera error:', error);
    res.status(500).json({ error: 'Failed to create camera' });
  }
});

// Update camera
app.put('/api/cameras/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      location,
      latitude,
      longitude,
      streamUrl,
      status,
      description,
    } = req.body;

    const camera = await Camera.findByIdAndUpdate(
      req.params.id,
      {
        name,
        location,
        latitude,
        longitude,
        streamUrl,
        status,
        description,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json({
      success: true,
      message: 'Camera updated successfully',
      data: camera,
    });
  } catch (error) {
    console.error('Update camera error:', error);
    res.status(500).json({ error: 'Failed to update camera' });
  }
});

// Delete camera
app.delete('/api/cameras/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const camera = await Camera.findByIdAndDelete(req.params.id);

    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json({
      success: true,
      message: 'Camera deleted successfully',
    });
  } catch (error) {
    console.error('Delete camera error:', error);
    res.status(500).json({ error: 'Failed to delete camera' });
  }
});

// Bulk operations
app.post('/api/cameras/bulk', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cameras } = req.body;

    const createdCameras = await Camera.insertMany(
      cameras.map(camera => ({
        ...camera,
        createdBy: req.user.id,
      }))
    );

    res.status(201).json({
      success: true,
      message: `${createdCameras.length} cameras created successfully`,
      data: createdCameras,
    });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ error: 'Failed to create cameras' });
  }
});

// Get statistics
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const totalCameras = await Camera.countDocuments();
    const onlineCameras = await Camera.countDocuments({ status: 'online' });
    const offlineCameras = await Camera.countDocuments({ status: 'offline' });

    // Get cameras by location
    const locationStats = await Camera.aggregate([
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 },
          online: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
          },
          offline: {
            $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalCameras,
        onlineCameras,
        offlineCameras,
        uptime: ((onlineCameras / totalCameras) * 100).toFixed(1),
        locationStats,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CCTV API is running',
    timestamp: new Date().toISOString(),
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 CCTV Monitoring Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to view the application`);
});

// Initialize default admin user
async function createDefaultAdmin() {
  try {
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    
   if (!adminExists) {
    // Buat admin default
    const hashedPassword = await bcrypt.hash('123456', 10);
    const admin = new User({
      name: 'Administrator',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
    });

    await admin.save();
    console.log('✅ Default admin created: admin@example.com / 123456');
  }

  // Periksa apakah user biasa sudah ada
  const userExists = await User.findOne({ role: 'user' });

  if (!userExists) {
    // Buat user biasa default
    const hashedPassword = await bcrypt.hash('123456', 10);
    const user = new User({
      name: 'User',
      email: 'user@example.com',
      password: hashedPassword,
      role: 'user',
    });

    await user.save();
    console.log('✅ Default user created: user@example.com / 123456');
  }

} catch (error) {
  console.error('Error creating default users:', error);
}
}

// Initialize database with sample data
async function initializeDatabase() {
  try {
    const cameraCount = await Camera.countDocuments();
    
    if (cameraCount === 0) {
      const sampleCameras = [
        // {
        //   name: "SIMPANG PDAM 1",
        //   location: "KECAMATAN BAITURRAHMAN",
        //   latitude: 5.5483,
        //   longitude: 95.3238,
        //   status: "online",
        //   streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/f42b9a56-5593-407d-af6e-f9396bc12ed0_output_0.m3u8",
        //   description: "CCTV monitoring di Simpang PDAM area 1"
        // },
        // {
        //   name: "SIMPANG DHARMA 1",
        //   location: "KECAMATAN KUTA ALAM",
        //   latitude: 5.5550,
        //   longitude: 95.3180,
        //   status: "online",
        //   streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/dcba24ce-e625-4e77-8d8b-e0529725cc13.m3u8",
        //   description: "CCTV monitoring di Simpang Dharma area 1"
        // },
        // {
        //   name: "DINKES 2",
        //   location: "KECAMATAN BAITURRAHMAN",
        //   latitude: 5.5420,
        //   longitude: 95.3300,
        //   status: "online",
        //   streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/cc16dc97-e4ba-4c7f-ac34-165aab52d13b.m3u8",
        //   description: "CCTV monitoring di area Dinkes 2"
        // },
        // {
        //   name: "DINKES 3",
        //   location: "KECAMATAN BAITURRAHMAN",
        //   latitude: 5.5380,
        //   longitude: 95.3350,
        //   status: "online",
        //   streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/0617d616-8d75-4668-98cc-173ab20fcdd9.m3u8",
        //   description: "CCTV monitoring di area Dinkes 3"
        // },
        // {
        //   name: "DINKES 4",
        //   location: "KECAMATAN BAITURRAHMAN",
        //   latitude: 5.5320,
        //   longitude: 95.3280,
        //   status: "online",
        //   streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/40cfdb05-1220-4e31-9418-fc3497adac9f.m3u8",
        //   description: "CCTV monitoring di area Dinkes 4"
        // },
        // {
        //   name: "SIMPANG DHARMA 3",
        //   location: "KECAMATAN KUTA ALAM",
        //   latitude: 5.5600,
        //   longitude: 95.3150,
        //   status: "online",
        //   streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/1e560ac1-8b57-416a-b64e-d4190ff83f88.m3u8",
        //   description: "CCTV monitoring di Simpang Dharma area 3"
        // },
        // {
        //   name: "SIMPANG DHARMA 4",
        //   location: "KECAMATAN KUTA ALAM",
        //   latitude: 5.5650,
        //   longitude: 95.3100,
        //   status: "online",
        //   streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/f9444904-ad31-4401-9643-aee6e33b85c7.m3u8",
        //   description: "CCTV monitoring di Simpang Dharma area 4"
        // },
        // {
        //   name: "SIMPANG JAMBO TAPE 1",
        //   location: "KECAMATAN KUTA ALAM",
        //   latitude: 5.5280,
        //   longitude: 95.3400,
        //   status: "online",
        //   streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/915ad1fb-eb2b-4189-bf36-30f70439b7a0.m3u8",
        //   description: "CCTV monitoring di Simpang Jambo Tape area 1"
        // }
      ];

      await Camera.insertMany(sampleCameras);
      console.log('✅ Sample CCTV cameras initialized');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Initialize on startup
mongoose.connection.once('open', () => {
  console.log('✅ Connected to MongoDB');
  createDefaultAdmin();
  initializeDatabase();
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error);
});

module.exports = app;