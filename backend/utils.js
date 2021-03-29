require('dotenv').config();

const {google} = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
    process.env.OAUTH_CALLBACK_DOMAIN + process.env.OAUTH_CALLBACK_URL,
);

/**
 * Fetches the authenticated user's Google Profile Data 
 */
 async function getProfileData(auth) {
    const service = google.people({version: 'v1', auth});
    const options = {
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,photos'
    }
    return service.people.get(options);
}

/**
 * Fetches the total number of contacts 
 */
 async function getNumberofContacts(auth) {
    const service = google.people({version: 'v1', auth});
    const options = {
        resourceName: 'people/me',
        personFields: 'emailAddresses'
    }
    return service.people.connections.list(options);
}

async function listContacts(auth, nextPageToken=undefined) {
    const listOptions = {
        resourceName: 'people/me',
        pageSize: 10,
        personFields: 'names,emailAddresses,phoneNumbers,photos'
    }
    const service = google.people({version: 'v1', auth});
    if (!nextPageToken || nextPageToken == undefined || nextPageToken === "undefined") {
        return service.people.connections.list(listOptions);
    } else {
        listOptions.pageToken = nextPageToken
        return service.people.connections.list(listOptions, nextPageToken);
    }
}

/**
 * Deletes a contact
 */
async function deleteContact(auth, resourceName) {
    const service = google.people({version: 'v1', auth});
    return service.people.deleteContact({
        resourceName: resourceName
    });
}


function contactsCallback(response, contacts=[]) {
    let nextPage = response.data.nextPageToken;
    let connections = response.data.connections;

    if (connections) {
        connections.forEach((person) => {
            let contactDetails = {
                'name': '',
                'email': '',
                'phoneNumber': '',
                'avatar': null,
                'resourceName': ''
            };
            if (person.names && person.names.length > 0) {
                contactDetails.name = person.names[0].displayName;
            }
            if (person.emailAddresses && person.emailAddresses.length > 0) {
                contactDetails.email = person.emailAddresses[0].value;
            }
            if (person.phoneNumbers && person.phoneNumbers.length > 0) {
                contactDetails.phoneNumber = person.phoneNumbers[0].value;
            }
            if (person.photos && person.photos.length > 0) {
                contactDetails.avatar = person.photos[0].url;
            }
            if (person.resourceName) {
                contactDetails.resourceName = person.resourceName
            }
            contacts.push(contactDetails);
        });
    } else {
        console.log('No connections found.');
    }

    return nextPage;
}

module.exports = {
    oauth2Client: oauth2Client,
    getProfileData: getProfileData,
    getNumberofContacts: getNumberofContacts,
    listContacts: listContacts,
    deleteContact: deleteContact,
    contactsCallback: contactsCallback
};
