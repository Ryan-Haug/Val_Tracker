const $ = id => document.getElementById(id);

const form = {
    user: $('user'),
    tag: $('tag'),
    api: $('api'),
    submit: $('submit'),
    error: $('error')
};

let errors = [];

//add submission handling onto page
form.submit.addEventListener('click', (e) => {
    e.preventDefault();
    submit();
});

function submit(e) {
    const user = form.user.value.trim();
    const tag = form.tag.value.trim();
    const key = form.api.value.trim();

    errors = [];

    //ensure all fields are present and valid 
    //username
    if (!user) errors.push('username is required');
    if (user && (user.length < 3 || user.length > 16)) {
        errors.push('username must be 3-16 characters long');
    }

    //tag
    if (!tag) errors.push('tag is required');
    if (tag && (tag.length < 3 || tag.length > 5)) {
        errors.push('tag must be 3-5 characters long');
    }

    //api key
    if (!key) errors.push('key is required');
    if (key && !key.startsWith('HDEV')) {
        errors.push('invalid api key');
    }

    if (errors.length > 0) {
        form.error.textContent = '';

        errors.forEach(error => {
            form.error.textContent += `${error} \n`
        });

        return;
    }

    localStorage.setItem('user', user)
    localStorage.setItem('tag', tag)
    localStorage.setItem('key', key)

    window.location.href = '../index.html'
};
