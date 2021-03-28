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

var contactbarTopOffset = 193;
var contactAvatarTopOffset = 203;
var contactNameTopOffset = 212;
var contactEmailTopOffset = 214;
var contactPhoneTopOffset = 212;
var contactDustbinTopOffset = 214;
var contactSelectionBoxTopOffset = 214;


$('#contact_list').on('scroll', scrollHandler);

function scrollHandler(event) {
    let totalHeight = $('#contact_list')[0].scrollHeight;
    let totalOffset = $('#contact_list')[0].offsetHeight;
    let scroll = $('#contact_list').scrollTop();
    let difference = Math.abs(totalHeight - (scroll + totalOffset));
    const DELTA = 0.2; // We make another AJAX query if the scroll bar has only DELTA percent of the current window remaining to render
    if ((difference) / scroll <= DELTA) {
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
        trHTML += `
        <div id="${person.resourceName}" class="contact-person">
            <div class="contact-bar" id="contact-bar-${person.resourceName}" style="top: ${contactbarTopOffset}px" toggle="true"></div>
            <img class="contact-avatar" src=${person.avatar} style="top: ${contactAvatarTopOffset}px">
            <div class="contact-name" style="top: ${contactNameTopOffset}px">${person.name}</div>
            <div class="contact-email" style="top: ${contactEmailTopOffset}px">${person.email}</div>
            <div class="contact-phone" style="top: ${contactPhoneTopOffset}px">${person.phoneNumber}</div>
            <img src="../assets/app/Dustbin.png" id="dustbin-${person.resourceName}" class="contact-dustbin" style="top: ${contactDustbinTopOffset}px">
            <div class="check-box" id="checkbox-${person.resourceName}" style="top: ${contactSelectionBoxTopOffset}px"></div>
        </div>
        `
        contactbarTopOffset += 70;
        contactAvatarTopOffset += 70;
        contactNameTopOffset += 70;
        contactEmailTopOffset += 70;
        contactPhoneTopOffset += 70;
        contactDustbinTopOffset += 70;
        contactSelectionBoxTopOffset += 70;
        $('#contact_list').append(trHTML);
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
    const checkbox = document.getElementById(`checkbox-${resourceName}`);
    
    var toggle = bar.getAttribute("toggle");
    
    if (toggle) {
        if (toggle === "true") {
            bar.className += ' highlight-bar';
            bar.setAttribute("toggle", "false");
            dustbin.style.setProperty('visibility', 'visible');
            checkbox.style.setProperty('visibility', 'visible');
        } else {
            bar.className = bar.className.replace(' highlight-bar', '');
            bar.setAttribute("toggle", "true");
            dustbin.style.setProperty('visibility', 'hidden');
            checkbox.style.setProperty('visibility', 'hidden');
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
            var resourceId = `${resourceName.replace(/\//g, "\\/")}`;
            recalculateContactPositions(resourceId);
            $(`#${resourceId}`).remove(); // We need to escape '/' with "\\/" since our ID contains a forward slash
            var numContacts = $('#contacts-count').html();
            numContacts = Number(numContacts.substr(1, numContacts.length - 2)) - 1;
            if (numContacts && numContacts >= 0) {
                $('#contacts-count').html(`(${numContacts})`);
            } else {
                $('#contacts-count').html(`(0)`);
            }
        },
        error: function() {
            console.log("Error during Deleting Contact");
        }
    });
}

function recalculateContactPositions(resourceName) {
    // Get the resource element and then shift all elements in the linked list above
    const SHIFT = -70;
    var shiftUp = (contactDiv) => {
        const classes = [".contact-bar", ".contact-avatar", ".contact-name", ".contact-email", ".contact-phone", ".contact-dustbin", ".check-box"];
        classes.forEach((className) => {
            var element = contactDiv.find(className)[0];
            var elementTop = element.style.top;
            var newTop = (Number(elementTop.substr(0, elementTop.length - 2)) + SHIFT).toString() + "px";
            element.style.top = newTop;
        });
    }

    var contactDiv = $(`#${resourceName}`).next();
    var contactBar = null;
    var contactId = null;
    while (contactDiv && contactDiv.length > 0) {
        contactBar = contactDiv.find('.contact-bar')[0];
        shiftUp(contactDiv);
        contactDiv = contactDiv.next();
    }
    // throw new Error("Not yet implemented");
}