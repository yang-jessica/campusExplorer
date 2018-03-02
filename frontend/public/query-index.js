/**
 * This hooks together all the CampusExplorer methods and binds them to clicks on the submit button in the UI.
 *
 * The sequence is as follows:
 * 1.) Click on submit button in the reference UI
 * 2.) Query object is extracted from UI using global document object (CampusExplorer.buildQuery)
 * 3.) Query object is sent to the POST /query endpoint using global XMLHttpRequest object (CampusExplorer.sendQuery)
 * 4.) Result is rendered in the reference UI by calling CampusExplorer.renderResult with the response from the endpoint as argument
 */

// TODO: implement!
