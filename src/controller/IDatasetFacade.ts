import {InsightDatasetKind} from "./IInsightFacade";

export interface IDataset {
    iid: string;
    sections: { [section: string]: any };
    numRows: number;
    iKind: InsightDatasetKind;
}

export enum CourseKeys {
    Dept = "dept",
    Id = "id",
    Avg = "avg",
    Instructor = "instructor",
    Title = "title",
    Pass = "pass",
    Fail = "fail",
    Audit = "audit",
    Uuid = "uuid",
    // Year = "year",
}

/*
export enum RoomKeys {
    FullName = "fullname",
    ShortName = "shortname",
    Number = "number",
    Name = "name",
    Address = "address",
    Lat = "lat",
    Lon = "lon",
    Seats = "seats",
    Type = "type",
    Furniture = "furniture",
    Href = "href",
}
*/

export enum NumericKeys {
    Avg = "avg",
    Pass = "pass",
    Fail = "fail",
    Audit = "audit",
    // Year = "year",
    // Lat = "lat",
    // Lon =  "lon",
    // Seats = "seats",
}
