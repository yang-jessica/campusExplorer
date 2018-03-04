import Log from "../Util";
import {IDataset} from "./IDatasetFacade";
import {InsightDatasetKind, InsightResponse} from "./IInsightFacade";

export class AddDatasetHelpers {

    constructor() {/* construct */}

    public addRooms(id: string, content: string): Promise<InsightResponse> {
        const that = this;
        return new Promise(function (resolve, reject) {
            const parse5 = require("parse5");
            const JSZip = require("jszip");
            JSZip.loadAsync(content, {base64: true}).then(function (zip: any) {
                // read the index.htm
                zip.file("index.htm").async("text").then(function (text: any) {
                    try {
                        const results: { [room: string]: any } = [];
                        const original = parse5.parse(text);
                        const promiseArray: any[] = [];
                        // find the tBody object
                        const tbody = that.findtBody(original.childNodes);
                        // find the building info
                        that.getBuildingInfo(tbody).then(function (objectsBoi) {
                            // for each building
                            for (const element of objectsBoi) {
                                const realPath = element.link.substring(2);
                                promiseArray.push(zip.file(realPath).async("string").then(function (data: any) {
                                    const rawData = parse5.parse(data);
                                    const tBodyBuilding = that.findtBody(rawData.childNodes);
                                    // get the individual rooms
                                    const rooms = that.getRoomsInfo(tBodyBuilding);
                                    for (const key of rooms) {
                                        const room: { [key: string]: any } = {
                                            [id + "_fullname"]: element.fullname,
                                            [id + "_shortname"]: element.shortname,
                                            [id + "_number"]: key.rno,
                                            [id + "_name"]: element.shortname + "_" + key.rno,
                                            [id + "_address"]: element.address,
                                            [id + "_lat"]: element.lat,
                                            [id + "_lon"]: element.lon,
                                            [id + "_seats"]: parseInt(key.seat, 10),
                                            [id + "_type"]: key.type,
                                            [id + "_furniture"]: key.furniture,
                                            [id + "_href"]: key.href,
                                        };
                                        results.push(room);
                                    }
                                }).catch(function () {/* something */}));
                                Promise.all(promiseArray)
                                    .then(function () {
                                        const final: IDataset = {
                                            iid: id,
                                            rows: results,
                                            numRows: results.length,
                                            iKind: InsightDatasetKind.Rooms,
                                        };
                                        const roomString = JSON.stringify(final);
                                        if (results.length === 0) {
                                            Log.error("no valid rows");
                                            reject({code: 400, body: {error: "no valid rows"}});
                                        } else {
                                            const fs = require("fs");
                                            fs.mkdir("./datasets", function () {
                                                // write the room to a file using a stream
                                                const logger = fs.createWriteStream("./datasets/" + id);
                                                logger.write(roomString);
                                                logger.end();
                                                resolve({code: 204, body: {result: "dataset successfully added"}});
                                            });
                                        }
                                    })
                                    .catch();
                            }
                        }).catch();
                    } catch (error) {
                        reject({code: 400, body: {error: "no valid rooms"}});
                    }
                }).catch(() => reject({code: 400, body: {error: "file.async error"}}));
            }).catch(() => reject({code: 400, body: {error: "could not read zip file"}}));
        });
    }

