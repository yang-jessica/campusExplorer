import Server from "../src/rest/Server";
import Log from "../src/Util";
import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import {expect} from "chai";
import Response = ChaiHttp.Response;

import chaiHttp = require("chai-http");
import {InsightDataset, InsightDatasetKind} from "../src/controller/IInsightFacade";
import TestUtil from "./TestUtil";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);

    before(async function () {
        facade = new InsightFacade();
        server = new Server(4321);
        // TODO: start server here once and handle errors properly
        let result = await server.start();
        if (result === true) {
            Log.trace("server on");
        }
    });

    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        rooms: "./test/data/rooms.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    after(async function () {
        let result = await server.stop();
        if (result === true) {
            Log.trace("server stop");
        }
        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return {[Object.keys(datasetsToLoad)[i]]: buf.toString("base64")};
            });
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
            insightFacade = new InsightFacade();

            const courses: string = "courses";
            const rooms: string = "rooms";
            // await insightFacade.addDataset(courses, datasets[courses], InsightDatasetKind.Courses);
            await insightFacade.addDataset(rooms, datasets[rooms], InsightDatasetKind.Rooms);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    // TODO: read your courses and rooms datasets here once!

    // Hint on how to test PUT requests
    let fs = require("fs");
    it("DEL test for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/courses").then(function (res: Response) {
                    // some logging here please!
                    Log.trace("res: " + JSON.stringify(res));
                    Log.trace("res body: " + JSON.stringify(res.body));
                    Log.trace("res status: " + res.status);
                    expect(res.status).to.be.equal(204);
                }).catch(function (err: any) {
                    // some logging here please!
                    Log.trace("The error: " + err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("The error2: " + err);
            expect.fail();
        }
    });
    it("PUT test for courses dataset", function () {
        try {
            let data = fs.readFileSync("./test/data/courses.zip");
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", data, "courses.zip")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("res: " + JSON.stringify(res));
                    Log.trace("res body: " + JSON.stringify(res.body));
                    Log.trace("res status: " + res.status);
                    expect(res.status).to.be.equal(204);
                }).catch(function (err: Response) {
                    // some logging here please!
                    Log.trace("The error: " + err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("The error2: " + err);
            expect.fail();
        }
    });
    it("PUT test for adding courses dataset twice", function () {
        try {
            let data = fs.readFileSync("./test/data/courses.zip");
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", data, "courses.zip")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("res: " + JSON.stringify(res));
                    Log.trace("res body: " + JSON.stringify(res.body));
                    Log.trace("res status: " + res.status);
                    expect.fail();
                }).catch(function (res: Response) {
                    // some logging here pleasee
                    expect(res.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("The error2: " + err);
            expect.fail();
        }
    });
    it("PUT test for rooms dataset", function () {
        try {
            Log.trace("rooms test");
            let data = fs.readFileSync("./test/data/rooms.zip");
            return chai.request("http://localhost:4321")
                .put("/dataset/rooms/rooms")
                .attach("body", data, "rooms.zip")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("res: " + JSON.stringify(res));
                    Log.trace("res body: " + JSON.stringify(res.body));
                    Log.trace("res status: " + res.status);
                    expect(res.status).to.be.equal(204);
                }).catch(function (err: Response) {
                    // some logging here please!
                    Log.trace("The error: " + err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("The error2: " + err);
            expect.fail();
        }
    });
    it("POST test for courses dataset", function () {
        try {
            let query = {WHERE: {EQ: {courses_avg: 99.19}},
                OPTIONS: {COLUMNS: ["courses_dept", "courses_avg"], ORDER: "courses_avg"}};
            let result = {result: [{courses_dept: "cnps", courses_avg: 99.19}]};
            // let result = {"result":[{"courses_dept":"cnps","courses_avg":99.19}]};
            return chai.request("http://localhost:4321")
                .post("/query").send(query)
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("res: " + JSON.stringify(res));
                    Log.trace("res body: " + JSON.stringify(res.body));
                    Log.trace("res status: " + res.status);
                    expect(res.status).to.be.equal(200);
                    expect(res.body).to.deep.equal(result);
                }).catch(function (err: Response) {
                    // some logging here please!
                    Log.trace("The error: " + err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("The error2: " + err);
            expect.fail();
        }
    });
    it("POST test with bad query", function () {
        try {
            let query = {WHERE: {EQ: {courses_avg: "99.19"}},
                OPTIONS: {COLUMNS: ["courses_dept", "courses_avg"], ORDER: "courses_avg"}};
            // let result = {"result":[{"courses_dept":"cnps","courses_avg":99.19}]};
            return chai.request("http://localhost:4321")
                .post("/query").send(query)
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("res: " + JSON.stringify(res));
                    Log.trace("res body: " + JSON.stringify(res.body));
                    Log.trace("res status: " + res.status);
                    expect.fail();
                }).catch(function (err: Response) {
                    // some logging here please!
                    Log.trace("The error: " + err);
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("The error2: " + err);
            expect.fail();
        }
    });
    it("GET test for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/datasets").then(function (res: Response) {
                    // some logging here please!
                    Log.trace("res: " + JSON.stringify(res));
                    Log.trace("res body: " + JSON.stringify(res.body));
                    Log.trace("res status: " + res.status);
                    expect(res.status).to.be.equal(200);
                }).catch(function (err: Response) {
                    // some logging here please!
                    Log.trace("The error: " + err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("The error2: " + err);
            expect.fail();
        }
    });
    it("DEL test for rooms dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/rooms").then(function (res: Response) {
                    // some logging here please!
                    Log.trace("res: " + JSON.stringify(res));
                    Log.trace("res body: " + JSON.stringify(res.body));
                    Log.trace("res status: " + res.status);
                    expect(res.status).to.be.equal(204);
                }).catch(function (err: Response) {
                    // some logging here please!
                    Log.trace("The error: " + err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("The error2: " + err);
            expect.fail();
        }
    });
    it("DEL test for removing dataset that does not exist", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/rooms").then(function (res: Response) {
                    // some logging here please!
                    Log.trace("res: " + JSON.stringify(res));
                    Log.trace("res body: " + JSON.stringify(res.body));
                    Log.trace("res status: " + res.status);
                    expect.fail();
                }).catch(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(404);
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("The error2: " + err);
            expect.fail();
        }
    });
    // it("GET test for Server.echo", function () {
    //     try {
    //         return chai.request("http://localhost:4321")
    //             .get("/echo/hello")
    //             .then(function (res: Response) {
    //                 // some logging here please!
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function (err: Response) {
    //                 // some logging here please!
    //                 Log.trace("The error: " + err);
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         // and some more logging here!
    //         Log.trace("The error2: " + err);
    //         expect.fail();
    //     }
    // });
    it("GET test for Server.getStatic", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/index.html")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err: Response) {
                    // some logging here please!
                    Log.trace("The error: " + err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("The error2: " + err);
            expect.fail();
        }
    });
    // it("GET test for bad Server.getStatic", function () {
    //     try {
    //         return chai.request("http://localhost:4321")
    //             .get("/index.html")
    //             .then(function (res: Response) {
    //                 // some logging here please!
    //                 expect(res.status).to.be.equal(400);
    //             })
    //             .catch(function (err: Response) {
    //                 // some logging here please!
    //                 Log.trace("The error: " + err);
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         // and some more logging here!
    //         Log.trace("The error2: " + err);
    //         expect.fail();
    //     }
    // });

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
