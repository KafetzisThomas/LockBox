const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get('registered') === 'true') {
    showMessage("Registration successful! Please log in.");
    window.history.replaceState({}, document.title, "/login");
}

if (urlParams.get('accountdeleted') === 'true') {
    showMessage("Your account and all associated vault data have been permanently deleted.");
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
        
        if (user.enable_2fa) {
            sessionStorage.setItem("pending_vault_key", JSON.stringify(exportedKey));
            sessionStorage.setItem("pending_user_id", user.id);
            sessionStorage.setItem("pending_email", email);
            window.location.href = "/2fa_verification";
            return;
        }

        sessionStorage.setItem("vault_key", JSON.stringify(exportedKey));
        sessionStorage.setItem("user_id", user.id);
        sessionStorage.setItem("email", email);
        window.location.href = "/";

    } catch (err) {
        showMessage(err.message, "danger");
    }
});
