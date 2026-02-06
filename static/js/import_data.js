const userId = sessionStorage.getItem('user_id');
const vaultKeyJson = sessionStorage.getItem('vault_key');

if (!userId || !vaultKeyJson) {
    window.location.href = "/login";
}

document.getElementById('importForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files.length) {
        showMessage("Please select a CSV file.", "danger");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
        const text = event.target.result;
        try {
            const vaultKey = await importVaultKey(JSON.parse(vaultKeyJson));
            const rows = parseCSV(text);
            if (rows.length < 2) {
                throw new Error("CSV file is empty or missing headers.");
            }

            const headers = rows[0].map(h => h.toLowerCase().trim());
            const items = rows.slice(1);

            let successCount = 0;
            let errorCount = 0;
            for (const row of items) {
                if (row.length < headers.length && row.length === 1 && row[0] === "") {
                    continue;  // skip empty lines
                }

                const itemData = {};
                headers.forEach((header, index) => {
                    itemData[header] = row[index] || "";
                });

                const name = itemData.name;
                const secrets = {
                    username: itemData.username || "",
                    password: itemData.password || "",
                    website: itemData.website || "",
                    notes: itemData.notes || ""
                };

                const encryptedHex = await encryptVaultItem(vaultKey, JSON.stringify(secrets));                
                const res = await fetch('/api/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        encrypted_content: encryptedHex,
                        user_id: parseInt(userId)
                    })
                });
                if (res.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }
            if (successCount > 0) {
                showMessage(`Successfully imported ${successCount} <a href="/vault" class="alert-link">Go to Vault</a>`, "success");
                fileInput.value = "";
            } else if (errorCount > 0) {
                showMessage("Failed to import items. Please check the CSV format.", "danger");
            }
        } catch (err) {
            console.error(err);
            showMessage(err.message, "danger");
        }
    };
    reader.readAsText(file);
});

// state machine based csv parser which handles quoted fields
// https://stackoverflow.com/a/14991797
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    currentField += '"';
                    i++;  // skip next quote
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentField);
                currentField = "";
            } else if (char === '\n' || char === '\r') {
                if (char === '\r' && nextChar === '\n') i++;
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = "";
            } else {
                currentField += char;
            }
        }
    }

    if (currentRow.length > 0 || currentField !== "") {
        currentRow.push(currentField);
        rows.push(currentRow);
    }
    return rows;
}
