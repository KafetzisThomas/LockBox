const userId = sessionStorage.getItem('user_id');
const vaultKeyJson = sessionStorage.getItem('vault_key');
let vaultKey = null;

const getModal = (id) => bootstrap.Modal.getOrCreateInstance(document.querySelector(id));

if (!userId || !vaultKeyJson) {
    window.location.href = "/login";
}

(async function init() {
    try {
        // JSON string -> crypto key
        vaultKey = await importVaultKey(JSON.parse(vaultKeyJson));
        await loadItems();
    } catch (err) {
        console.error(err);
    }
})();

async function loadItems() {
    try {
        const res = await fetch(`/api/items?user_id=${userId}`);
        const items = await res.json();
        renderList(items);
    } catch (err) {
        console.error(err);
    }
}

async function renderList(items) {
    const listContainer = document.getElementById('vaultList');
    const emptyState = document.getElementById('emptyState');

    // reset empty state message if search filter changed it
    emptyState.querySelector('h5').textContent = "There are no items in the list.";
    listContainer.innerHTML = "";

    if (items.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }
    emptyState.classList.add('d-none');

    for (const item of items) {
        const dateStr = new Date(item.date_added).toLocaleDateString();
        const link = document.createElement('a');
        const decryptedJson = await decryptVaultItem(vaultKey, item.encrypted_content);
        const data = JSON.parse(decryptedJson);

        let domain = '';
        if (data.website) {
            let urlStr = data.website;
            urlStr = 'https://' + urlStr;
            domain = new URL(urlStr).hostname;
        }

        link.href = "#";
        link.className = "text-decoration-none item-card"; 
        link.setAttribute('data-name', item.name.toLowerCase());

        link.onclick = (e) => {
            e.preventDefault();
            if (window.getSelection().toString().length === 0) {
                openEditModal(item);
            }
        };

        link.innerHTML = `
            <article class="media border border-secondary-subtle rounded shadow-sm item-section p-3 d-flex align-items-center bg-body-tertiary text-body mb-0">
                <div class="favicon-wrapper me-md-4 me-3">
                    <img src="https://www.google.com/s2/favicons?sz=64&domain=${domain}" alt="favicon" width="32" height="32">
                </div>
                <div class="media-body flex-grow-1">
                    <div class="item-metadata mb-0">
                        <small class="text-muted">${dateStr}</small>
                    </div>
                    <h2 class="mb-0 item-name h5 fw-bold">${item.name}</h2>
                </div>
                <i class="bi bi-chevron-right text-muted d-none d-md-block"></i>
            </article>
        `;
        listContainer.appendChild(link);
    }
}

document.getElementById('createForm').onsubmit = async (e) => {
    e.preventDefault();
    const secrets = {
        username: document.getElementById('newUsername').value,
        password: document.getElementById('newPassword').value,
        website: document.getElementById('newWebsite').value,
        notes: document.getElementById('newNotes').value
    };

    const jsonString = JSON.stringify(secrets);
    const encryptedHex = await encryptVaultItem(vaultKey, jsonString);

    await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: document.getElementById('newName').value,
            encrypted_content: encryptedHex,
            user_id: parseInt(userId)
        })
    });
    e.target.reset();
    getModal('#createModal').hide();
    loadItems();
};

async function openEditModal(item) {
    document.getElementById('editId').value = item.id;
    document.getElementById('editName').value = item.name;
    document.getElementById('editUsername').value = "...";
    document.getElementById('editPassword').value = "...";
    document.getElementById('editWebsite').value = "...";
    document.getElementById('editNotes').value = "...";
    getModal('#editModal').show();

    try {
        const decryptedString = await decryptVaultItem(vaultKey, item.encrypted_content);
        const data = JSON.parse(decryptedString);
        document.getElementById('editUsername').value = data.username || "";
        document.getElementById('editPassword').value = data.password || "";
        document.getElementById('editWebsite').value = data.website || "";
        document.getElementById('editNotes').value = data.notes || "";

        const linkBtn = document.getElementById('editWebsiteLink');
        if (data.website) {
            linkBtn.href = 'https://' + data.website;
            linkBtn.classList.remove('disabled');
        } else {
            linkBtn.href = "#";
            linkBtn.classList.add('disabled');
        }
    } catch (err) {
        console.error("Decryption error", err);
    }
}

document.getElementById('editForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const secrets = {
        username: document.getElementById('editUsername').value,
        password: document.getElementById('editPassword').value,
        website: document.getElementById('editWebsite').value,
        notes: document.getElementById('editNotes').value
    };
    const payload = { 
        name: document.getElementById('editName').value,
        encrypted_content: await encryptVaultItem(vaultKey, JSON.stringify(secrets))
    };

    await fetch(`/api/items/${id}?user_id=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    getModal('#editModal').hide();
    loadItems();
};

function filterItems() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.item-card');
    let hasVisible = false;

    cards.forEach(card => {
        if (card.getAttribute('data-name').includes(query)) {
            card.classList.remove('d-none');
            hasVisible = true;
        } else {
            card.classList.add('d-none');
        }
    });

    const emptyState = document.getElementById('emptyState');
    if (!hasVisible && cards.length > 0) {
        emptyState.classList.remove('d-none');
        emptyState.querySelector('h5').textContent = "No matches found.";
    } else if (cards.length === 0) {
        emptyState.classList.remove('d-none');
        emptyState.querySelector('h5').textContent = "There are no items in the list.";
    } else {
        emptyState.classList.add('d-none');
    }
}

async function deleteItem() {
    if(confirm("Delete item?")) {
        const id = document.getElementById('editId').value;
        await fetch(`/api/items/${id}?user_id=${userId}`, { method: 'DELETE' });
        getModal('#editModal').hide();
        loadItems();
    }
}

function copyToClipboard(elementId) {
    const copyText = document.getElementById(elementId);
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
}
