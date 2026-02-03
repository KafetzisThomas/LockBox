function showMessage(message, type = 'success', id = 'message') {
    const placeholder = document.getElementById(id);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible fade show shadow" role="alert">`,
        `   <div>${message}</div>`,
        '</div>'
    ].join('');
    placeholder.append(wrapper);
}
