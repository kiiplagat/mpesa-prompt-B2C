import requests
import json
from requests.auth import HTTPBasicAuth

# ==========================
# MPESA credentials
# ==========================
consumer_key = IepmGv5iS8sISTkpWmAVXJztARl8yoNBNbBHEMqzGtDSkpQl       # Replace with your sandbox key
consumer_secret = MPESA_CONSUMER_SECRET=rVbJCmcTWs5Vnw22GoXedFZTAxl7jRF2o3CrhSq41eDjqvOMV8tQxEO5xl2ujoSh
 # Replace with your sandbox secret
shortcode = "YOUR_SHORTCODE"             # Business shortcode
passkey = "YOUR_PASSKEY"                 # Lipa na MPESA passkey

# ==========================
# Step 1: Generate access token
# ==========================
auth_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

try:
    auth_response = requests.get(auth_url, auth=HTTPBasicAuth(consumer_key, consumer_secret))
    auth_response.raise_for_status()  # Raise error if request failed
    access_token = auth_response.json().get("access_token")
    if not access_token:
        print("Failed to get access token:", auth_response.text)
        exit()
except Exception as e:
    print("Error generating access token:", e)
    exit()

# ==========================
# Step 2: STK Push (Send Money)
# ==========================
api_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

payload = {
    "BusinessShortCode": shortcode,
    "Password": passkey,
    "Timestamp": "20260120113000",  # YYYYMMDDHHMMSS
    "TransactionType": "CustomerPayBillOnline",
    "Amount": 10,
    "PartyA": "254700000000",        # Sender (sandbox test number)
    "PartyB": "254745914882",        # Receiver (the number you wanted)
    "PhoneNumber": "254700000000",   # Sender for STK prompt
    "CallBackURL": "https://yourdomain.com/callback",
    "AccountReference": "TestPayment",
    "TransactionDesc": "Payment for testing"
}

# ==========================
# Step 3: Send the request and handle response safely
# ==========================
try:
    response = requests.post(api_url, headers=headers, data=json.dumps(payload))
    print("HTTP Status Code:", response.status_code)
    # Try to parse JSON
    try:
        data = response.json()
        print("JSON Response:", json.dumps(data, indent=4))
    except json.JSONDecodeError:
        print("Response is not valid JSON. Raw response:")
        print(response.text)
except Exception as e:
    print("Error sending STK push:", e)
