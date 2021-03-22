async function signIn() {
    const server_url = "https://0174cf9e8efb.ngrok.io";
    console.log(server_url);
    $.ajax({
        type: "GET",
        url: server_url + "/auth/google",
        headers: {
            "Access-Control-Allow-Origin": "https://0174cf9e8efb.ngrok.io"
        },
        data: JSON.stringify({"type": "javascript"}),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(data) {
            console.log('success!');
            console.log(data.token);
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", data.user.id);
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