    public getGeo(address: string): Promise<any> {
        return new Promise(function (resolve, reject) {
            const http = require("http");
            const link = "http://skaha.cs.ubc.ca:11316/api/v1/team17/" + encodeURIComponent(address);
            const geo = {lat: -1, lon: -1};
            try {
                // make request
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
                        res.resume();
                        return;
                    }
                    // get server response
                    res.setEncoding("utf8");
                    let rawData = "";
                    res.on("data", (chunk: any) => {
                        rawData += chunk;
                    });
                    res.on("end", () => {
                        try {
                            const geoResult = JSON.parse(rawData);
                            if (geoResult.error) {
                                Log.error("400: got an error from the server");
                                throw new Error("got error from geolocation server");
                            } else {
                                // extract lat/lon
                                geo.lat = geoResult.lat;
                                geo.lon = geoResult.lon;
                                resolve(geo);
                            }
                        } catch (e) {
                            Log.trace(e.message);
                        }
                    });
                });
            } catch {reject(); }
        });
    }

    public getRoomsInfo(tBody: any[]): any[] {
        const roomInfo: any[] = [];
        let rnumber;
        let rseat;
        let rtype;
        let rfurniture;
        let rhref;
        for (const trElement of tBody) {
            if (trElement.nodeName === "tr") {
                for (const tdElement of trElement.childNodes) {
                    if (tdElement.nodeName === "td" && tdElement.attrs[0].name === "class") {
                        if (tdElement.attrs[0].value === "views-field views-field-field-room-number") {
                            for (const baby of tdElement.childNodes) {
                                if (baby.nodeName === "a") {
                                    rnumber = baby.childNodes[0].value.trim();
                                }
                            }
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-field-room-capacity") {
                            rseat = tdElement.childNodes[0].value.trim();
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-field-room-furniture") {
                            rfurniture = tdElement.childNodes[0].value.trim();
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-field-room-type") {
                            rtype = tdElement.childNodes[0].value.trim();
                        }
                        if (tdElement.attrs[0].value === "views-field views-field-nothing") {
                            rhref = tdElement.childNodes[1].attrs[0].value;
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
                    roomInfo.push(answer);
                }
            }
        }
        return roomInfo;
    }

    public findtBody(thisNode: any[]): any[] {
        let tBodyObject: any[];
        // for each child node of the current node
        for (const bodyChildNode of thisNode) {
            // check if the current node has children
            if (bodyChildNode.childNodes !== undefined) {
                if (bodyChildNode.nodeName === "tbody") { // find the body node
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

    public getBuildingInfo(tBodyObject: any[]): Promise<any[]> {
        const that = this;
        return new Promise(function (resolve, reject) {
            const promiseArray: any[] = [];
            const buildingObjects: any[] = [];
            for (const trElement of tBodyObject) {
                if (trElement.nodeName === "tr") {
                    let bShortName: string;
                    let bFullName: string;
                    let bAddress: string;
                    let bLink: string;
                    for (const tdElement of trElement.childNodes) {
                        if (tdElement.nodeName === "td" && tdElement.attrs[0].name === "class") {
                            if (tdElement.attrs[0].value === "views-field views-field-title") {
                                if (tdElement.childNodes[1].attrs[0].name === "href") {
                                    bLink = tdElement.childNodes[1].attrs[0].value;
                                }
                            }
                            if (tdElement.attrs[0].value === "views-field views-field-field-building-code") {
                                bShortName = tdElement.childNodes[0].value.trim();
                            }
                            if (tdElement.attrs[0].value === "views-field views-field-field-building-address") {
                                bAddress = tdElement.childNodes[0].value.trim();
                            }
                            if (tdElement.attrs[0].value === "views-field views-field-title") {
                                bFullName = tdElement.childNodes[1].childNodes[0].value;
                            }
                        }
                    }
                    promiseArray.push(that.getGeo(bAddress).then(function (geo) {
                        const answer: { [key: string]: any } = {
                            shortname: bShortName,
                            fullname: bFullName,
                            address: bAddress,
                            link: bLink,
                            lat: geo.lat,
                            lon: geo.lon,
                        };
                        buildingObjects.push(answer);
                    }).catch());
                }
            }
            Promise.all(promiseArray).then(function () {
                resolve(buildingObjects);
            });
        });
    }

    // helper for adding course dataset
    public addCourse(id: string, content: string): Promise<InsightResponse> {
        return new Promise(function (resolve, reject) {
            const answer: InsightResponse = {code: -1, body: null};
            const JSZip = require("jszip");
            JSZip.loadAsync(content, {base64: true})
                .then(function (zip: any) {
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
                                    } catch { /* error parsing a single result */}
                                }
                            } catch { /* error parsing a file */ }
                        }));
                    });
                    Promise.all(promiseArray).then(function () {
                        const final: IDataset = {
                            iid: id,
                            rows: course,
                            numRows: course.length,
                            iKind: InsightDatasetKind.Courses,
                        };
                        const courseString = JSON.stringify(final);
                        // if no valid rows returned, do not add
                        if (course.length === 0) {
                            reject ({code: 400, body: {error: "no valid rows"}});
                        } else {
                            const fs = require("fs");
                            fs.mkdir("./datasets", function () {
                                // write the course to a file using a stream
                                const logger = fs.createWriteStream("./datasets/" + id);
                                logger.write(courseString);
                                logger.end();
                                resolve({code: 204, body: {result: "dataset successfully added"}});
                            });
                        }
                    }).catch(/* promise.All */);
                })
                // loadAsync cannot read content the content, so error code 400
                .catch(() => reject({code: 400, body: {error: "cannot read base64 content"}}));
            return answer;
        });
    }
}
