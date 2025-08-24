
import { Router } from 'express';

const router = Router();

// Debug endpoint to test POST functionality
router.post('/test-post', (req, res) => {
  console.log('=== POST DEBUG TEST ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Content-Length:', req.get('Content-Length'));
  console.log('====================');

  res.json({
    success: true,
    message: 'POST test successful',
    received: {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url
    },
    timestamp: new Date().toISOString()
  });
});

// Test endpoint with validation
router.post('/test-validation', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      required: ['name', 'email', 'message'],
      received: Object.keys(req.body)
    });
  }

  res.json({
    success: true,
    message: 'Validation test passed',
    data: { name, email, message }
  });
});

// Test endpoint with error simulation
router.post('/test-error', (req, res) => {
  const { simulateError } = req.body;

  if (simulateError) {
    return res.status(500).json({
      success: false,
      message: 'Simulated error for testing'
    });
  }

  res.json({
    success: true,
    message: 'No error simulated'
  });
});

export default router;
