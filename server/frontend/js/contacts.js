async function fetchContacts() {
    const server_url = "http://localhost:3000"
    console.log(server_url);
    $.ajax({
        type: "GET",
        url: server_url + "/contacts",
        data: JSON.stringify({"code": localStorage.getItem("GOOGLE_OAUTH_CODE")}),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(data) {
            console.log('success!');
            console.log(data);
            // document.cookie = 'authorization=' + data.token + ';' 
            // window.location = "http://" + server_url + "/" + "home";
            // return data;
        },
        error: function() {
            alert('Error occured');
        }
    });
    // console.log("Signed In!!!!");
    // window.location.href = "contacts.html";
}