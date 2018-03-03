import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";
import {PerformQueryHelpers} from "./PerformQueryHelpers";
import {AddDatasetHelpers} from "./AddDatasetHelpers";

/**
 * This is the main programmatic entry point for the project.
 */
export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    /**
     * Add a dataset to UBCInsight.
     *
     * @param id  The id of the dataset being added.
     * @param content  The base64 content of the dataset. This content should be in the form of a serialized zip file.
     * @param kind  The kind of the dataset
     *
     * @return Promise <InsightResponse>
     *
     * The promise should return an InsightResponse for both fulfill and reject.
     *
     * Fulfill should be for 2XX codes and reject for everything else.
     *
     * After receiving the dataset, it should be processed into a data structure of
     * your design. The processed data structure should be persisted to disk; your
     * system should be able to load this persisted value into memory for answering
     * queries.
     *
     * Ultimately, a dataset must be added or loaded from disk before queries can
     * be successfully answered.
     *
     * Response codes:
     *
     * 204: the operation was successful
     * 400: the operation failed. The body should contain {"error": "my text"}
     * to explain what went wrong. This should also be used if the provided dataset
     * is invalid or if it was added more than once with the same id.
     */
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<InsightResponse> {
        // return the Promise<InsightResponse>
        return new Promise(function (resolve, reject) {
            // fs allows use of File System
            const fs = require("fs");
            // synchronously check if the id already exists
            const dirMain = fs.readdirSync("./");
            if (dirMain.includes("datasets")) {
                const dirDatasets = fs.readdirSync("./datasets/");
                if (dirDatasets.includes(id)) {
                    Log.error("400: a dataset with this id already exists");
                    return reject({code: 400, body: {error: "a dataset with this id already exists"}});
                }
            }
            const help = new AddDatasetHelpers();
            if (kind === "courses") {
                help.addCourse(id, content)
                    .then(function (response: InsightResponse) {
                        resolve(response);
                    })
                    .catch(function (response: InsightResponse) {
                        reject(response);
                    });
            } else if (kind === "rooms") {
                help.addRooms(id, content)
                    .then(function (response: InsightResponse) {
                        resolve(response);
                    })
                    .catch(function (response: InsightResponse) {
                        reject(response);
                    });
            }
        });
    }

    /**
     * Remove a dataset from UBCInsight.
     *
     * @param id  The id of the dataset to remove.
     *
     * @return Promise <InsightResponse>
     *
     * The promise should return an InsightResponse for both fulfill and reject.
     *
     * Fulfill should be for 2XX codes and reject for everything else.
     *
     * This will delete both disk and memory caches for the dataset for the id meaning
     * that subsequent queries for that id should fail unless a new addDataset happens first.
     *
     * Response codes:
     *
     * 204: the operation was successful.
     * 404: the operation was unsuccessful because the delete was for a resource that
     * was not previously added.
     *
     */
    public removeDataset(id: string): Promise<InsightResponse> {
        // return the Promise<InsightResponse>
        return new Promise(function (resolve, reject) {
            // declare a promise that will be returned
            const answer: InsightResponse = {code: -1, body: null};
            const fs = require("fs");
            // try to remove the given id
            fs.unlink("./datasets/" + id, function (err: Error) {
                if (err) {
                    answer.code = 404;
                    answer.body = {error: "dataset not removed"};
                    // Log.error("404: dataset not removed");
                    reject(answer);
                } else {
                    answer.code = 204;
                    answer.body = {result: "dataset removed"};
                    // Log.error("204: dataset removed");
                    resolve(answer);
                }
            });
        });
    }

    /**
     * Perform a query on UBCInsight.
     *
     * @param query  The query to be performed. This is the same as the body of the POST message.
     *
     * @return Promise <InsightResponse>
     *
     * The promise should return an InsightResponse for both fulfill and reject.
     *
     * Fulfill should be for 2XX codes and reject for everything else.
     *
     * Return codes:
     *
     * 200: the query was successfully answered. The result should be sent in JSON according in the response body.
     * 400: the query failed; body should contain {"error": "my text"} providing extra detail.
     */
    public performQuery(query: any): Promise<InsightResponse> {
        const help = new PerformQueryHelpers();
        return new Promise(function (resolve, reject) {
            // check if WHERE or OPTIONS are missing
            if (!query["WHERE"] || !query["OPTIONS"]) {
                return reject({code: 400, body: {error: "missing 'WHERE' or 'OPTIONS'"}});
            }
            // check if all keys are from the same dataset
            const queryString = JSON.stringify(query);
            const allKeys: string[] = queryString.match(/[a-z]+(?=_)/g);
            const id: string = allKeys[0];
            for (const key of allKeys) {
                if (key !== id) {
                    return reject({code: 400, body: {error: "missing dataset " + "'" + key + "'"}});
                }
            }
            // check if keys are only WHERE and OPTIONS and optionally TRANSFORMATIONS
            for (const key of Object.keys(query)) {
                if (key !== "WHERE" && key !== "OPTIONS" &&  key !== "TRANSFORMATIONS") {
                    return reject({code: 400, body: {error: "key other than 'WHERE', 'OPTIONS', 'TRANSFORMATIONS'"}});
                }
            }
            // check if WHERE or OPTIONS are empty
            const where = query["WHERE"];
            const options = query["OPTIONS"];
            if (Object.keys(options).length === 0) {
                return reject({code: 400, body: {error: "empty 'OPTIONS'"}});
            } else {
                // if all else is good, call the helpers
                try {
                    let results = help.performWhere(where, false, id);
                    let answer: InsightResponse = {code: -1, body: null};
                    const transform = query["TRANSFORMATIONS"];
                    if (transform) {
                        results = help.performTransform(transform, results);
                        answer = help.performOptionsTransformed(options, results, transform, id);
                    } else {
                        answer = help.performOptions(options, results, id);
                    }
                    return resolve(answer);
                } catch {
                    return reject({code: 400, body: {error: "ERROR OCCURRED"}});
                }
            }
            // resolve(answer);
        });
    }

    /**
     * List a list of datasets and their types.
     *
     * @return Promise <InsightResponse>
     * The promise should return an InsightResponse and will only fulfill.
     * The body of this InsightResponse will contain an InsightDataset[]
     *
     * Return codes:
     * 200: The list of added datasets was successfully returned.
     */
    public listDatasets(): Promise<InsightResponse> {
        return new Promise(function (resolve) {
            const answer: InsightResponse = {code: -1, body: undefined};
            const answerList: InsightDataset[] = [];
            const fs = require("fs");
            const promiseArray: any[] = [];
            // read the dataset directory
            fs.readdir("./datasets/", function (err: Error, files: string[]) {
                if (!err) {
                    for (const file of files) {
                        Log.trace("added dataset: " + file);
                        promiseArray.push(new Promise(function (resolved) {
                            fs.readFile("./datasets/" + file, function (er: Error, data: string) {
                                if (!er) {
                                    const dataset = JSON.parse(data);
                                    const info: InsightDataset = {
                                        id: dataset.iid,
                                        kind: dataset.iKind,
                                        numRows: dataset.numRows,
                                    };
                                    const jsonInfo = file.toUpperCase() + " FROM JSON: " +
                                        "\niid: " + dataset.iid +
                                        "\nnumRows: " + dataset.numRows +
                                        "\niKind: " + dataset.iKind;
                                    Log.trace(jsonInfo);
                                    const parsedInfo = info.id.toUpperCase() + " IN RESULT: " +
                                        "\nid: " + info.id +
                                        "\nkind: " + info.kind +
                                        "\nnumRows: " + info.numRows;
                                    Log.trace(parsedInfo);
                                    answerList.push(info);
                                    resolved(true);
                                }
                            });
                        }));
                    }
                }
                Promise.all(promiseArray).then(function () {
                    answer.code = 200;
                    answer.body = {result: answerList};
                    const resLength: string = "length of result: " + answer.body.result.length;
                    Log.trace(resLength);
                    resolve(answer);
                });
            });
        });
    }
}
