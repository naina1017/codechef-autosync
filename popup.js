
const saveBtn = document.getElementById("saveBtn");
const uploadBtn = document.getElementById("uploadBtn");
const status = document.getElementById("status");

const usernameInput = document.getElementById("username");
const repoInput = document.getElementById("repo");
const tokenInput = document.getElementById("token");
const problemInput = document.getElementById("problem");
const codeInput = document.getElementById("codeInput");
const acceptedInput = document.getElementById("accepted");

// Load previously saved settings
chrome.storage.local.get(
    ["githubUsername", "githubRepo"],
    (data) => {
        usernameInput.value = data.githubUsername || "";
        repoInput.value = data.githubRepo || "codechef";
    }
);

// Save GitHub settings locally
saveBtn.addEventListener("click", async () => {

    const username = usernameInput.value.trim();
    const repo = repoInput.value.trim();
    const token = tokenInput.value.trim();

    if (!username || !repo || !token) {
        status.textContent = "Fill all GitHub settings first!";
        return;
    }

    await chrome.storage.local.set({
        githubUsername: username,
        githubRepo: repo,
        githubToken: token
    });

    tokenInput.value = "";

    status.textContent = "GitHub settings saved locally!";

});

// Convert code into Base64 safely
function encodeBase64(text) {

    const bytes = new TextEncoder().encode(text);

    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);

}

// Upload solution to GitHub
uploadBtn.addEventListener("click", async () => {

    try {

        const saved = await chrome.storage.local.get([
            "githubUsername",
            "githubRepo",
            "githubToken"
        ]);

        const username = usernameInput.value.trim();
        const repo = repoInput.value.trim();
        const token = tokenInput.value.trim() || saved.githubToken;

        const problem = problemInput.value.trim();
        const code = codeInput.value.trim();

        if (!username || !repo || !token) {
            status.textContent = "Configure GitHub settings first!";
            return;
        }

        if (!problem || !code) {
            status.textContent = "Enter problem name and code!";
            return;
        }

        if (!acceptedInput.checked) {
            status.textContent = "Confirm Accepted verdict first!";
            return;
        }

        if (!code.includes("main")) {
            status.textContent = "Please check your C++ code!";
            return;
        }

        uploadBtn.disabled = true;
        status.textContent = "Connecting to GitHub...";

        const slug = problem
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        const filePath = `CodeChef/${slug}.cpp`;

        const apiUrl =
            `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/contents/` +
            filePath.split("/").map(encodeURIComponent).join("/");

        const headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${token}`,
            "X-GitHub-Api-Version": "2026-03-10",
            "Content-Type": "application/json"
        };

        // Check whether this file already exists
        const existingResponse = await fetch(apiUrl, {
            method: "GET",
            headers: headers
        });

        let sha;

        if (existingResponse.ok) {

            const existingFile = await existingResponse.json();
            sha = existingFile.sha;

        } else if (existingResponse.status !== 404) {

            const error = await existingResponse.json();
            throw new Error(error.message || "Could not check repository.");

        }

        status.textContent = "Uploading solution...";

        const body = {
            message: `Add CodeChef solution: ${problem}`,
            content: encodeBase64(code)
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(apiUrl, {
            method: "PUT",
            headers: headers,
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Upload failed.");
        }

        status.textContent = "Successfully uploaded to GitHub!";

        console.log("GitHub upload successful:", result.content?.html_url);

    } catch (error) {

        console.error("GitHub error:", error);
        status.textContent = "Error: " + error.message;

    } finally {

        uploadBtn.disabled = false;

    }

});
