/*
$(document)(() => {
    fetchProfileDetails();
    fetchContacts();
});
*/

window.onload = () => {
    fetchProfileDetails();
    fetchTotalContacts();
    fetchContacts();
};

$('#contacts_list').on('scroll', scrollHandler);

function scrollHandler(event) {
    let scroll = $(window).scrollTop();
    let scrollBottom = scroll + $(window).height();
    let difference = $(this)[0].scrollHeight - ($(this).scrollTop() + $(this).innerHeight());
    const DELTA = 0.25; // We make another AJAX query if the scroll bar has only DELTA percent of the current window remaining to render
    if(Math.abs(difference / ($(window).height())) <= DELTA) {
        // Make another API call
        var nextPageToken = localStorage.getItem("nextPageToken");
        if (nextPageToken == undefined || nextPageToken == null ||  nextPageToken === "") {
            // console.log("No more Api calls on scroll!");
        } else {
            console.log("Api Call on scroll");
            fetchContacts();
        }
        // console.log(`Close to bottom! Difference = ${difference}`);
    } else {
    }
    // console.log(`Scroll Position: ${scrollBottom} pixels`);
}

function constructContactComponents(data) {
    var trHTML = '';
    $.each(data, (i, person) => {
        var avatarTag = `<img src=${person.avatar} id="avatar-1" class="contact-avatar">`;
        // var resourceNameTag = `<img src="" id="${person.resourceName}" class="contact-resource">`
        var binTag = `<svg id="dustbin-${person.resourceName}" class="contact-dustbin" width="19" height="20" viewBox="0 0 19 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 5.52332L17.54 2.00774" stroke="#053ED1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M10.5413 1.02613L6.99832 1.77901C6.68409 1.8451 6.40912 2.0336 6.23415 2.30284C6.05919 2.57209 5.99864 2.89993 6.06588 3.21391L6.31711 4.39597L12.2242 3.13983L11.973 1.95857C11.9068 1.64503 11.7188 1.37062 11.4503 1.19574C11.1818 1.02086 10.8548 0.959843 10.5413 1.02613Z" stroke="#053ED1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8.24646 14.8896V8.85049" stroke="#053ED1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M11.8701 14.8896V8.85049" stroke="#053ED1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14.5877 5.22699H16.7014L15.5862 18.009C15.5341 18.6368 15.0083 19.1192 14.3784 19.117H5.73436C5.10627 19.1167 4.58328 18.635 4.53136 18.009L3.69635 7.94621" stroke="#053ED1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
        trHTML += `<div id="${person.resourceName}" class="contact-person">\n<div class="contact-bar" toggle="true" id="contact-bar-${person.resourceName}">\n<div class="contact-name-avatar-container">${avatarTag}\n<div id="name-1" class="contact-name">${person.name}</div></div>\n<div id="email-1" class="contact-email">${person.email}</div>\n<div id="phone-1" class="contact-phone">${person.phoneNumber}</div>\n</div>\n${binTag}</div>`;
        $('#contacts_list').append(trHTML);
        trHTML = ''; // Reset it
        document.getElementById(`contact-bar-${person.resourceName}`).addEventListener('click', toggleContact, false);
        document.getElementById(`dustbin-${person.resourceName}`).addEventListener('click', deleteContact, false); // We set it to false since we aren't bubbling the event through a container
    });
}

function constructProfileData(data) {
    var profile = data;
    $("#my-profile-avatar").attr("src", profile.avatar);
    $('#my-profile-name').html(profile.name);
    $('#my-profile-email').html(profile.email);
}

async function fetchProfileDetails() {
    const server_url = localStorage.getItem("GOOGLE_CONTACTS_APP_SERVER_URL");
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

async function fetchTotalContacts() {
    const server_url = localStorage.getItem("GOOGLE_CONTACTS_APP_SERVER_URL");
    $.ajax({
        type: "GET",
        url: server_url + "/contacts/total",
        success: function(data) {
            var numContacts = data.data;
            $('#contacts-count').html(`(${numContacts})`);
        },
        error: function() {
            alert('Error occured when fetching contacts');
        }
    });
}

async function fetchContacts() {
    const server_url = localStorage.getItem("GOOGLE_CONTACTS_APP_SERVER_URL");
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
    const server_url = localStorage.getItem("GOOGLE_CONTACTS_APP_SERVER_URL");
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

async function toggleContact(event) {
    if (this !== event.target) {
        return;
    }

    console.log("Parent");
    let elementId = event.target.id;
    if (!elementId || elementId === "null" || elementId === "undefined") {
        console.log("Oops. Cannot toggle undefined element!");
        return;
    }
    // Toggle it now
    // This is a terrible way to do things. Don't toggle classes
    const bar = document.getElementById(`${elementId}`);

    let resourceName = elementId.split('contact-bar-')[1];

    // Also make the delete button visible
    const dustbin = document.getElementById(`dustbin-${resourceName}`);
    
    var toggle = bar.getAttribute("toggle");
    
    if (toggle) {
        if (toggle === "true") {
            bar.className += ' highlight-bar';
            bar.setAttribute("toggle", "false");
            dustbin.style.setProperty('visibility', 'visible');
        } else {
            bar.className = bar.className.replace(' highlight-bar', '');
            bar.setAttribute("toggle", "true");
            dustbin.style.setProperty('visibility', 'hidden');
        }
    } else {
        console.log("No 'toggle' property for:", elementId);
        return;
    }

}

async function deleteContact(event) {
    let resourceName = event.target.id.split('dustbin-')[1];
    if (!resourceName) {
        console.log("resourceName is not defined");
        return;
    }
    console.log(`Delete Button Clicked! - resourceName: ${resourceName}`);
    const server_url = localStorage.getItem("GOOGLE_CONTACTS_APP_SERVER_URL");
    $.ajax({
        type: "DELETE",
        url: server_url + `/contacts?` + $.param({
            "resourceName": encodeURIComponent(resourceName)
        }),
        success: function(data) {
            console.log("Deleted Contact!");
            $(`#${resourceName.replace(/\//g, "\\/")}`).remove(); // We need to escape '/' with "\\/" since our ID contains a forward slash
        },
        error: function() {
            console.log("Error during Deleting Contact");
        }
    });
}