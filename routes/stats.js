const express = require('express');
const Camera = require('../models/camera');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get statistics
router.get('/', authenticateToken, async (req, res) => {
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
        uptime: totalCameras > 0 ? ((onlineCameras / totalCameras) * 100).toFixed(1) : '0',
        locationStats,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;