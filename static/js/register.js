document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('message');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const salt = generateSalt();
        const passwordKey = await deriveKeyFromPassword(password, salt);
        const vaultKey = await generateVaultKey();
        const wrappedKeyHex = await wrapVaultKey(vaultKey, passwordKey);
        const authHashHex = await deriveAuthHash(passwordKey);

        const payload = {
            email: email,
            auth_hash: authHashHex,
            kdf_salt: toHex(salt),
            wrapped_key: wrappedKeyHex
        };

        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Registration Successful!");
            window.location.href = "/login";
        } else {
            const errorData = await response.json();
            msg.innerText = errorData.detail;
        }
    } catch (err) {
        msg.innerText = err;
    }
});
