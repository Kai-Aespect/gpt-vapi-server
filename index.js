const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const VAPI_KEY = 'a4d103d0-bfa3-4c95-94a9-eecd989c9d01';
const AGENT_ID = '98f36b04-40a7-4df4-9434-a3bfc70a3ac4';

let lastCallStatus = null;

app.post('/call', async (req, res) => {
  const { phone_number, message } = req.body;

  lastCallStatus = { status: 'pending', startedAt: new Date(), message };

  try {
    const response = await axios.post('https://api.vapi.ai/call', {
      agent_id: AGENT_ID,
      phone_number,
      message,
      webhook_url: "https://your-render-url.onrender.com/vapi/webhook"
    }, {
      headers: { Authorization: `Bearer ${VAPI_KEY}` }
    });

    res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    lastCallStatus = { status: 'failed', error: err.message };
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/vapi/webhook', (req, res) => {
  const body = req.body;

  if (body.event === "call.completed") {
    lastCallStatus = {
      status: 'completed',
      transcript: body.transcript || "No transcript received.",
      duration: body.duration,
      endedAt: new Date()
    };
  } else if (body.event === "call.failed") {
    lastCallStatus = {
      status: 'failed',
      reason: body.reason || "Unknown error",
      endedAt: new Date()
    };
  }

  res.sendStatus(200);
});

app.get('/call/status', (req, res) => {
  res.json(lastCallStatus || { status: 'no call yet' });
});

app.get('/', (req, res) => {
  res.send('Kai’s assistant bridge is alive!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
