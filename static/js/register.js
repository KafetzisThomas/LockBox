document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (password !== confirmPassword) {
        showMessage("Passwords do not match", "danger");
        return;
    }

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
            window.location.href = "/login?registered=true";
        } else {
            const errorData = await response.json();
            showMessage(errorData.detail, "danger");
        }
    } catch (err) {
        showMessage(err, "danger");
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const pwd = document.getElementById('password');
    const bar = document.getElementById('password-strength-bar');
    const text = document.getElementById('password-strength-text');

    const levels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-info", "bg-success"];

    pwd.addEventListener('input', () => {
        const val = pwd.value;
        if (!val) {
            bar.style.width = "0%";
            bar.className = "progress-bar";
            text.textContent = "";
            return;
        }

        const result = zxcvbn(val);
        const score = result.score;  // 0 – 4 (=5 levels -> levels list)
        const percentage = (score + 1) * 20;

        bar.style.width = percentage + "%";
        bar.className = "progress-bar " + colors[score];
        bar.setAttribute("aria-valuenow", percentage);
        text.textContent = levels[score];
    });
});
