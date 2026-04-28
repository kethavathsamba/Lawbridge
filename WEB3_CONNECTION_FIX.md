# Web3 Connection Fix - Payment Error Resolution

## Problem
The payment system was failing with: **"Backend error: Web3 connection failed"**

## Root Causes Identified
1. **Network Mismatch**: `.env` was configured for Mumbai RPC (`rpc-mumbai.maticvigil.com`), but the code defaulted to Amoy RPC (`rpc-amoy.polygon.technology/`)
2. **Stale Connections**: Web3 instance was created once at import time, so connection failures were never refreshed
3. **Unreliable RPC**: The old Mumbai MaticVigil endpoint is deprecated and unreliable
4. **No Timeouts**: HTTP requests could hang indefinitely

## Changes Made

### 1. Updated `.env` Configuration
**Before:**
```
WEB3_PROVIDER_URL=https://rpc-mumbai.maticvigil.com
```

**After:**
```
WEB3_PROVIDER_URL=https://rpc-amoy.polygon.technology/
```

### 2. Fixed `backend/routers/payments.py`
- ✅ Moved Web3 connection from import-time to request-time
- ✅ Added lazy initialization with `_get_web3_connection()` function
- ✅ Added 10-second timeout to prevent hanging
- ✅ Added detailed error logging for debugging

### 3. Enhanced `backend/blockchain_utils.py`
- ✅ Added 10-second timeout to HTTP requests
- ✅ Improved error messages with provider URL debugging info
- ✅ Added exception handling with stack traces

### 4. Updated `backend/contract_deployer.py`
- ✅ Now respects `WEB3_PROVIDER_URL` environment variable
- ✅ Added timeout configuration
- ✅ Enhanced error reporting

## Network Information

| Aspect | Value |
|--------|-------|
| **Network** | Polygon Amoy (Testnet) |
| **Chain ID** | 80002 |
| **RPC URL** | `https://rpc-amoy.polygon.technology/` |
| **Contract Address** | `0x59567a56f22D55ebD9133d14f64Aaf489aFcBfA8` |

## Testing the Fix

### 1. Verify Environment
```bash
cd backend
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('WEB3_PROVIDER_URL:', os.getenv('WEB3_PROVIDER_URL'))"
```

**Expected output:**
```
WEB3_PROVIDER_URL: https://rpc-amoy.polygon.technology/
```

### 2. Test Web3 Connection
```bash
python -c "
from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()
provider_url = os.getenv('WEB3_PROVIDER_URL', 'https://rpc-amoy.polygon.technology/')
print(f'Testing connection to: {provider_url}')

w3 = Web3(Web3.HTTPProvider(provider_url, request_kwargs={'timeout': 10}))
if w3.is_connected():
    print('✅ Web3 connected successfully!')
    print(f'   Latest block: {w3.eth.block_number}')
else:
    print('❌ Web3 connection failed!')
"
```

### 3. Test Payment Endpoint (after backend is running)
```bash
curl -X POST http://localhost:8000/payments/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "caseId": "test",
    "escrowId": "test",
    "txHash": "0x1234567890abcdef",
    "amountUSDC": 100,
    "lawyerAddress": "0x742d35Cc6634C0532925a3b844Bc5e8475497f53",
    "clientAddress": "0x8ba1f109551bD432803012645Ac136ddd64DBA72"
  }'
```

## Troubleshooting

### Still Getting "Web3 connection failed"?

1. **Check Environment:**
   ```bash
   # Ensure .env file has the correct URL
   grep WEB3_PROVIDER_URL backend/.env
   ```

2. **Test RPC Directly:**
   ```bash
   curl -X POST https://rpc-amoy.polygon.technology/ \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```
   
   Should return something like: `{"jsonrpc":"2.0","result":"0x123456","id":1}`

3. **Check Backend Logs:**
   Look for `[ERROR] Web3 connection failed:` messages in your terminal

4. **Verify Network Connectivity:**
   ```bash
   ping -c 3 rpc-amoy.polygon.technology
   ```

5. **Restart Backend:**
   - Stop the uvicorn server
   - Run `cd backend && python -m uvicorn main:app --reload`
   - The .env will be reloaded on startup

## Frontend Configuration

The frontend (`blockchain-config.js`) is already correctly configured:
```javascript
export const getAmoyRpcProvider = () => {
    return new ethers.providers.JsonRpcProvider(
        "https://rpc-amoy.polygon.technology/"
    );
};
```

✅ **No changes needed for frontend**

## Deployment Notes

When deploying to production:
1. Update `WEB3_PROVIDER_URL` to production Polygon RPC (e.g., Infura, Alchemy, QuickNode)
2. Ensure `BLOCKCHAIN_PRIVATE_KEY` is set for contract deployment
3. Update `CONTRACT_ADDRESS` to your deployed contract address
4. Test the connection before going live

## Files Modified
- ✅ `backend/.env` - Updated RPC URL
- ✅ `backend/routers/payments.py` - Lazy Web3 initialization with timeout
- ✅ `backend/blockchain_utils.py` - Added timeout and error handling
- ✅ `backend/contract_deployer.py` - Uses env variable and timeout

---
**Status**: Fix Complete ✅  
**Tested On**: April 28, 2026
