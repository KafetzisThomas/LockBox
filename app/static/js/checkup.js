const userId = sessionStorage.getItem('user_id');
const vaultKeyJson = sessionStorage.getItem('vault_key');
let vaultKey = null;

if (!userId || !vaultKeyJson) {
    window.location.href = "/login";
}

async function sha1(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await window.crypto.subtle.digest("SHA-1", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

(async function init() {
    try {
        vaultKey = await importVaultKey(JSON.parse(vaultKeyJson));
        await runCheckup();
    } catch (err) {
        console.error(err);
    }
})();

async function checkPwned(password) {
    if (!password) {
        return 0;
    }

    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    try {
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        const text = await response.text();
        const lines = text.split('\r\n');

        for (const line of lines) {
            const [lineSuffix, count] = line.split(':');
            if (lineSuffix && lineSuffix.trim() === suffix) {
                return parseInt(count);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function runCheckup() {
    const resultsContainer = document.getElementById('checkupResults');
    resultsContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p class="mt-2">Analyzing your vault...</p></div>';

    try {
        const res = await fetch(`/api/items?user_id=${userId}`);
        const items = await res.json();
        if (items.length === 0) {
            resultsContainer.innerHTML = '<div class="container text-center mt-3"><h5>No items found to check.</h5></div>';
            return;
        }

        const results = [];
        for (const item of items) {
            try {
                const decryptedJson = await decryptVaultItem(vaultKey, item.encrypted_content);
                const data = JSON.parse(decryptedJson);
                const pwnCount = await checkPwned(data.password);
                results.push({
                    name: item.name,
                    pwned: pwnCount > 0,
                    count: pwnCount,
                    status: pwnCount > 0 ? `This password has been seen ${pwnCount.toLocaleString()} times in data breaches.` : "This password was not found in any known data breaches.",
                    recommendation: pwnCount > 0 ? "You should change this password immediately." : "No immediate action required.",
                    severity: pwnCount > 0 ? "High" : "Safe"
                });
            } catch (err) {
                console.error(err);
            }
        }
        renderResults(results);
    } catch (err) {
        console.error(err);
        showMessage("An error occurred while performing the checkup.", "danger");
    }
}

function renderResults(results) {
    const resultsContainer = document.getElementById('checkupResults');
    resultsContainer.innerHTML = '';

    const ul = document.createElement('ul');
    ul.className = 'list-group';

    results.forEach(result => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-start mb-3 shadow-sm border rounded';

        const badgeClass = result.severity === "High" ? "bg-danger" : "bg-success";
        const badgeText = result.severity === "High" ? "High Risk" : "Safe";

        li.innerHTML = `
            <div class="ms-2 me-auto">
                <div class="fw-bold fs-5">${capitalize(result.name)}</div>
                <p class="mb-1">${result.status}</p>
                <small class="text-muted">${result.recommendation}</small>
            </div>
            <span class="badge ${badgeClass} rounded-pill p-2">${badgeText}</span>
        `;
        ul.appendChild(li);
    });
    resultsContainer.appendChild(ul);
}
