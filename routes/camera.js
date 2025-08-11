const express = require('express');
const Camera = require('../models/camera');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all cameras
router.get('/', authenticateToken, async (req, res) => {
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
router.get('/:id', authenticateToken, async (req, res) => {
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
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
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
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
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
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
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
router.post('/bulk', authenticateToken, requireAdmin, async (req, res) => {
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

module.exports = router;