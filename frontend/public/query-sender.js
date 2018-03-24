/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function(query) {
    return new Promise(function(fulfill, reject) {
        try {
            console.log("inside CampusExplorer.sendQuery");
            let http = new XMLHttpRequest();
            http.open('POST', "http://localhost:4321/query", true);
            http.setRequestHeader("Content-Type", "application/json");
            http.onload = function () {
                console.log(http.responseText);
                fulfill();
            };
            http.send(JSON.stringify(query));
        } catch (err) {
            reject(err);
        }
    });
};
