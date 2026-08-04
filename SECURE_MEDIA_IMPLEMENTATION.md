# Secure Media Image Obfuscation System

## Overview

This implementation provides AES-256-GCM encrypted image delivery to prevent:
- Direct image URL discovery
- Easy downloading via browser DevTools Network tab
- Simple scraping of media assets
- Right-click save and drag-and-drop

## Architecture

### Backend (Node.js/Express)

**Location:** `code-judge-backend/src/services/secureMedia.service.ts`

- **Service:** `SecureMediaService` - Handles AES-256-GCM encryption/decryption
- **Controller:** `src/controllers/secureMedia.controller.ts` - REST endpoint
- **Route:** `GET /api/v1/secure-media/:imageName`

### Frontend (Next.js/React)

**Location:** `code-judge-frontend/src/services/secureMedia.ts`

- **Service Functions:** `decryptSecureMedia()`, `renderSecureImage()`
- **React Hook:** `useSecureImage()` - State management for secure images
- **Component:** `SecureCanvas` - Canvas-based image rendering with event blocking

---

## How It Works

### Backend Encryption Flow

1. **Key Derivation:** The `AES_SECRET_KEY` from environment is hashed with SHA-256 to produce a 32-byte key
2. **Encryption:** Each image is encrypted with:
   - Random 12-byte IV (Initialization Vector)
   - AES-256-GCM authenticated encryption
   - 16-byte authentication tag
3. **Response Format:** `Base64(IV + AuthTag + EncryptedData)`
4. **Headers:** Set as `application/octet-stream` with `X-Content-Type-Options: nosniff`

### Frontend Decryption Flow

1. **Fetch:** Request encrypted payload via XHR/Fetch (appears as API call, not media)
2. **Decrypt:** Use Web Crypto API with matching AES-GCM key derivation
3. **Render:** Convert to Blob → ObjectURL → Canvas drawImage
4. **Protect:** Block context menu, drag events, and keyboard shortcuts

---

## Configuration

### Backend Environment Variables

Add to `code-judge-backend/.env`:

```env
# AES-256 Secret Key (minimum 32 characters)
# CRITICAL: Use a strong, randomly generated key
AES_SECRET_KEY="your_very_secure_random_key_here_minimum_32_chars"

# Secure media directory (outside public folder)
SECURE_MEDIA_DIR="./secure-media"
```

**Important:** 
- NEVER commit the actual `AES_SECRET_KEY` to version control
- Generate a unique key for each environment (dev/staging/production)
- Store keys in a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)

### Frontend Environment Variables

Add to `code-judge-frontend/.env.local`:

```env
NEXT_PUBLIC_AES_SECRET_KEY="same_key_as_backend_here"
```

**Critical:** The frontend key MUST match the backend key exactly.

---

## AES Key Synchronization Strategy

### Option 1: Environment Variables (Current Implementation)

Both backend and frontend read the same key from their respective `.env` files.

**Pros:**
- Simple to implement
- Works for development and single-server deployments

**Cons:**
- Key is exposed in frontend JavaScript bundle (minified but not encrypted)
- Requires manual synchronization across environments
- Not ideal for multi-tenant applications

**Security Note:** While the key is technically client-side, the obfuscation still raises the bar significantly:
- Prevents casual right-click saves
- Blocks simple scrapers looking for `<img>` tags
- Hides direct image URLs from Network tab
- Requires crypto knowledge to extract and decrypt

### Option 2: Session-Based Key Exchange (Recommended for Production)

For enhanced security, implement a key derivation scheme:

```typescript
// Backend: Generate session-specific key
app.get('/api/v1/media-key', async (req, res) => {
  const sessionKey = crypto.randomBytes(32).toString('hex');
  // Store in Redis with TTL tied to user session
  await redis.set(`media-key:${req.session.id}`, sessionKey, 'EX', 3600);
  res.json({ key: sessionKey });
});
```

```typescript
// Frontend: Fetch key on app load
const sessionKey = await fetch('/api/v1/media-key').then(r => r.json());
// Use this key for all media decryption
```

**Pros:**
- Keys rotate per session
- Backend controls key distribution
- Can revoke keys server-side

### Option 3: Asymmetric Encryption (Highest Security)

Use RSA-OAEP for key exchange:

```typescript
// Backend holds private key, frontend has embedded public key
const publicKey = await crypto.subtle.importKey(
  'spki',
  publicKeyBuffer,
  { name: 'RSA-OAEP', hash: 'SHA-256' },
  false,
  ['encrypt']
);

// Backend encrypts AES key with public key
const encryptedKey = await crypto.subtle.encrypt(
  { name: 'RSA-OAEP' },
  publicKey,
  aesKey
);
```

**Pros:**
- AES key never transmitted in plaintext
- Frontend public key can be safely embedded
- Private key never leaves backend

---

## Usage Examples

