const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('.')); // Serve HTML file

// Simple token function
async function getToken() {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    
    try {
        const response = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            }
        );
        console.log('✅ Token received successfully');
        return response.data.access_token;
    } catch (error) {
        console.log('❌ Token error:', error.response?.data || error.message);
        return null;
    }
}

// STK Push endpoint
app.post('/stkpush', async (req, res) => {
    try {
        let { phone, amount } = req.body;
        
        // Ensure phone is properly formatted
        phone = phone.toString().replace(/\D/g, '');
        if (phone.startsWith('0')) {
            phone = '254' + phone.substring(1);
        }
        
        console.log(`📱 Processing payment for: ${phone}, Amount: ${amount} Ksh`);
        
        // 1. Get token
        const token = await getToken();
        if (!token) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to get access token. Check credentials.' 
            });
        }
        
        // 2. Create timestamp (YYYYMMDDHHMMSS)
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        
        // 3. Generate password
        const shortcode = process.env.MPESA_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;
        const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');
        
        // 4. Prepare request data
        const requestData = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: shortcode,
            PhoneNumber: phone,
            CallBackURL: "https://webhook.site",
            AccountReference: "Payment Ref",
            TransactionDesc: "Payment for services"
        };
        
        console.log('📤 Sending STK request to M-Pesa...');
        console.log('Phone:', phone);
        console.log('Amount:', amount);
        
        // 5. Send STK request
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );
        
        console.log('✅ STK Response:', response.data);
        
        // Check if it's sandbox test number
        if (phone === '254708374149') {
            console.log('🔹 This is a SANDBOX test. Check dashboard for phone simulator.');
        } else {
            console.log('🔹 This is a REAL number. User should get STK prompt on their phone.');
        }
        
        // 6. Send response to frontend
        res.json({
            success: true,
            message: 'Payment request sent successfully!',
            data: response.data,
            phone: phone,
            isSandbox: phone === '254708374149'
        });
        
    } catch (error) {
        console.error('❌ Full error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data || error.message,
            message: 'Check your credentials and internet connection'
        });
    }
});

// Phone validation endpoint
app.post('/validate-phone', (req, res) => {
    const { phone } = req.body;
    const cleaned = phone.replace(/\D/g, '');
    
    let formatted = cleaned;
    if (cleaned.startsWith('0') && cleaned.length === 10) {
        formatted = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
        formatted = '254' + cleaned;
    }
    
    const isValid = /^254[17]\d{8}$/.test(formatted);
    
    res.json({
        original: phone,
        formatted: formatted,
        isValid: isValid,
        type: formatted === '254708374149' ? 'sandbox' : 'real'
    });
});

// Home route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Test route
app.get('/test', (req, res) => {
    res.json({ 
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: 'sandbox',
        shortcode: process.env.MPESA_SHORTCODE
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n✨ ================================= ✨`);
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`✅ Test link: http://localhost:${PORT}`);
    console.log(`📱 Default phone: 0745914882 (auto-converts to 254745914882)`);
    console.log(`🔧 Sandbox test: Use 254708374149`);
    console.log(`🔑 Using shortcode: ${process.env.MPESA_SHORTCODE}`);
    console.log(`✨ ================================= ✨\n`);
    console.log('⚠️  IMPORTANT:');
    console.log('   For SANDBOX testing: Use phone 254708374149');
    console.log('   For REAL testing: Use your number 0745914882 (requires production setup)');
    console.log('   Sandbox PIN: 174379');
});