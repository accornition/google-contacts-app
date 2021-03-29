window.onload = () => {
    localStorage.setItem("GOOGLE_CONTACTS_APP_SERVER_URL", window.location.origin);
};

function getFormAction(form) {
    form.action = localStorage.getItem("GOOGLE_CONTACTS_APP_SERVER_URL") + "/auth/google";
}