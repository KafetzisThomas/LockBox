const ENCODING = new TextEncoder();
const DECODING = new TextDecoder();

// convert buffer to hex string
function toHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// convert hex string to buffer
function fromHex(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function generateSalt() {
    return window.crypto.getRandomValues(new Uint8Array(16));
}

// password + salt = key
async function deriveKeyFromPassword(password, salt) {
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw", ENCODING.encode(password), { name: "PBKDF2" }, false, ["deriveKey", "deriveBits"]
    );

    return window.crypto.subtle.deriveKey(
        {name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256"},
        keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
}

async function generateVaultKey() {
    return window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

// encrypt vault key with the password key
async function wrapVaultKey(vaultKey, passwordKey) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));  // random iv, might increase that

    const wrappedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv }, passwordKey, await window.crypto.subtle.exportKey("raw", vaultKey)
    );

    // iv + key = hex string
    const combined = new Uint8Array(iv.length + wrappedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(wrappedBuffer), iv.length);
    return toHex(combined.buffer);
}

// decrypt vault key
async function unwrapVaultKey(wrappedHex, passwordKey) {
    const data = fromHex(wrappedHex);
    const iv = data.slice(0, 12);
    const ciphertext = data.slice(12);

    try {
        const rawKeyBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, passwordKey, ciphertext);
        return window.crypto.subtle.importKey("raw", rawKeyBuffer, "AES-GCM", true, ["encrypt", "decrypt"]);
    } catch (e) {
        throw new Error("Incorrect password, decryption failed");
    }
}

// hash of the key to send to the server
async function deriveAuthHash(passwordKey) {
    const exportedKey = await window.crypto.subtle.exportKey("raw", passwordKey);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", exportedKey);
    return toHex(hashBuffer);
}

// import key from jwk session
async function importVaultKey(jwkObject) {
    return window.crypto.subtle.importKey("jwk", jwkObject, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function encryptVaultItem(key, plaintext) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const buffer = ENCODING.encode(plaintext);

    const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, buffer);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return toHex(combined.buffer);
}

async function decryptVaultItem(key, hexString) {
    try {
        const data = fromHex(hexString);
        const iv = data.slice(0, 12);
        const ciphertext = data.slice(12);
        const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ciphertext);
        return DECODING.decode(decrypted);
    } catch (e) {
        throw new Error("Decryption failed", e);
    }
}
