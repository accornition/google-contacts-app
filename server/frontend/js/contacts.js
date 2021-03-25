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

 function constructContactComponents(data) {
    var trHTML = '';
    $.each(data, (i, person) => {
        trHTML += `<div id="contact-person-1" class="contact-person">\n<div class="contact-bar" id="contact-bar-1">\n<div id="name-1" class="contact-name">${person.name}</div>\n<div id="email-1" class="contact-email">${person.email}</div>\n<div id="phone-1" class="contact-phone">${person.phoneNumber}</div>\n</div>\n</div>`;
        // trHTML += '<tr><td>' + person.name + '</td><td>' + person.email + '</td><td>' + person.phoneNumber + '</td></tr>';
    });
    $('#contacts_list').append(trHTML);
}

function constructProfileData(data) {
    var profile = data;
    $('#my-profile-name').html(profile.name);
    $('#my-profile-email').html(profile.email);
}

async function fetchProfileDetails() {
    const server_url = "http://localhost:3000"
    $.ajax({
        type: "GET",
        url: server_url + "/profile",
        success: function(data) {
            constructProfileData(data.data);
            // window.location = "http://" + server_url + "/" + "home";
        },
        error: function() {
            alert('Error occured');
        }
    });
}

async function fetchContacts() {
    const server_url = "http://localhost:3000"
    var nextPageToken = localStorage.getItem("nextPageToken");
    if (nextPageToken == undefined || nextPageToken == null ||  nextPageToken === "") {
        nextPageToken = undefined;
    }
    var params = {
        "nextPageToken": nextPageToken
    }
    if (!nextPageToken) {
        params = {};
    }
    $.ajax({
        type: "GET",
        url: server_url + "/contacts",
        data: params,
        success: function(data) {
            localStorage.setItem("nextPageToken", data.nextPageToken);
            constructContactComponents(data.data);
        },
        error: function() {
            alert('Error occured');
            // localStorage.setItem("nextPageToken", undefined);
        }
    });
}

async function logout() {
    const server_url = "http://localhost:3000"
    $.ajax({
        type: "GET",
        url: server_url + "/logout",
        success: function(data) {
            console.log("Logged out!");
            window.location = server_url;
        },
        error: function() {
            alert('Error occured during logging out');
        }
    });
}