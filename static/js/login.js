const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get('registered') === 'true') {
    showMessage("Registration successful! Please log in.");
    window.history.replaceState({}, document.title, "/login");
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // get salt and wrapped key from api
        const response = await fetch(`/api/users?email=${email}`);
        const users = await response.json();

        if (users.length === 0) {
            showMessage("User not found.", "danger");
            return;
        }
        const user = users[0];

        // convert hex back to buffer
        const saltBuffer = fromHex(user.kdf_salt);

        const passwordKey = await deriveKeyFromPassword(password, saltBuffer);

        // verify auth hash
        const calculatedHash = await deriveAuthHash(passwordKey);
        if (calculatedHash !== user.auth_hash) {
            throw new Error("Incorrect password");
        }

        const vaultKey = await unwrapVaultKey(user.wrapped_key, passwordKey);

        const exportedKey = await window.crypto.subtle.exportKey("jwk", vaultKey);
        
        sessionStorage.setItem("vault_key", JSON.stringify(exportedKey));
        sessionStorage.setItem("user_id", user.id);
        sessionStorage.setItem("email", email);
        window.location.href = "/";

    } catch (err) {
        showMessage(err, "danger");
    }
});