### Basic Usage

```tsx
import { SecureCanvas } from '@/components/common/SecureCanvas';

function MyComponent() {
  return (
    <SecureCanvas
      imageName="hero-banner.png"
      width={800}
      height={400}
      className="rounded-lg shadow-lg"
      fallback={<div>Loading...</div>}
      onLoad={() => console.log('Image loaded')}
      onError={(err) => console.error('Failed:', err)}
    />
  );
}
```

### Using the Hook Directly

```tsx
import { useSecureImage } from '@/services/secureMedia';

function CustomImageComponent({ imageName }: { imageName: string }) {
  const { canvasRef, isLoading, error, loadImage } = useSecureImage();

  useEffect(() => {
    loadImage(imageName, { width: 500, height: 300 });
  }, [imageName, loadImage]);

  if (error) return <div>Error: {error}</div>;
  if (isLoading) return <div>Loading...</div>;

  return <canvas ref={canvasRef} width={500} height={300} />;
}
```

### Manual Fetch and Decrypt

```typescript
import { decryptSecureMedia } from '@/services/secureMedia';

async function loadSecureImage(imageName: string) {
  const response = await fetch(`/api/v1/secure-media/${imageName}`);
  const result = await response.json();
  
  if (result.success) {
    const decryptedBuffer = await decryptSecureMedia(result.data, AES_KEY);
    const blob = new Blob([decryptedBuffer], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    return url;
  }
}
```

---

## Security Considerations

### What This Protects Against

✅ Right-click "Save Image As..."  
✅ Drag and drop to desktop  
✅ Direct URL discovery in Network tab (appears as XHR/Fetch)  
✅ Simple `<img src="...">` scraping  
✅ Viewing source for direct image URLs

### What This Does NOT Protect Against

❌ Determined attackers using browser DevTools to:
  - Inspect canvas and extract image data
  - Use screenshots or screen recording
  - Decode object URLs from memory
  - Intercept and decrypt network traffic
  - Extract keys from JavaScript bundle

❌ Users can still take screenshots or photos of the screen

❌ Browser extensions or user scripts

### Defense-in-Depth Recommendations

1. **Watermarking:** Embed invisible watermarks in images
2. **Rate Limiting:** Limit API requests per user/session
3. **Authentication:** Require JWT/session for media endpoints
4. **Referrer Checking:** Verify requests come from your domain
5. **Content Security Policy:** Restrict media sources
6. **Monitoring:** Log unusual access patterns
7. **Key Rotation:** Periodically rotate AES keys

---

## File Structure

```
code-judge-backend/
├── .env                          # AES_SECRET_KEY, SECURE_MEDIA_DIR
├── src/
│   ├── services/
│   │   └── secureMedia.service.ts  # AES-256-GCM encryption service
│   ├── controllers/
│   │   └── secureMedia.controller.ts  # REST endpoint
│   └── routes/
│       └── v1/
│           └── index.ts            # Route registration
└── secure-media/                   # Encrypted image storage (not public)

code-judge-frontend/
├── .env.local                      # NEXT_PUBLIC_AES_SECRET_KEY
└── src/
    ├── services/
    │   └── secureMedia.ts          # Decryption and rendering logic
    └── components/
        └── common/
            └── SecureCanvas.tsx     # React component
```

---

## Testing

### Backend Test

```bash
# Start backend server
cd code-judge-backend
npm run dev

# Test endpoint (returns encrypted base64)
curl http://localhost:8000/api/v1/secure-media/test-image.png
```

### Frontend Test

```tsx
// Add to any page
<SecureCanvas 
  imageName="test.png"
  width={400}
  height={300}
/>
```

Check browser DevTools:
1. **Network tab:** Request appears as `secure-media` (type: xhr/fetch)
2. **Response:** Base64 encrypted string
3. **Console:** No image URL exposed

---

## Troubleshooting

### Decryption Failed

- Ensure backend and frontend keys are identical
- Check that encrypted data format matches (IV + AuthTag + Ciphertext)
- Verify AES-GCM algorithm settings match

### Images Not Loading

- Verify `SECURE_MEDIA_DIR` path is correct
- Check file exists in secure-media directory
- Ensure backend has read permissions
- Check browser console for CORS errors

### Performance Issues

- Images are encrypted/decrypted on each request
- Consider caching decrypted images (with proper security)
- Use appropriate image sizes (don't upscale/downscale excessively)
- Enable HTTP caching headers where appropriate

---

## Next Steps

1. **Add Authentication:** Protect endpoint with JWT middleware
2. **Implement Caching:** Cache encrypted responses with short TTL
3. **Add Compression:** Compress images before encryption (reduces payload)
4. **Monitor Usage:** Track endpoint usage and performance metrics
5. **Automated Tests:** Add unit tests for encryption/decryption

---

## License

Internal use only - CodeJudge Platform