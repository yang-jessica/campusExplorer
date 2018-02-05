import Log from "../Util";
import {IDataset} from "./IDatasetFacade";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";

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
            // check if the id already exists -> throw 400, else continue
            fs.readdir("./datasets/", function (err: Error, files: string[]) {
                if (!err) {
                    for (let i = 0; i < files.length; i++) {
                        const test = "file[" + i + "] " + files[i];
                        // Log.trace(test);
                        if (files[i] === id) {
                            answer.code = 400;
                            answer.body = {error: "a dataset with this id already exists"};
                            // Log.error("400: a dataset with this id already exists");
                            reject(answer);
                        }
                    }
                }
            }); // fs.readdir is async so loadAsync starts before it's done 🤔
            // JSZip converts base64 string to JSZipObject using loadAsync
            const JSZip = require("jszip");
            JSZip.loadAsync(content, {base64: true})
                .then(/*loadAsync fulfills here*/function (zip: any) {
                    // Log.trace("loadAsync THEN");
                    // for each file in the folder named 'courses', do stuff
                    const promiseArray: any[] = [];
                    const course: { [section: string]: any } = [];
                    zip.folder("courses").forEach(function (relativePath: string, file: any) {
                        const suc: string = "for each'd " + file.name;
                        // Log.trace(suc);
                        // convert compressed file in 'courses' to text
                        promiseArray.push(file.async("text").then(function (text: any) {
                            try {
                                // JSON.parse the text returned from file.async
                                const original = JSON.parse(text);
                                const size: string = "Size of: " + file.name + ": " + original.result.length;
                                // Log.trace(size);
                                const originalResult: string = "json.stringify: " + JSON.stringify(original.result);
                                // Log.trace(originalResult);
                                // for each section in the result array, parse into our own JSON
                                for (let i = 0; i < original.result.length; i++) {
                                    try {
                                        const section: { [key: string]: any } = {
                                            [id + "_dept"]: original.result[i].Subject,
                                            [id + "_id"]: original.result[i].Course,
                                            [id + "_avg"]: original.result[i].Avg,
                                            [id + "_instructor"]: original.result[i].Professor,
                                            [id + "_title"]: original.result[i].Title,
                                            [id + "_pass"]: original.result[i].Pass,
                                            [id + "_fail"]: original.result[i].Fail,
                                            [id + "_audit"]: original.result[i].Audit,
                                            [id + "_uuid"]: original.result[i].id.toString(),
                                        };
                                        course.push(section);
                                        const sec: string = "new section[" + i + "]: " +
                                            section.courses_dept + ", " + section.courses_id + ", " +
                                            section.courses_avg + ", " + section.courses_instructor + ", " +
                                            section.courses_title + ", " + section.courses_pass + ", " +
                                            section.courses_fail + ", " + section.courses_audit + ", " +
                                            section.courses_uuid;
                                        // Log.trace(sec);
                                        const fun = "new section to string: " + JSON.stringify(section);
                                        // Log.trace(fun);

                                    } catch {
                                        const cat: string = "error parsing result[" + i + "]";
                                        // Log.trace(cat);
                                    }
                                }
                            } catch {
                                const errorParse: string = "error parsing " + file.name;
                                // Log.trace(errorParse);
                            }
                        }));
                        const msg: string = "loop of " + file.name + " finished";
                        // Log.trace(msg);
                    });
                    Promise.all(promiseArray).then(function () {
                        const final: IDataset = {
                            iid: id,
                            sections: course,
                            numRows: course.length,
                            iKind: kind,
                        };
                        const courseString = JSON.stringify(final);
                        const logCourse = "new course to string: " + courseString;
                        // Log.trace(logCourse);
                        if (course.length === 0) {
                            answer.code = 400;
                            answer.body = {error: "no valid sections"};
                            // Log.error("400: no valid sections");
                            reject(answer);
                        } else {
                            fs.mkdir("./datasets", function () {
                                // Log.trace("directory 'datasets' created");
                                // write the course to a file using a stream
                                const logger = fs.createWriteStream("./datasets/" + id);
                                logger.write(courseString);
                                logger.end();
                                // Log.trace("./datasets/" + id + " FILE CREATED");
                                answer.code = 204;
                                answer.body = {result: "dataset successfully added"};
                                resolve(answer);
                            });
                        }
                    });
                })
                .catch(/*loadAsync rejects here*/function () {
                    // loadAsync cannot read content the content, so error code 400
                    answer.code = 400;
                    answer.body = {error: "Cannot read base64 content"};
                    // Log.error("loadAsync CATCH: 400: Cannot read base64 content");
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
                    Log.error("404: dataset not removed");
                    reject(answer);
                } else {
                    answer.code = 204;
                    answer.body = {result: "dataset removed"};
                    Log.error("204: dataset removed");
                    resolve(answer);
                }
            });
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
        const that = this;
        return new Promise(function (resolve, reject) {
            const answer: InsightResponse = {code: -1, body: undefined};
            // check if WHERE or OPTIONS are missing
            if (!query["WHERE"] || !query["OPTIONS"]) {
                Log.trace("400: missing 'WHERE' or 'OPTIONS'");
                answer.code = 400;
                answer.body = {error: "missing 'WHERE' or 'OPTIONS'"};
                return reject(answer);
            }
            // check if all keys are from the same dataset
            const queryString = JSON.stringify(query);
            const typeQ = typeof queryString;
            Log.trace(typeQ);
            Log.trace(queryString);
            const allKeys: string[] = queryString.match(/[a-z]+(?=_)/g);
            const id: string = allKeys[0];
            Log.trace(id);
            for (const key of allKeys) {
                if (key !== id) {
                    Log.trace("400: missing dataset " + "'" + key + "'");
                    answer.code = 400;
                    answer.body = {error: "missing dataset " + "'" + key + "'"};
                    return reject(answer);
                }
            }
            // check if keys are only WHERE and OPTIONS
            let objectKeys = "[ ";
            for (const key of Object.keys(query)) {
                objectKeys = objectKeys + key + ", ";
                if (key !== "WHERE" && key !== "OPTIONS") {
                    answer.code = 400;
                    answer.body = {error: "key other than 'WHERE' and 'OPTIONS'"};
                    Log.trace("400: key other than 'WHERE' and 'OPTIONS'");
                    return reject(answer);
                }
            }
            objectKeys = objectKeys + "]";
            Log.trace(objectKeys);
            // check if WHERE is empty
            const where = query["WHERE"];
            const options = query["OPTIONS"];
            if (Object.keys(where).length === 0 || Object.keys(options).length === 0) {
                answer.code = 400;
                answer.body = {error: "empty 'WHERE' or 'OPTIONS'"};
                Log.trace("400: empty 'WHERE' or 'OPTIONS'");
                return reject(answer);
            } else {
                try {
                    let results = that.performWhere(where, false, id);
                    results = that.performOptions(options, results, id);
                    answer.code = 200;
                    answer.body = {result: results};
                    const ans = "Query finished!\nresult: " + JSON.stringify(results);
                    Log.trace(ans);
                } catch {
                    answer.code = 400;
                    answer.body = {error: "lol what"};
                    Log.trace("ERROR OCCURRED");
                    return reject(answer);
                }
            }
            // reject(answer);
            resolve(answer);
        });
    }

    // WHERE helper
    private performWhere(where: any, negate: boolean, id: string): any[] {
        Log.trace("PERFORM WHERE");
        let result: any[] = [];
        const filter = Object.keys(where)[0];
        switch (filter) {
            case "AND":
                Log.trace("\t\tfilter is: AND");
                try {
                    result = this.andFunction(where, negate, id);
                } catch {
                    throw new Error("AND messed up");
                }
                break;
            case "OR":
                Log.trace("\t\tfilter is: OR");
                // result = this.performLComp(where, id);
                break;
            case "LT":
                Log.trace("\t\tfilter is: LT");
                try {
                    result = this.performMComp(where, negate, id);
                } catch {
                    throw new Error("LT messed up");
                }
                break;
            case "GT":
                Log.trace("\t\tfilter is: GT");
                try {
                    result = this.performMComp(where, negate, id);
                } catch {
                    throw new Error("GT messed up");
                }
                break;
            case "EQ":
                Log.trace("\t\tfilter is: EQ");
                try {
                    result = this.performMComp(where, negate, id);
                } catch {
                    throw new Error("EQ messed up");
                }
                break;
            case "IS":
                Log.trace("\t\tfilter is: IS");
                try {
                    result = this.performSComp(where, negate, id);
                } catch {
                    throw new Error("IS messed up");
                }
                break;
            case "NOT":
                Log.trace("\t\tfilter is: NOT");
                try {
                    result = this.performNeg(where, id);
                } catch {
                    throw new Error("NOT messed up");
                }
                break;
            default:
                throw new Error("damn man there ain't no filter like that in here");
        }
        return result;
    }

    // AND function
    private andFunction(andQuery: any, negate: boolean, id: string): any[] {
        Log.trace("AND FUNCTION");
        // is it empty?
        const sizeOfAnd = "\t\tsize of AND: " + andQuery["AND"].length;
        Log.trace(sizeOfAnd);
        if (andQuery["AND"].length === 0) {
            Log.trace("\t\tAND empty\n");
            throw new Error("AND empty");
        }
        const fs = require("fs");
        const datasetString = fs.readFileSync("./datasets/" + id);
        // Log.trace(datasetString);
        const data = JSON.parse(datasetString);
        let andResult: any[] = data.sections;
        // const andKeys = Object.keys(andQuery)[0]; // GT
        for (const logicClause of andQuery["AND"]) {
            switch (Object.keys(logicClause)[0]) {
                case "AND":
                    Log.trace("\t\tinside AND");
                    andResult = this.andHelper(andResult, this.andFunction(logicClause, negate, id));
                    break;
                case "OR":
                    // andResult = this.andHelper(andResult, this.notFunction(logicClause, id));
                    break;
                case "LT":
                    Log.trace("\t\tinside LT");
                    andResult = this.andHelper(andResult, this.performMComp(logicClause, negate, id));
                    break;
                case "GT":
                    Log.trace("\t\tinside GT");
                    andResult = this.andHelper(andResult, this.performMComp(logicClause, negate, id));
                    break;
                case "EQ":
                    Log.trace("\t\tinside EQ");
                    andResult = this.andHelper(andResult, this.performMComp(logicClause, negate, id));
                    break;
                case "IS":
                    Log.trace("\t\tinside IS");
                    andResult = this.andHelper(andResult, this.performSComp(logicClause, negate, id));
                    break;
                case "NOT":
                    Log.trace("\t\tinside NOT");
                    andResult = this.andHelper(andResult, this.performNeg(logicClause, id));
                    break;
                default:
                    Log.trace("\t\tunknown filter encountered");
                    throw new Error("damn man there ain't no filter like that in here");
            }
        }
        return andResult;
    }

    // AND helper
    private andHelper(array1: any[], array2: any[]): any[] {
        Log.trace("AND HELPER");
        const stringifyArray1: any[] = [];
        for (const x of array1) {
            const y = JSON.stringify(x);
            // Log.trace(y);
            stringifyArray1.push(y);
        }
        const stringifyArray2: any[] = [];
        for (const x2 of array2) {
            const y2 = JSON.stringify(x2);
            // Log.trace(y2);
            stringifyArray2.push(y2);
        }
        Log.trace("\t\tfirst array: " + stringifyArray1);
        Log.trace("\t\tsecond array: " + stringifyArray2);
        let filteredStringArray: any[];
        const filteredArray: any[] = [];
        filteredStringArray = stringifyArray2.filter(function (x: any) {
            let include: boolean;
            include = stringifyArray1.includes(x);
            return include;
        });
        for (const x of filteredStringArray) {
            const parsed = JSON.parse(x);
            filteredArray.push(parsed);
        }
        return filteredArray;
    }

    // MATH COMPARISON (GT || LT || EQ) HELPER
    private performMComp(filter: any, negate: boolean, id: string): any[] {
        Log.trace("PERFORM M COMP");
        // get the comparator
        const logic = filter[Object.keys(filter)[0]];
        const comparator = Object.keys(filter)[0];
        const compInfo = "\t\tCOMPARATOR: " + comparator;
        Log.trace(compInfo);
        // is it empty? also can check if it's > 1
        const sizeOfLogic = "\t\tsize of logic: " + Object.keys(logic).length;
        Log.trace(sizeOfLogic);
        if (Object.keys(logic).length === 0) {
            Log.trace("\t\tcomparator empty\n");
            throw new Error("comparator empty");
        }
        // the thing to compare
        const keyToCompare = Object.keys(logic)[0];
        Log.trace("\t\tkey to compare: " + keyToCompare);
        // is it valid?
        const valid = "\t\tis it valid? " + this.isValidKey(keyToCompare);
        Log.trace(valid);
        if (!this.isValidKey(keyToCompare)) {
            Log.trace("\t\tinvalid key");
            throw new Error("invalid key");
        }
        // is the key to compare on numeric?
        const numeric = "\t\tis numeric? " + this.isNumericKey(keyToCompare);
        Log.trace(numeric);
        if (!this.isNumericKey(keyToCompare)) {
            Log.trace("\t\tcan't compare string keys mathematically");
            throw new Error("can't compare string keys mathematically");
        }
        // is the actual value numeric?
        const value = "\t\ttype of value? " + typeof logic[keyToCompare];
        Log.trace(value);
        if (typeof logic[keyToCompare] === "string") {
            Log.trace("\t\tcan't math compare string values");
            throw new Error("can't math compare string values");
        }
        // what else
        const comp = "\t\tCOMPARISON: " + Object.keys(logic)[0] + " " +
            Object.keys(filter)[0] + " " + logic[Object.keys(logic)[0]];
        Log.trace(comp);
        // parse shit for real this time
        const fs = require("fs");
        const datasetString = fs.readFileSync("./datasets/" + id);
        const data = JSON.parse(datasetString);
        const answer: any[] = [];
        const invert: any[] = [];
        // const dataID = data.iid;
        const allSections = data.sections;
        for (let i = 0; i < allSections.length; i++) {
            // begin logging
            const set = "set[" + i + "] " + keyToCompare + ": " + allSections[i][keyToCompare];
            const qry = "query[" + i + "] " + keyToCompare + ": " + logic[keyToCompare];
            const msg = "\t\t" + set + "\t\t vs \t\t" + qry;
            // Log.trace(msg);
            // end logging
            switch (comparator) {
                case "GT":
                    if (allSections[i][keyToCompare] > logic[keyToCompare]) {
                        answer.push(allSections[i]);
                    } else {
                        invert.push(allSections[i]);
                    }
                    break;
                case "LT":
                    if (allSections[i][keyToCompare] < logic[keyToCompare]) {
                        answer.push(allSections[i]);
                    } else {
                        invert.push(allSections[i]);
                    }
                    break;
                case "EQ":
                    if (allSections[i][keyToCompare] === logic[keyToCompare]) {
                        answer.push(allSections[i]);
                    } else {
                        invert.push(allSections[i]);
                    }
                    break;
            }
        }
        Log.trace("M COMP DONE");
        if (negate) {
            return invert;
        } else {
            return answer;
        }
    }

    // STRING COMPARISON (IS) HELPER
    private performSComp(filter: any, negate: boolean, id: string): any[] {
        Log.trace("PERFORM S COMP");
        // get the comparator
        const logic = filter[Object.keys(filter)[0]];
        const comparatorInfo = "\t\tCOMPARATOR: " + Object.keys(filter)[0];
        Log.trace(comparatorInfo);
        // is it empty? also can check if it's > 1
        const sizeOfLogic = "\t\tsize of logic: " + Object.keys(logic).length;
        Log.trace(sizeOfLogic);
        if (Object.keys(logic).length === 0) {
            Log.trace("\t\tIS is empty\n");
            throw new Error("IS is empty");
        }
        // the thing to compare
        const keyToCompare = Object.keys(logic)[0];
        Log.trace("\t\tkey to compare: " + keyToCompare);
        // is it valid?
        const valid = "\t\tis valid? " + this.isValidKey(keyToCompare);
        Log.trace(valid);
        if (!this.isValidKey(keyToCompare)) {
            Log.trace("\t\tinvalid key");
            throw new Error("invalid key");
        }
        // is the key to compare on a string?
        const numeric = "\t\tis string? " + !this.isNumericKey(keyToCompare);
        Log.trace(numeric);
        if (this.isNumericKey(keyToCompare)) {
            Log.trace("\t\tcan't compare numerical keys as strings");
            throw new Error("can't compare numerical keys as strings");
        }
        // is the actual value a string?
        const value = "\t\ttype of value? " + typeof logic[keyToCompare];
        Log.trace(value);
        if (typeof logic[keyToCompare] === "number") {
            Log.trace("\t\tcan't string compare numerical values");
            throw new Error("can't string compare numerical values");
        }
        // what else
        const comp = "\t\tCOMPARISON: " + keyToCompare + " " + Object.keys(filter)[0] + " " + logic[keyToCompare];
        // parse shit for real this time
        const fs = require("fs");
        const datasetString = fs.readFileSync("./datasets/" + id);
        Log.trace(datasetString);
        const data = JSON.parse(datasetString);
        // create answer arrays
        const answer: any[] = [];
        const invert: any[] = [];
        // const dataID = data.iid; // the id of the dataset
        const allSections = data.sections;
        // handle wildcards
        const split = logic[keyToCompare].split("*");
        for (let i = 0; i < split.length; i++) {
            if (split[i] === "") {
                split[i] = ".*";
            }
        }
        const wildcard = split.join("");
        // if there was a wildcard, use RegExp.test
        if (split.length > 1) {
            for (const section of allSections) {
                if (RegExp(wildcard).test(section[keyToCompare])) {
                    answer.push(section);
                } else {
                    invert.push(section);
                }
            }
        // if there wasn't a wildcard, use ===
        } else {
            for (const section of allSections) {
                if (logic[keyToCompare] === section[keyToCompare]) {
                    answer.push(section);
                } else {
                    invert.push(section);
                }
            }
        }
        if (negate) {
            return invert;
        } else {
            return answer;
        }
    }

    // NEGATION HELPER
    private performNeg(logic: any, id: string): any[] {
        Log.trace("PERFORM NEGATION");
        let negate: boolean = true;
        let current = logic[Object.keys(logic)[0]];
        // is it empty? also can check if it's > 1
        const sizeOfNot = "\t\tsize of NOT: " + Object.keys(current).length;
        Log.trace(sizeOfNot);
        if (Object.keys(current).length === 0) {
            Log.trace("\t\tNOT is empty\n");
            throw new Error("NOT is empty");
        }
        // count the # of NOTs
        Log.trace("\t\tcount NOTs");
        let notCounter = 1;
        while (Object.keys(current)[0] === "NOT") {
            notCounter++;
            const negationText = "\t\tNumber of NOTs: " + notCounter;
            Log.trace(negationText);
            current = current[Object.keys(logic)[0]];
        }
        if (!(notCounter % 2)) {
            negate = false;
        }
        return this.performWhere(current, negate, id);
    }

    // OPTIONS helper
    private performOptions(options: any, results: any[], id: string): any[] {
        Log.trace("PERFORM OPTIONS");
        // HANDLE COLUMNS
        Log.trace("\t HANDLING COLUMNS");
        const columns = options[Object.keys(options)[0]];
        // is it empty?
        const columnsLength = "\t\tsize of columns: " + Object.keys(columns).length;
        Log.trace(columnsLength);
        if (Object.keys(columns).length === 0) {
            Log.trace("\t\tCOLUMNS empty\n");
            throw new Error("COLUMNS empty");
        }
        // are all the keys in COLUMNS valid?
        for (const column of columns) {
            if (!this.isValidKey(column)) {
                Log.trace("\t\tinvalid key in COLUMNS");
                throw new Error("invalid key in COLUMNS");
            }
        }
        // filter out the unnecessary keys
        const allKeys: string[] = [id + "_dept", id + "_id", id + "_avg",
            id + "_instructor", id + "_title", id + "_pass",
            id + "_fail", id + "_audit", id + "_uuid"];
        const keysToRemove: string[] = [];
        for (const key of allKeys) {
            if (!columns.includes(key)) {
                keysToRemove.push(key);
            }
        }
        Log.trace("\t\tRemoving non-queried columns");
        for (const result of results) {
            for (const key of keysToRemove) {
                delete result[key];
            }
        }
        // HANDLING ORDER
        Log.trace("\t HANDLING ORDER");
        const orderBy = options["ORDER"];
        // check if orderBY is included in COLUMNS
        if (orderBy && !columns.includes(orderBy)) {
            Log.trace("\t\tORDER key is not included in COLUMNS");
            throw new Error("ORDER key is not included in COLUMNS");
        }
        // check if ORDER exists in query and orderBy is a number
        if (orderBy && this.isNumericKey(orderBy)) {
            results.sort(function (a, b) {
                return a[orderBy] - b[orderBy];
            });
        // check if ORDER exists in query orderBy is a string
        } else if (orderBy && !this.isNumericKey(orderBy)) {
            results.sort(function (a, b) {
                const stringA = a[orderBy].toLowerCase();
                const stringB = b[orderBy].toLowerCase();
                if (stringA < stringB) {
                    return -1;
                }
                if (stringA > stringB) {
                    return 1;
                }
                return 0;
            });
        }
        return results;
    }

    // valid key
    private isValidKey(key: string): boolean {
        const keyToValidate = key.substring(key.indexOf("_") + 1);
        let answer = false;
        const validKeys: string[] = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid"];
        for (const validKey of validKeys) {
            if (keyToValidate === validKey) {
                answer = true;
            }
        }
        return answer;
    }

    // numeric key
    private isNumericKey(key: string): boolean {
        const keyToValidate = key.substring(key.indexOf("_") + 1);
        let answer = false;
        const numericKeys: string[] = ["avg", "pass", "fail", "audit"];
        for (const numericKey of numericKeys) {
            if (keyToValidate === numericKey) {
                answer = true;
            }
        }
        return answer;
    }
}
