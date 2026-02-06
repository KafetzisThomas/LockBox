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

        const twoFactorToggle = document.getElementById('twoFactorToggle');
        if (twoFactorToggle) {
            twoFactorToggle.checked = user.enable_2fa;
        }

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

document.addEventListener('DOMContentLoaded', () => {
    passwordStrengthMeter('newPassword');

    // session timeout dropdown
    const timeoutSelect = document.getElementById('sessionTimeout');
    if (timeoutSelect) {
        timeoutSelect.value = localStorage.getItem('sessionTimeout') || '30';
        timeoutSelect.addEventListener('change', (e) => {
            localStorage.setItem('sessionTimeout', e.target.value);
            showMessage("Timeout preference saved.", "success", "expireMessage");
            SessionMonitor.start();  // restart countdown with new time
        });
    }
});

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

        if (!res.ok) {
            throw new Error("Failed to update email");
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

function generateOTPSecret(length = 16) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";  // base32
    let secret = "";
    const values = new Uint8Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
        secret += charset[values[i] % charset.length];
    }
    return secret;
}

const twoFactorToggle = document.getElementById('twoFactorToggle');
if (twoFactorToggle) {
    twoFactorToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        let otpSecret = user.otp_secret;

        if (enabled && !otpSecret) {
            otpSecret = generateOTPSecret();
        }

        try {
            const res = await fetch(`/api/users/${userId}/2fa`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enable_2fa: enabled,
                    otp_secret: enabled ? otpSecret : null
                })
            });

            if (!res.ok) {
                throw new Error("Failed to update 2FA status");
            }

            user.enable_2fa = enabled;
            user.otp_secret = enabled ? otpSecret : null;

            if (enabled) {
                const qrImage = document.getElementById('qrCodeImg');
                const secretDisplay = document.getElementById('otpSecretDisplay');
                const qrData = `otpauth://totp/LockBox:${user.email}?secret=${otpSecret}&issuer=LockBox`;
                qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
                secretDisplay.textContent = otpSecret;
                const modal = new bootstrap.Modal(document.getElementById('twoFactorModal'));
                modal.show();
                showMessage("2FA enabled successfully!", "success", "2faMessage");
            } else {
                showMessage("2FA disabled.", "warning", "2faMessage");
            }
        } catch (err) {
            e.target.checked = !enabled;
            showMessage(err.message, "danger", "2faMessage");
        }
    });
}

document.getElementById('exportVaultButton').addEventListener('click', async () => {
    const vaultKeyJson = sessionStorage.getItem('vault_key');
    if (!vaultKeyJson) {
        showMessage("Vault key not found. Please log in again.", "danger", "exportMessage");
        return;
    }

    try {
        const vaultKey = await importVaultKey(JSON.parse(vaultKeyJson));
        const res = await fetch(`/api/items?user_id=${userId}`);
        if (!res.ok) {
            throw new Error("Failed to fetch vault items");
        }

        const items = await res.json();
        if (items.length === 0) {
            showMessage("No items found in your vault to export.", "warning", "exportMessage");
            return;
        }

        const csvRows = [];
        csvRows.push(['name', 'username', 'password', 'website', 'notes'].join(','));

        for (const item of items) {
            const decryptedJson = await decryptVaultItem(vaultKey, item.encrypted_content);
            const data = JSON.parse(decryptedJson);
            const row = [
                item.name,
                data.username || '',
                data.password || '',
                data.website || '',
                data.notes || ''
            ].map(field => {
                // escape double quotes and wrap in double quotes
                // https://www.ietf.org/rfc/rfc4180.txt
                const escaped = ('' + field).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(row.join(','));
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `lockbox_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showMessage("Vault exported successfully!", "success", "exportMessage");
    } catch (err) {
        console.error(err);
        showMessage(err.message, "danger", "exportMessage");
    }
});

document.getElementById('confirmDeleteAccount').addEventListener('click', async () => {
    try {
        const res = await fetch(`/api/users/${userId}`, {method: 'DELETE'});
        if (!res.ok) {
            throw new Error("Failed to delete account");
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
