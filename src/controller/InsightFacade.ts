import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightResponse} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 */
export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<InsightResponse> {
        return Promise.reject({code: -1, body: null});
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return Promise.reject({code: -1, body: null});
    }

    public performQuery(query: any): Promise <InsightResponse> {
        return Promise.reject({code: -1, body: null});
    }

    public listDatasets(): Promise<InsightResponse> {
        return Promise.reject({code: -1, body: null});
    }
}
