const userId = sessionStorage.getItem('user_id');
const msgDisplay = document.getElementById('message');

if (!userId) {
    window.location.href = "/login";
}

function showMessage(text, isError = false) {
    msgDisplay.textContent = text;
    msgDisplay.className = isError ? "mt-3 text-center text-danger fw-bold" : "mt-3 text-center text-success fw-bold";
    setTimeout(() => { msgDisplay.textContent = ""; }, 5000);
}

(async function init() {
    const res = await fetch(`/api/users/${userId}`);
    if (res.ok) {
        const user = await res.json();
        document.getElementById('email').value = user.email;
        try {  // keep sidebar and session in sync
            sessionStorage.setItem('email', user.email);
            const sidebarEmail = document.getElementById('userEmailSidebar');
            if (sidebarEmail) sidebarEmail.textContent = user.email;
        } catch (e) {
            console.warn('Could not update sidebar email', e);
        }
    }
})();

document.getElementById('emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('email');
    const newEmail = emailInput.value;

    if (!newEmail || !newEmail.includes('@')) {
        showMessage("Please enter a valid email.", true);
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
        showMessage("Email updated successfully!");

        // refresh email in sidebar display
        sessionStorage.setItem('email', newEmail);
        const sidebarEmail = document.getElementById('userEmailSidebar');
        if (sidebarEmail) {
            sidebarEmail.textContent = newEmail;
        }
    } catch (err) {
        showMessage(err.message, true);
    }
});
