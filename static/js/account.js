const userId = sessionStorage.getItem('user_id');

let user = null;

if (!userId) {
    window.location.href = "/login";
}

(async function init() {
    const res = await fetch(`/api/users/${userId}`);
    if (res.ok) {
        user = await res.json();
        document.getElementById('email').value = user.email;
        try {  // keep sidebar and session in sync
            sessionStorage.setItem('email', user.email);
            const sidebarEmail = document.getElementById('userEmailSidebar');
            if (sidebarEmail) {
                sidebarEmail.textContent = user.email;
            }
        } catch (e) {
            console.warn('Could not update sidebar email', e);
        }
    }
})();

document.getElementById('emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('email');
    const newEmail = emailInput.value;

    if (!emailInput.checkValidity()) {
        showMessage("Please enter a valid email.", "danger", "emailMessage");
        return;
    }

    try {
        const res = await fetch(`/api/users/${userId}/email`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: newEmail })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || "Failed to update email");
        }
        showMessage("Email updated successfully!", "success", "emailMessage");
        user.email = newEmail;

        // refresh email in sidebar display
        sessionStorage.setItem('email', newEmail);
        const sidebarEmail = document.getElementById('userEmailSidebar');
        if (sidebarEmail) {
            sidebarEmail.textContent = newEmail;
        }
    } catch (err) {
        showMessage(err.message, "danger", "emailMessage");
    }
});

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!user) {
        showMessage("User data not loaded.", "danger", "passwordMessage");
        return;
    }

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showMessage("New passwords do not match.", "danger", "passwordMessage");
        return;
    }

    if (newPassword.length < 8) {
        showMessage("New password must be at least 8 characters.", "danger", "passwordMessage");
        return;
    }

    try {
        const currentSalt = fromHex(user.kdf_salt);
        const currentKey = await deriveKeyFromPassword(currentPassword, currentSalt);
        let vaultKey;

        try {
            vaultKey = await unwrapVaultKey(user.wrapped_key, currentKey);
        } catch (err) {
            throw new Error("Current master password is incorrect.");
        }

        const newSalt = generateSalt();
        const newKey = await deriveKeyFromPassword(newPassword, newSalt);
        const newWrappedKey = await wrapVaultKey(vaultKey, newKey);
        const newAuthHash = await deriveAuthHash(newKey);

        const res = await fetch(`/api/users/${userId}/master_password`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_hash: newAuthHash,
                kdf_salt: toHex(newSalt),
                wrapped_key: newWrappedKey
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error("Failed to update password");
        }

        user.kdf_salt = toHex(newSalt);
        user.wrapped_key = newWrappedKey;
        
        document.getElementById('currentPassword').value = "";
        document.getElementById('newPassword').value = "";
        document.getElementById('confirmPassword').value = "";        
        showMessage("Master password updated successfully!", "success", "passwordMessage");
    } catch (err) {
        console.error(err);
        showMessage(err.message, "danger", "passwordMessage");
    }
});

document.getElementById('confirmDeleteAccount').addEventListener('click', async () => {
    try {
        const res = await fetch(`/api/users/${userId}`, {method: 'DELETE'});
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Failed to delete account");
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteAccountModal'));
        if (modal) {
            modal.hide();
        }        
        sessionStorage.clear();
        window.location.href = "/login?accountdeleted=true";
    } catch (err) {
        console.error(err);
        showMessage("Error deleting account: " + err.message, "danger", "passwordMessage");
    }
});
