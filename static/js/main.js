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
