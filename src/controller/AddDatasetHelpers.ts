import Log from "../Util";
import {IDataset} from "./IDatasetFacade";
import {InsightDatasetKind, InsightResponse} from "./IInsightFacade";
import {find} from "tslint/lib/utils";

export class AddDatasetHelpers {

    constructor() {
        // Log.trace("constructor of AddDatasetHelpers");
    }

    public addRooms(id: string, content: string): Promise<InsightResponse> {
        const that = this;
        const parse5 = require("parse5");
        return new Promise(function (resolve, reject) {
            const answer: InsightResponse = {code: -1, body: null};
            const JSZip = require("jszip");
            JSZip.loadAsync(content, {base64: true}).then(function (zip: any) {
                // read the index.htm
                zip.file("index.htm").async("text").then(function (text: any) {
                    try {
                        Log.trace("inside the then of file.async");
                        const results: { [room: string]: any} = [];
                        const original = parse5.parse(text);
                        Log.trace("calling helper");
                        const tbody = that.findtBody(original.childNodes);
                        const length = "length of index.htm tBody: " + tbody.length;
                        Log.trace(length);
                        const objectsBoi = that.getBuildingInfo(tbody);
                        const length4 = "number of buildings: " + objectsBoi.length;
                        Log.trace(length4);
                        const promiseArray: any[] = [];
                        for (const element of objectsBoi) {
                            // const pathPieces = element.rlink.split("/");
                            const realPath = element.rlink.substring(2);
                            // Log.trace(realPath);
                            // const shortName = pathPieces[pathPieces.length - 1];
                            promiseArray.push(zip.file(realPath).async("string").then(function (data: any) {
                                const rawData = parse5.parse(data);
                                const tBodyBuilding = that.findtBody(rawData.childNodes);
                                const length2 = "length of building table: " + tBodyBuilding.length;
                                Log.trace(length2);
                                const rooms = that.getRoomsInfo(tBodyBuilding);
                                const length3 = "number of rooms in " + element.rshortname + ": " + rooms.length;
                                Log.trace(length3);
                                for (const key of rooms) {
                                    const room: { [key: string]: any } = {
                                        [id + "_fullname"]: element.rfullname,
                                        [id + "_shortname"]: element.rshortname,
                                        [id + "_number"]: key.rno,
                                        [id + "_name"]: element.rshortname + "_" + key.rno,
                                        [id + "_address"]: element.raddress,
                                        [id + "_lat"]: -1,
                                        [id + "_lon"]: -1,
                                        [id + "_seats"]: parseInt(key.seat, 10),
                                        [id + "_type"]: key.type,
                                        [id + "_furniture"]: key.furniture,
                                        [id + "_href"]: key.href,
                                    };
                                    results.push(room);
                                    const toPrint = room[id + "_fullname"] + ", " +
                                        room[id + "_shortname"] + ", " +
                                        room[id + "_number"] + ", " +
                                        room[id + "_name"] + ", " +
                                        room[id + "_address"] + ", " +
                                        room[id + "_lat"] + ", " +
                                        room[id + "_lon"] + ", " +
                                        room[id + "_seats"] + ", " +
                                        room[id + "_type"] + ", " +
                                        room[id + "_furniture"] + ", " +
                                        room[id + "_href"];
                                    // Log.trace("\t\t" + toPrint);
                                }
                                // Log.trace(length2);
                                // Log.trace("Length of building table " + shortName + " " + length2);
                            }).catch(function () {
                                Log.trace("could not read html file");
                            }));
                        }
                        Promise.all(promiseArray).then(function () {
                            Log.trace("all promises done");
                            Log.trace("SIZE OF END RESULT U KNOW WHAT IM SAYIN: " + results.length);
                            const final: IDataset = {
                                iid: id,
                                rows: results,
                                numRows: results.length,
                                iKind: InsightDatasetKind.Rooms,
                            };
                            const roomString = JSON.stringify(final);
                            if (results.length === 0) {
                                answer.code = 400;
                                answer.body = {error: "no valid sections"};
                                Log.error("400: no valid sections");
                                reject(answer);
                            } else {
                                const fs = require("fs");
                                fs.mkdir("./datasets", function () {
                                    // write the room to a file using a stream
                                    const logger = fs.createWriteStream("./datasets/" + id);
                                    logger.write(roomString);
                                    logger.end();
                                    answer.code = 204;
                                    answer.body = {result: "dataset successfully added"};
                                    resolve(answer);
                                });
                            }
                        }).catch();
                    } catch (error) {
                        Log.trace("big table error" + JSON.stringify(error));
                        // answer.code = 400;
                        // answer.body = {error: "no valid rooms"};
                        reject(answer);
                    }
                }).catch(function () {
                    Log.trace("could not read zip file");
                });
            });
        });
    }

