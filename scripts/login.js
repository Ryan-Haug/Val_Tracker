const doc = {
    "login": document.getElementById("login"),
    "main": document.getElementById("main"),
    "header": {
        "head": document.getElementById("head"),
        "userDisp": document.getElementById("userDisp"),
        "apiDisp": document.getElementById("apiDisp")
    }
}

const form = {
    "user": document.getElementById("userInp"),
    "tag": document.getElementById("tagInp"),
    "api": document.getElementById("ApiInp"),
    "submit": document.getElementById("submitBtn"),    
    "error": document.getElementById("formError")
}

function submit() {
    const user = form.user.value.trim();
    const tag = form.tag.value.trim();
    const api = form.api.value.trim();

    let errors = [];

    // Validate username: 3-16 characters
    if (!user) {
        errors.push("Username is required");
    } else if (user.length < 3 || user.length > 16) {
        errors.push("Username must be 3-16 characters");
    }

    // Validate tagline: 3-5 characters
    if (!tag) {
        errors.push("Tagline is required");
    } else if (tag.length < 3 || tag.length > 5) {
        errors.push("Tagline must be 3-5 characters");
    }

    // Validate API key: not empty
    if (!api) {
        errors.push("API key is required");
    }

    if (errors.length > 0) {
        form.error.textContent = "ERROR: \n" + errors.join("\n");
        form.error.style.display = "block";
        return;
    }

    // If valid, save to localStorage and show main
    localStorage.setItem("user", user);
    localStorage.setItem("tag", tag);
    localStorage.setItem("api", api);

    doc.login.style.display = 'none';
    doc.header.head.style.display = 'flex';
    doc.main.style.display = 'block';

    // Update header display
    doc.header.userDisp.textContent = `User: ${user}#${tag}`;

    form.error.style.display = "none";
}

// button functions for after login

function clearData(){
    localStorage.clear();
    location.reload();
}

function init() {
    if (localStorage.getItem("user") || localStorage.getItem("tag") || localStorage.getItem("api")) {
    window.dispatchEvent(new Event("userLoggedIn"));
    
    doc.login.style.display = 'none';
    doc.header.head.style.display = 'flex';
    doc.main.style.display = 'block';

    // Update display with stored values
    const user = localStorage.getItem("user");
    const tag = localStorage.getItem("tag");
    const apiKey = localStorage.getItem("api");

    if (user && tag) 
        doc.header.userDisp.textContent = `User: ${user}#${tag}`;

    if (apiKey) 
        doc.header.apiDisp.textContent = `Key: ${apiKey.slice(0, 9) + '...'}`
    }

    form.submit.addEventListener('click', (e) => {
        e.preventDefault();
        submit();
        window.dispatchEvent(new Event("userLoggedIn"));
    });
}

init()