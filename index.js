const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const VAPI_KEY = 'a4d103d0-bfa3-4c95-94a9-eecd989c9d01';
const AGENT_ID = '98f36b04-40a7-4df4-9434-a3bfc70a3ac4';
let lastCallStatus = null;

// Format number to E.164
function formatPhone(number) {
  if (!number) return null;
  const digits = number.replace(/\D/g, '');
  return digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
}

// Start call
app.post('/call', async (req, res) => {
  const { phone_number, message } = req.body;
  const formatted = formatPhone(phone_number);

  if (!formatted || !message) {
    return res.status(400).json({ success: false, error: 'Missing phone number or message' });
  }

  lastCallStatus = {
    status: 'pending',
    startedAt: new Date(),
    number: formatted,
    message,
  };

  try {
    const response = await axios.post('https://api.vapi.ai/call', {
      agent_id: AGENT_ID,
      phone_number: formatted,
      message,
      webhook_url: "https://gpt-vapi-server.onrender.com/vapi/webhook"
    }, {
      headers: { Authorization: `Bearer ${VAPI_KEY}` }
    });

    lastCallStatus.requestId = response.data.request_id || null;
    res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    lastCallStatus = {
      status: 'failed',
      error: err?.response?.data || err.message,
      number: formatted,
      message,
      endedAt: new Date()
    };
    res.status(500).json({ success: false, error: err.message });
  }
});

// Receive webhook results from Vapi
app.post('/vapi/webhook', (req, res) => {
  const event = req.body.event;
  console.log('[Webhook]', event);

  if (event === 'call.completed') {
    lastCallStatus = {
      status: 'completed',
      transcript: req.body.transcript || 'No transcript returned.',
      duration: req.body.duration,
      endedAt: new Date()
    };
  } else if (event === 'call.failed') {
    lastCallStatus = {
      status: 'failed',
      reason: req.body.reason || 'Unknown error',
      endedAt: new Date()
    };
  }

  res.sendStatus(200);
});

// Return last call status
app.get('/call/status', (req, res) => {
  res.json(lastCallStatus || { status: 'no call yet' });
});

// Simple health check
app.get('/', (req, res) => {
  res.send("Kai’s Vapi bridge is alive.");
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