    // public getRoomsInfo(tBody: any[]): any[] {
    //     const buildingObjects2: any[] = [];
    //     let rnumber;
    //     let rseat;
    //     let rtype;
    //     let rfurniture;
    //     let rhref;
    //     Log.trace("inside getRoomsInfo");
    //     for (const trElement of tBody) {
    //         if (trElement.nodeName === "tr") {
    //             for (const tdElement of trElement.childNodes) {
    //                 if (tdElement.nodeName === "td" && tdElement.attrs[0].name === "class") {
    //                     if (tdElement.attrs[0].value === "views-field views-field-field-room-number") {
    //                         for (const baby of tdElement.childNodes) {
    //                             if (baby.nodeName === "a") {
    //                                // rnumber = tdElement.childNodes[1].childNodes[0].value;
    //                                 rnumber = baby.childNodes[0].value.trim();
    //                             }
    //                         }
    //                         // Log.trace("room number: " + rnumber);
    //                     }
    //                     if (tdElement.attrs[0].value === "views-field views-field-field-room-capacity") {
    //                         rseat = tdElement.childNodes[0].value.trim();
    //                         // Log.trace("room capacity: " + rseat.toString());
    //                     }
    //                     if (tdElement.attrs[0].value === "views-field views-field-field-room-furniture") {
    //                         rfurniture = tdElement.childNodes[0].value.trim();
    //                         // Log.trace("room furniture: " + rfurniture);
    //                     }
    //                     if (tdElement.attrs[0].value === "views-field views-field-field-room-type") {
    //                         rtype = tdElement.childNodes[0].value.trim();
    //                         // Log.trace("room type: " + rtype);
    //                     }
    //                     if (tdElement.attrs[0].value === "views-field views-field-nothing") {
    //                         rhref = tdElement.childNodes[1].attrs[0].value;
    //                         // Log.trace("room href: " + rhref);
    //                     }
    //                 }
    //                 }
    //             if (rnumber && rseat && rtype && rfurniture && rhref) {
    //                 const answer: { [key: string]: any } = {
    //                     rno: rnumber,
    //                     seat: rseat,
    //                     type: rtype,
    //                     furniture: rfurniture,
    //                     href: rhref,
    //                  };
    //                 // Log.trace(answer.rno);
    //                 // Log.trace(answer.seat);
    //                 // Log.trace(answer.type);
    //                 // Log.trace(answer.furniture);
    //                 // Log.trace(answer.href);
    //                 buildingObjects2.push(answer);
    //             }
    //         }
    //     }
    //     return buildingObjects2;
    // }
    public getRoomsInfo(tBody: any[]): any[] {
        const buildingObjects2: any[] = [];
        let rnumber;
        let rseat;
        let rtype;
        let rfurniture;
        let rhref;
        // Log.trace("inside getRoomsInfo");
        for (const trElement of tBody) {
            if (trElement.nodeName === "tr") {
                for (const tdElement of trElement.childNodes) {
                    if (tdElement.nodeName === "td" && tdElement.attrs[0].name === "class") {
                        if (tdElement.attrs[0].value === "views-field views-field-field-room-number") {
                            for (const baby of tdElement.childNodes) {
                                if (baby.nodeName === "a") {
                                    // rnumber = tdElement.childNodes[1].childNodes[0].value;
                                    rnumber = baby.childNodes[0].value.trim();
                                }
                            }
                            // Log.trace("room number: " + rnumber);
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-field-room-capacity") {
                            rseat = tdElement.childNodes[0].value.trim();
                            // Log.trace("room capacity: " + rseat.toString());
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-field-room-furniture") {
                            rfurniture = tdElement.childNodes[0].value.trim();
                            // Log.trace("room furniture: " + rfurniture);
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-field-room-type") {
                            rtype = tdElement.childNodes[0].value.trim();
                            // Log.trace("room type: " + rtype);
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-nothing") {
                            rhref = tdElement.childNodes[1].attrs[0].value;
                            // Log.trace("room href: " + rhref);
                        }
                    }
                }
                if (rnumber && rseat && rfurniture && rhref) {
                    const answer: { [key: string]: any } = {
                        rno: rnumber,
                        seat: rseat,
                        type: rtype,
                        furniture: rfurniture,
                        href: rhref,
                    };
                    // Log.trace(answer.rno);
                    // Log.trace(answer.seat);
                    // Log.trace(answer.type);
                    // Log.trace(answer.furniture);
                    // Log.trace(answer.href);
                    buildingObjects2.push(answer);
                }
            }
        }
        return buildingObjects2;
    }

