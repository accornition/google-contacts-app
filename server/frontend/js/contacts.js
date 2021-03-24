/*
$(document)(() => {
    fetchProfileDetails();
    fetchContacts();
});
*/

window.onload = () => {
    fetchProfileDetails();
    fetchContacts();
};

async function fetchProfileDetails() {
    const server_url = "http://localhost:3000"
    console.log(server_url);
    $.ajax({
        type: "GET",
        url: server_url + "/profile",
        success: function(data) {
            console.log('success!');
            console.log(data);
            // window.location = "http://" + server_url + "/" + "home";
        },
        error: function() {
            alert('Error occured');
        }
    });
}

async function fetchContacts() {
    const server_url = "http://localhost:3000"
    console.log(server_url);
    $.ajax({
        type: "GET",
        url: server_url + "/contacts",
        data: {
            "nextPageToken": localStorage.getItem("nextPageToken")
        },
        success: function(data) {
            console.log('success!');
            console.log(data);
            localStorage.setItem("nextPageToken", data.nextPageToken);
        },
        error: function() {
            alert('Error occured');
        }
    });
}