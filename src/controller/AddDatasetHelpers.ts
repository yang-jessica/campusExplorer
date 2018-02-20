import Log from "../Util";
import {IDataset} from "./IDatasetFacade";
import {InsightDatasetKind, InsightResponse} from "./IInsightFacade";

export class AddDatasetHelpers {

    constructor () {
        // Log.trace("constructor of AddDatasetHelpers");
    }

    // helper for adding course dataset
    public addCourse(id: string, content: string): Promise<InsightResponse> {
        return new Promise(function (resolve, reject) {
            const answer: InsightResponse = {code: -1, body: null};
            const JSZip = require("jszip");
            JSZip.loadAsync(content, {base64: true})
                .then(/*loadAsync fulfills here*/function (zip: any) {
                    Log.trace("loadAsync THEN");
                    const promiseArray: any[] = [];
                    const course: { [section: string]: any } = [];
                    // for each file in the folder named 'courses', do stuff
                    zip.folder("courses").forEach(function (relativePath: string, file: any) {
                        // convert compressed file in 'courses' to text
                        promiseArray.push(file.async("text").then(function (text: any) {
                            try {
                                // JSON.parse the text returned from file.async
                                const original = JSON.parse(text);
                                // for each section in the result array, parse into our own JSON
                                for (const result of original.result) {
                                    try {
                                        const section: { [key: string]: any } = {
                                            [id + "_dept"]: result.Subject,
                                            [id + "_id"]: result.Course,
                                            [id + "_avg"]: result.Avg,
                                            [id + "_instructor"]: result.Professor,
                                            [id + "_title"]: result.Title,
                                            [id + "_pass"]: result.Pass,
                                            [id + "_fail"]: result.Fail,
                                            [id + "_audit"]: result.Audit,
                                            [id + "_uuid"]: result.id.toString(),
                                        };
                                        course.push(section);
                                    } catch {
                                        // const cat: string = "error parsing result[" + i + "]";
                                        // Log.trace(cat);
                                    }
                                }
                            } catch {
                                // const errorParse: string = "error parsing " + file.name;
                                // Log.trace(errorParse);
                            }
                        }));
                        // const msg: string = "loop of " + file.name + " finished";
                        // Log.trace(msg);
                    });
                    Promise.all(promiseArray).then(function () {
                        const final: IDataset = {
                            iid: id,
                            sections: course,
                            numRows: course.length,
                            iKind: InsightDatasetKind.Courses,
                        };
                        const courseString = JSON.stringify(final);
                        if (course.length === 0) {
                            answer.code = 400;
                            answer.body = {error: "no valid sections"};
                            Log.error("400: no valid sections");
                            reject(answer);
                        } else {
                            const fs = require("fs");
                            fs.mkdir("./datasets", function () {
                                // write the course to a file using a stream
                                const logger = fs.createWriteStream("./datasets/" + id);
                                logger.write(courseString);
                                logger.end();
                                answer.code = 204;
                                answer.body = {result: "dataset successfully added"};
                                resolve(answer);
                            });
                        }
                    }).catch(/* promise.All */);
                })
                .catch(/*loadAsync rejects here*/function () {
                    // loadAsync cannot read content the content, so error code 400
                    answer.code = 400;
                    answer.body = {error: "Cannot read base64 content"};
                    reject(answer);
                });
            return answer;
        });
    }
}