    public findtBody(thisNode: any[]): any[] {
        let tBodyObject: any[];
        // for each child node of the current node
        for (const bodyChildNode of thisNode) {
            // check if the current node has children
            if (bodyChildNode.childNodes !== undefined) {
                if (bodyChildNode.nodeName === "tbody") { // find the body node
                    // Log.trace("found tbody node");
                    tBodyObject = bodyChildNode.childNodes;
                    return tBodyObject;
                } else {
                    const x = this.findtBody(bodyChildNode.childNodes);
                    if (x) {
                        return x;
                    }
                }
            }
        }
        return tBodyObject;
    }

    public getBuildingInfo(tBodyObject: any[]): any[] {
        let shortName;
        let fullName;
        let address;
        let link;
        const buildingObjects: any[] = [];
        for (const trElement of tBodyObject) {
            if (trElement.nodeName === "tr") {
                for (const tdElement of trElement.childNodes) {
                    if (tdElement.nodeName === "td" && tdElement.attrs[0].name === "class") {
                        if (tdElement.attrs[0].value === "views-field views-field-title") {
                            if (tdElement.childNodes[1].attrs[0].name === "href") {
                                link = tdElement.childNodes[1].attrs[0].value;
                                //  Log.trace("href: " + link);
                            }
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-field-building-code") {
                            shortName = tdElement.childNodes[0].value.trim();
                            // Log.trace("shortname: " + shortName);
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-field-building-address") {
                            address = tdElement.childNodes[0].value.trim();
                            // Log.trace("address: " + address);
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-title") {
                            fullName = tdElement.childNodes[1].childNodes[0].value;
                            // Log.trace("fullname: " + fullName);
                        }
                    }
                }
                const answer: { [key: string]: any } = {
                    rshortname: shortName,
                    rfullname: fullName,
                    raddress: address,
                    rlink: link,
                };
                // Log.trace(answer.rshortname);
                // Log.trace(answer.rfullname);
                // Log.trace(answer.raddress);
                // Log.trace(answer.rlink);
                buildingObjects.push(answer);
            }
        }
        return buildingObjects;
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
                                        let year = parseInt(result.Year, 10);
                                        if (result.Section === "overall") {
                                            year = 1900;
                                        }
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
                                            [id + "_year"]: year,
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
                            rows: course,
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
