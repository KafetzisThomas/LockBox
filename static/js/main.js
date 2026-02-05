function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showMessage(message, type = 'success', id = 'message') {
    const placeholder = document.getElementById(id);
    if (!placeholder) {
        return;
    }

    placeholder.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible fade show shadow" role="alert">`,
        `   <div>${message}</div>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('');
    placeholder.append(wrapper);
}

function passwordStrengthMeter(inputId) {
    const pwd = document.getElementById(inputId);
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
}

const SessionMonitor = {
    timer: null,
    start() {
        clearTimeout(this.timer);  // clear existing timer to avoid duplicates
        if (!sessionStorage.getItem('user_id')) {
            return;
        }
        const minutes = parseInt(localStorage.getItem('sessionTimeout') || '30');
        this.timer = setTimeout(() => logout(), minutes * 60 * 1000);
    }
};

// start session monitoring on page load
if (sessionStorage.getItem('user_id')) {
    SessionMonitor.start();
}
