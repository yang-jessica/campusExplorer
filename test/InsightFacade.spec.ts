import { expect } from "chai";

import { InsightDatasetKind, InsightResponse, InsightResponseSuccessBody } from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the JSON schema described in test/query.schema.json
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    response: InsightResponse;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        badcourses:   "./test/data/badcourses.zip",
        badfolder:    "./test/data/badfolder.zip",
        badformat:    "./test/data/badformat.zip",
        barejson:     "./test/data/barejson.zip",
        commerce:     "./test/data/commerce.zip",
        courses:      "./test/data/courses.zip",
        emptyresult:  "./test/data/emptyresult.zip",
        emptyzip:     "./test/data/emptyzip.zip",
        jsonbracket:  "./test/data/jsonbracket.zip",
        jsonspelling: "./test/data/jsonspelling.zip",
        jsontype:     "./test/data/jsontype.zip",
        jsonwithnot:  "./test/data/jsonwithnot.zip",
        notjson:      "./test/data/notjson.zip",
        notzip:       "./test/data/notzip.jpg",
        onecourse:    "./test/data/onecourse.zip",
        onegoodcrs:   "./test/data/onegoodcrs.zip",
        onegoodsec:   "./test/data/onegoodsec.zip",
        onesection:   "./test/data/onesection.zip",
        twocourse:    "./test/data/twocourse.zip",
        twosection:   "./test/data/twosection.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return { [Object.keys(datasetsToLoad)[i]]: buf.toString("base64") };
            });
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // add a valid dataset, expect success with code 204
    it("Should add a valid dataset", async () => {
        const id: string = "courses";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // add valid dataset with 1 course with many sections, expect success with code 204
    it("Should add dataset with 1 course, many sections", async () => {
        const id: string = "onecourse";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // add valid dataset with 1 course with 1 section, expect success with code 204
    it("Should add dataset with 1 course, 1 section", async () => {
        const id: string = "onesection";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // add valid dataset with 1 course with 2 sections, expect success with code 204
    it("Should add dataset with 1 course, 2 sections", async () => {
        const id: string = "twosection";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // add valid dataset with 2 courses, expect success with code 204
    it("Should add dataset with 2 courses", async () => {
        const id: string = "twocourse";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // add a pre-existing dataset, expect failure with code 400
    it("Should not add a valid pre-existing dataset", async () => {
        const id: string = "commerce";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses); // 204 code
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses); // again, 400 code
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // add two valid datasets, expect success code 204 twice
    it("Should add two valid datasets", async () => {
        const id1: string = "courses";
        const id2: string = "commerce";
        const expectedCode: number = 204;
        let response1: InsightResponse;
        let response2: InsightResponse;

        try {
            await insightFacade.removeDataset(id1); // remove "courses"
            await insightFacade.removeDataset(id2); // remove "commerce"
            response1 = await insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses); // + "courses"
            response2 = await insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses); // + "commerce"
            await insightFacade.removeDataset(id1); // remove "courses"
            await insightFacade.removeDataset(id2); // remove "commerce"
        } catch (err) {
            response1 = err;
            response2 = err;
        } finally {
            expect(response1.code).to.equal(expectedCode);
            expect(response2.code).to.equal(expectedCode);
        }
    });

    // should add a course with 1 complete section and 1 messed up, expect success code 204
    it("Should add dataset with 1 good section, 1 missing elements", async () => {
        const id: string = "onegoodsec";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // should add dataset with 1 good course, 1 bad format, expect success code 204
    it("Should add dataset with 1 good course, 1 bad", async () => {
        const id: string = "onegoodcrs";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // should add dataset with 1 course and 1 random file type, expect success code 204
    it("Should add valid dataset with random other file", async () => {
        const id: string = "jsonwithnot";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    //  add a jpg file, expect failure code 400
    it("Should not add a non-zip file", async () => {
        const id: string = "notzip";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    // add a non-existent dataset, expect failure code 400
    // unsure whether this test is valid as "psychology" id is not pre-loaded
    it("Should not add a non-existent dataset", async () => {
        const id: string = "psychology";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    //  add a zip file containing a bare JSON file, expect failure code 400
    it("Should not add a bare json file", async () => {
        const id: string = "barejson";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    //  add undefined, expect failure code 400
    it("Should not add undefined", async () => {
        const id: string = undefined;
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    //  add undefined, expect failure code 400
    it("Should not add null", async () => {
        const id: string = null;
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    //  add zip with folder not named "courses", expect failure code 400
    it("Should not add bad folder name", async () => {
        const id: string = "badfolder";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    //  add zip with file  named "courses" but not a folder, expect failure code 400
    it("Should not add courses that isn't a folder", async () => {
        const id: string = "badcourses";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    // add an empty zip file, expect failure code 400
    it("Should not add an empty dataset", async () => {
        const id: string = "emptyzip";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    // add dataset with empty result, expect failure code 400
    it("Should not add course with no sections", async () => {
        const id: string = "emptyresult";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    // add dataset containing .sql file, expect failure code 400
    it("Should not add course with only non-json files", async () => {
        const id: string = "notjson";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    // add JSON with wrong types, expect failure code 400
    // ie. expect type string but got number
    // TODO not sure if this test is any good
/*    it("Should not add JSON with wrong types", async () => {
        const id: string = "jsontype";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });*/

    // add JSON with poor spelling, expect failure code 400
    it("Should not add misspelled JSON", async () => {
        const id: string = "jsonspelling";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    // add JSON missing a bracket, expect failure code 400
    it("Should not add JSON with missing bracket", async () => {
        const id: string = "jsonbracket";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });

    // add one dataset with malformed JSON, expect failure code 400
    it("Should not add malformed dataset", async () => {
        const id: string = "badformat";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("error");
        }
    });
    // TODO: listdataset tests
    it("Should print the added datasets", async () => {
        const id: string = "onecourse";
        const expectedCode: number = 204;
        const expectedCode2: number = 200;
        let response: InsightResponse;
        let response2: InsightResponse;
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            response2 = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
            response2 = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response2.code).to.equal(expectedCode2);
        }
    });
    // hi
    it("Should print no datasets", async () => {
        const expectedCode: number = 200;
        let response: InsightResponse;
        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });
    // remove a file added in an earlier test, expect success code 204
    it("Should remove the onecourse dataset", async () => {
        const id: string = "onecourse";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // add, then remove a file, expect success code 204
    it("Should remove the commerce dataset", async () => {
        const id: string = "commerce";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // remove but misspell file name, expect failure code 404
    it("Shouldn't remove the comerce dataset since it is spelled wrong", async () => {
        const id: string = "commerce";
        const expectedCode: number = 404;
        let response: InsightResponse;

        try {
            await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            response = await insightFacade.removeDataset("comerce");
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // remove a file that hasn't been added, expect failure code 404
    it("Shouldn't remove the courses dataset since it has not been added", async () => {
        const id: string = "courses";
        const expectedCode: number = 404;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // remove a file that hasn't been added, expect failure code 404
    it("Shouldn't remove undefined", async () => {
        const id: string = undefined;
        const expectedCode: number = 404;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });
});

describe("InsightFacade List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        onecourse: "./test/data/onecourse.zip",
        onesection: "./test/data/onesection.zip",
        twocourse: "./test/data/twocourse.zip",
        twosection: "./test/data/twosection.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

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
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // list the added datasets, there are 3
    it("Should list datasets", async () => {
        const id1: string = "onecourse";
        const id2: string = "onesection";
        const id3: string = "twosection";
        const expectedCode: number = 200;
        let response: InsightResponse;
        // let responseBody: InsightResponseSuccessBody;

        try {
            await insightFacade.removeDataset(id1);
            await insightFacade.removeDataset(id2);
            await insightFacade.removeDataset(id3);
            await insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
            await insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
            await insightFacade.addDataset(id3, datasets[id3], InsightDatasetKind.Courses);
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("result");
            expect(response.body);
            // expect(response.body.result).to.have.length(3);
        }
    });
});
// This test suite dynamically generates tests from the JSON files in test/queries.
// You should not need to modify it; instead, add additional files to the queries directory.
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Create a new instance of InsightFacade, read in the test queries from test/queries and
    // add the datasets specified in datasetsToQuery.
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = await TestUtil.readTestQueries();
            expect(testQueries).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Fail if there is a problem reading ANY dataset.
        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToQuery)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return { [Object.keys(datasetsToQuery)[i]]: buf.toString("base64") };
            });
            expect(loadedDatasets).to.have.length.greaterThan(0);

            const responsePromises: Array<Promise<InsightResponse>> = [];
            const datasets: { [id: string]: string } = Object.assign({}, ...loadedDatasets);
            for (const [id, content] of Object.entries(datasets)) {
                responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Courses));
            }

            // This try/catch is a hack to let your dynamic tests execute enough the addDataset method fails.
            // In D1, you should remove this try/catch to ensure your datasets load successfully before trying
            // to run you queries.
            try {
                const responses: InsightResponse[] = await Promise.all(responsePromises);
                responses.forEach((response) => expect(response.code).to.equal(204));
            } catch (err) {
                Log.warn(`Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`);
            }
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    it("Should run test queries", () => {
        describe("Dynamic InsightFacade PerformQuery tests", () => {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, async () => {
                    let response: InsightResponse;

                    try {
                        response = await insightFacade.performQuery(test.query);
                    } catch (err) {
                        response = err;
                    } finally {
                        expect(response.code).to.equal(test.response.code);

                        if (test.response.code >= 400) {
                            expect(response.body).to.have.property("error");
                        } else {
                            expect(response.body).to.have.property("result");
                            const expectedResult = (test.response.body as InsightResponseSuccessBody).result;
                            const actualResult = (response.body as InsightResponseSuccessBody).result;
                            expect(actualResult).to.deep.equal(expectedResult);
                        }
                    }
                });
            }
        });
    });
});
