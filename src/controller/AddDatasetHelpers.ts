import Log from "../Util";
import {IDataset} from "./IDatasetFacade";
import {InsightDatasetKind, InsightResponse} from "./IInsightFacade";

export class AddDatasetHelpers {

    constructor() {/* construct */}

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
                        const results: { [room: string]: any } = [];
                        const original = parse5.parse(text);
                        Log.trace("calling helper");
                        const tbody = that.findtBody(original.childNodes);
                        const objectsBoi = that.getBuildingInfo(tbody);
                        const promiseArray: any[] = [];
                        const geoPromiseArray: any[] = [];
                        for (const element of objectsBoi) {
                            geoPromiseArray.push(that.getGeo(element.raddress)
                                .then(function (geo) {
                                    const realPath = element.rlink.substring(2);
                                    promiseArray.push(zip.file(realPath).async("string")
                                        .then(function (data: any) {
                                            const rawData = parse5.parse(data);
                                            const tBodyBuilding = that.findtBody(rawData.childNodes);
                                            const rooms = that.getRoomsInfo(tBodyBuilding);
                                            for (const key of rooms) {
                                                // Log.trace("lat: " + geo.lat + ", lon: " + geo.lon);
                                                const room: { [key: string]: any } = {
                                                    [id + "_fullname"]: element.rfullname,
                                                    [id + "_shortname"]: element.rshortname,
                                                    [id + "_number"]: key.rno,
                                                    [id + "_name"]: element.rshortname + "_" + key.rno,
                                                    [id + "_address"]: element.raddress,
                                                    [id + "_lat"]: geo.lat,
                                                    [id + "_lon"]: geo.lon,
                                                    [id + "_seats"]: parseInt(key.seat, 10),
                                                    [id + "_type"]: key.type,
                                                    [id + "_furniture"]: key.furniture,
                                                    [id + "_href"]: key.href,
                                                };
                                                results.push(room);
                                                // const toPrint = room[id + "_fullname"] + ", " +
                                                //     room[id + "_shortname"] + ", " +
                                                //     room[id + "_number"] + ", " +
                                                //     room[id + "_name"] + ", " +
                                                //     room[id + "_address"] + ", " +
                                                //     room[id + "_lat"] + ", " +
                                                //     room[id + "_lon"] + ", " +
                                                //     room[id + "_seats"] + ", " +
                                                //     room[id + "_type"] + ", " +
                                                //     room[id + "_furniture"] + ", " +
                                                //     room[id + "_href"];
                                                // Log.trace(toPrint);
                                            }
                                        })
                                        .catch(function () {
                                            // Log.trace("could not read html file");
                                        }));
                                    Promise.all(promiseArray)
                                        .then(function () {
                                            // Log.trace("all promises done");
                                            // Log.trace("SIZE OF END RESULT: " + results.length);
                                            const final: IDataset = {
                                                iid: id,
                                                rows: results,
                                                numRows: results.length,
                                                iKind: InsightDatasetKind.Rooms,
                                            };
                                            const roomString = JSON.stringify(final);
                                            if (results.length === 0) {
                                                answer.code = 400;
                                                answer.body = {error: "no valid rows"};
                                                Log.error("400: no valid rows");
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
                                        })
                                        .catch();
                                }) // here
                                .catch(() => Log.trace("getGeo .catch caught"))); // getGeo
                            Promise.all(geoPromiseArray)
                                .then(() => Log.trace("geopromise array all then"))
                                .catch(() => Log.trace("geopromise array all catch"));
                        }
                    } catch (error) {
                        reject({code: 400, body: {error: "no valid rooms"}});
                    }
                }).catch(function () {
                    reject({code: 400, body: {error: "file.async error"}});
                });
            }).catch(function () {
                reject({code: 400, body: {error: "could not read zip file"}});
            });
        });
    }

    public getGeo(address: string): Promise<any> {
        return new Promise(function (resolve, reject) {
            const http = require("http");
            const link = "http://skaha.cs.ubc.ca:11316/api/v1/team17/" + encodeURIComponent(address);
            // Log.trace(link);
            const geo = {lat: -1, lon: -1};
            try {
                http.get(link, function (res: any) {
                    const {statusCode} = res;
                    const contentType = res.headers["content-type"];
                    let error;
                    if (statusCode !== 200) {
                        error = new Error("request failed");
                    } else if (!/^application\/json/.test(contentType)) {
                        error = new Error("application/json problem");
                    }
                    if (error) {
                        Log.trace(error.message);
                        res.resume();
                        return;
                    }

                    res.setEncoding("utf8");
                    let rawData = "";
                    res.on("data", (chunk: any) => {
                        rawData += chunk;
                    });
                    res.on("end", () => {
                        try {
                            const geoResult = JSON.parse(rawData);
                            if (geoResult.error) {
                                Log.trace("400: got an error from the server");
                                throw new Error("got error from geolocation server");
                            } else {
                                // Log.trace(link + ": " + "lat: " + geoResult.lat + ", lon: " + geoResult.lon);
                                geo.lat = geoResult.lat;
                                geo.lon = geoResult.lon;
                            }
                        } catch (e) {
                            Log.trace(e.message);
                        }
                    });
                });
                resolve(geo);
            } catch {
                reject();
            }
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
