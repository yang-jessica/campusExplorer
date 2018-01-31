import {InsightDatasetKind} from "./IInsightFacade";

export interface IDataset {
    iid: string;
    sections: { [section: string]: any };
    numRows: number;
    iKind: InsightDatasetKind;
}
