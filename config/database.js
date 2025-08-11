const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Camera = require('../models/camera');

// Initialize default admin user
async function createDefaultAdmin() {
  try {
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    
    if (!adminExists) {
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
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

// Initialize database with sample data
async function initializeDatabase() {
  try {
    const cameraCount = await Camera.countDocuments();
    
    if (cameraCount === 0) {
      const sampleCameras = [
        {
          name: "SIMPANG PDAM 1",
          location: "KECAMATAN BAITURRAHMAN",
          latitude: 5.5483,
          longitude: 95.3238,
          status: "online",
          streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/f42b9a56-5593-407d-af6e-f9396bc12ed0_output_0.m3u8",
          description: "CCTV monitoring di Simpang PDAM area 1"
        },
        {
          name: "SIMPANG DHARMA 1",
          location: "KECAMATAN KUTA ALAM",
          latitude: 5.5550,
          longitude: 95.3180,
          status: "online",
          streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/dcba24ce-e625-4e77-8d8b-e0529725cc13.m3u8",
          description: "CCTV monitoring di Simpang Dharma area 1"
        },
        {
          name: "DINKES 2",
          location: "KECAMATAN BAITURRAHMAN",
          latitude: 5.5420,
          longitude: 95.3300,
          status: "online",
          streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/cc16dc97-e4ba-4c7f-ac34-165aab52d13b.m3u8",
          description: "CCTV monitoring di area Dinkes 2"
        },
        {
          name: "DINKES 3",
          location: "KECAMATAN BAITURRAHMAN",
          latitude: 5.5380,
          longitude: 95.3350,
          status: "online",
          streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/0617d616-8d75-4668-98cc-173ab20fcdd9.m3u8",
          description: "CCTV monitoring di area Dinkes 3"
        },
        {
          name: "DINKES 4",
          location: "KECAMATAN BAITURRAHMAN",
          latitude: 5.5320,
          longitude: 95.3280,
          status: "online",
          streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/40cfdb05-1220-4e31-9418-fc3497adac9f.m3u8",
          description: "CCTV monitoring di area Dinkes 4"
        },
        {
          name: "SIMPANG DHARMA 3",
          location: "KECAMATAN KUTA ALAM",
          latitude: 5.5600,
          longitude: 95.3150,
          status: "online",
          streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/1e560ac1-8b57-416a-b64e-d4190ff83f88.m3u8",
          description: "CCTV monitoring di Simpang Dharma area 3"
        },
        {
          name: "SIMPANG DHARMA 4",
          location: "KECAMATAN KUTA ALAM",
          latitude: 5.5650,
          longitude: 95.3100,
          status: "online",
          streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/f9444904-ad31-4401-9643-aee6e33b85c7.m3u8",
          description: "CCTV monitoring di Simpang Dharma area 4"
        },
        {
          name: "SIMPANG JAMBO TAPE 1",
          location: "KECAMATAN KUTA ALAM",
          latitude: 5.5280,
          longitude: 95.3400,
          status: "online",
          streamUrl: "https://cctv-stream.bandaacehkota.info/memfs/915ad1fb-eb2b-4189-bf36-30f70439b7a0.m3u8",
          description: "CCTV monitoring di Simpang Jambo Tape area 1"
        }
      ];

      // Uncomment to initialize with sample data
      // await Camera.insertMany(sampleCameras);
      // console.log('✅ Sample CCTV cameras initialized');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

module.exports = {
  createDefaultAdmin,
  initializeDatabase
};