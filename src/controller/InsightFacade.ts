import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";

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
            // declare a promise that will be returned
            const answer: InsightResponse = {code: -1, body: null};
            // fs allows use of File System
            const fs = require("fs");
            // JSZip converts base64 string to JSZipObject using loadAsync
            const JSZip = require("jszip");
            JSZip.loadAsync(content, {base64: true})
                .then(/*loadAsync fulfills here*/function (zip: any) {
                    Log.trace("loadAsync THEN");
                    // for each file in the folder named 'courses', do stuff
                    zip.folder("courses").forEach(function (relativePath: string, file: any) {
                        try {
                            const suc: string = "for each'd " + file.name;
                            Log.trace(suc);
                            // convert compressed file in 'courses' to text
                            file.async("text").then(function (text: string) {
                                try {
                                    // JSON.parse the text returned from file.async
                                    const original = JSON.parse(text);
                                    const size: string = "RESULT SIZE OF " + file.name + ": " + original.result.length;
                                    Log.trace(size);
                                    const msg: string = "json.stringify: " + JSON.stringify(original.result);
                                    Log.trace(msg);
                                    const course: { [sections: string]: any } = [];
                                    // for each section in the result array, parse into our own JSON
                                    for (let i = 0; i < original.result.length; i++) {
                                        try {
                                            const section: { [key: string]: any } = {
                                                courses_dept: original.result[i].Subject,
                                                courses_id: original.result[i].Course,
                                                courses_avg: original.result[i].Avg,
                                                courses_instructor: original.result[i].Professor,
                                                courses_title: original.result[i].Title,
                                                courses_pass: original.result[i].Pass,
                                                courses_fail: original.result[i].Fail,
                                                courses_audit: original.result[i].Audit,
                                                courses_uuid: original.result[i].id,
                                            };
                                            course.push(section);
                                            const sec: string = "new section[" + i + "]: " +
                                                section.courses_dept + ", " + section.courses_id + ", " +
                                                section.courses_avg + ", " + section.courses_instructor + ", " +
                                                section.courses_title + ", " + section.courses_pass + ", " +
                                                section.courses_fail + ", " + section.courses_audit + ", " +
                                                section.courses_uuid;
                                            Log.trace(sec);
                                            const fun = "new section to string: " + JSON.stringify(section);
                                            Log.trace(fun);
                                        } catch {
                                            const cat: string = "error parsing result[" + i + "]";
                                            Log.trace(cat);
                                        }
                                    }
                                    Log.trace("loop of sections finished");
                                    if (course.length === 0) {
                                        answer.code = 400;
                                        answer.body = {error: "no valid sections"};
                                        Log.trace("no valid sections");
                                        reject(answer);
                                    }
                                    const funner = JSON.stringify(course);
                                    const funnest = "new course to string: " + funner;
                                    Log.trace(funnest);
                                    fs.mkdir("./datasets", function () {
                                        fs.mkdir("./datasets/" + id, function () {
                                            Log.trace("directory 'datasets' created");
                                            const logger = fs.createWriteStream("./datasets/" +
                                                id + "/" + file.name.substring(8));
                                            logger.write(funner);
                                            logger.end();
                                            Log.trace("./datasets/" + id + "/" +
                                                file.name.substring(8) + " FILE CREATED");
                                        });
                                    });
                                } catch {
                                    const msg: string = "error parsing " + file.name;
                                    Log.trace(msg);
                                }
                            });
                        } catch {
                            const msg: string = "forEach failed on " + file.name;
                            Log.trace(msg);
                        }
                    });
                    answer.code = 204;
                    resolve(answer);
                })
                .catch(/*loadAsync rejects here*/function () {
                    Log.trace("loadAsync CATCH: can't read base64 content");
                    // loadAsync cannot read content the content, so error code 400
                    answer.code = 400;
                    answer.body = {error: "Cannot read the base64 content"};
                    reject(answer);
                });
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
        return Promise.reject({code: -1, body: null});
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
        return Promise.reject({code: -1, body: null});
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
        return Promise.reject({code: -1, body: null});
    }

    // this is currently useless
/*    private parseCourse(text: string): Promise<string> {
        Log.trace("hey allen yup this doesn't work");
        return new Promise(function (resolve, reject) {
            const original = JSON.parse(text);
            const pArray = [];
            for (let i = 0; i < original.result.length; i++) {
                pArray.push(new Promise(function (fulfill) {
                    Log.trace(original.result[i].Subject);
                    try {
                        const sec: string = "result[" + i + "]: " + original.result[i].Subject;
                        fulfill(sec);
                    } catch {
                        const cat: string = "error parsing result [" + i + "]";
                        Log.trace(cat);
                    }
                }));
            }
            Log.trace("done loop");
            // wait for each promise; result param is an array of each fulfilled value
            Promise.all(pArray)
                .then(function (result) {
                    Log.trace("Promise.all fulfilled");
                    resolve();
                });
            if (pArray.length === 0) {
                reject();
            }
        });
    }*/
}
