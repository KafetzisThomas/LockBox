const pendingUserId = sessionStorage.getItem("pending_user_id");
const pendingVaultKey = sessionStorage.getItem("pending_vault_key");
const pendingEmail = sessionStorage.getItem("pending_email");

if (!pendingUserId) {
    window.location.href = "/login";
}

document.getElementById('2faForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const otpCode = document.getElementById('otp').value;
    try {
        const response = await fetch('/api/users/verify_2fa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                otp_code: otpCode,
                user_id: parseInt(pendingUserId)
            })
        });

        if (response.ok) {
            sessionStorage.setItem("user_id", pendingUserId);
            sessionStorage.setItem("vault_key", pendingVaultKey);
            sessionStorage.setItem("email", pendingEmail);

            sessionStorage.removeItem("pending_user_id");
            sessionStorage.removeItem("pending_vault_key");
            sessionStorage.removeItem("pending_email");

            window.location.href = "/";
        } else {
            throw new Error("Verification failed");
        }
    } catch (err) {
        showMessage(err.message, "danger");
    }
});
