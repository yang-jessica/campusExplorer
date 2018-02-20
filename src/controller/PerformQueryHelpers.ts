import Log from "../Util";
import {CourseKeys, NumericKeys} from "./IDatasetFacade";

export class PerformQueryHelpers {

    // valid key
    private static isValidKey(key: string): boolean {
        const keyToValidate = key.substring(key.indexOf("_") + 1);
        return Object.values(CourseKeys).includes(keyToValidate);
    }

    // numeric key
    private static isNumericKey(key: string): boolean {
        const keyToValidate = key.substring(key.indexOf("_") + 1);
        return Object.values(NumericKeys).includes(keyToValidate);
    }

    constructor() {
        // Log.trace("constructor of PerformQueryHelpers");
    }

    // WHERE helper
    public performWhere(where: any, negate: boolean, id: string): any[] {
        // Log.trace("PERFORM WHERE");
        let result: any[] = [];
        const filter = Object.keys(where)[0];
        switch (filter) {
            case "AND":
                // Log.trace("\t\tfilter is: AND");
                try {
                    result = this.andFunction(where, negate, id);
                } catch {
                    throw new Error("AND messed up");
                }
                break;
            case "OR":
                // Log.trace("\t\tfilter is: OR");
                try {
                    result = this.orFunction(where, negate, id);
                } catch {
                    throw new Error("OR messed up");
                }
                break;
            case "LT":
                // Log.trace("\t\tfilter is: LT");
                try {
                    result = this.performMComp(where, negate, id);
                } catch {
                    throw new Error("LT messed up");
                }
                break;
            case "GT":
                // Log.trace("\t\tfilter is: GT");
                try {
                    result = this.performMComp(where, negate, id);
                } catch {
                    throw new Error("GT messed up");
                }
                break;
            case "EQ":
                // Log.trace("\t\tfilter is: EQ");
                try {
                    result = this.performMComp(where, negate, id);
                } catch {
                    throw new Error("EQ messed up");
                }
                break;
            case "IS":
                // Log.trace("\t\tfilter is: IS");
                try {
                    result = this.performSComp(where, negate, id);
                } catch {
                    throw new Error("IS messed up");
                }
                break;
            case "NOT":
                // Log.trace("\t\tfilter is: NOT");
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

    // OPTIONS helper
    public performOptions(options: any, results: any[], id: string): any[] {
        // Log.trace("PERFORM OPTIONS");
        // HANDLE COLUMNS
        // Log.trace("\t HANDLING COLUMNS");
        const columns = options[Object.keys(options)[0]];
        // is it empty?
        // const columnsLength = "\t\tsize of columns: " + Object.keys(columns).length;
        // Log.trace(columnsLength);
        if (Object.keys(columns).length === 0) {
            // Log.trace("\t\tCOLUMNS empty\n");
            throw new Error("COLUMNS empty");
        }
        // are all the keys in COLUMNS valid?
        for (const column of columns) {
            if (!PerformQueryHelpers.isValidKey(column)) {
                // Log.trace("\t\tinvalid key in COLUMNS");
                throw new Error("invalid key in COLUMNS");
            }
        }
        // filter out the unnecessary keys
        const keysToRemove: string[] = [];
        for (const key of Object.values(CourseKeys)) {
            if (!columns.includes(id + "_" + key)) {
                keysToRemove.push(id + "_" + key);
            }
        }
        // Log.trace("\t\tRemoving non-queried columns");
        for (const result of results) {
            for (const key of keysToRemove) {
                delete result[key];
            }
        }
        // HANDLING ORDER
        // Log.trace("\t HANDLING ORDER");
        const orderBy = options["ORDER"];
        // check if orderBY is included in COLUMNS
        if (orderBy && !columns.includes(orderBy)) {
            // Log.trace("\t\tORDER key is not included in COLUMNS");
            throw new Error("ORDER key is not included in COLUMNS");
        }
        // check if ORDER exists in query and orderBy is a number
        if (orderBy && PerformQueryHelpers.isNumericKey(orderBy)) {
            results.sort(function (a, b) {
                return a[orderBy] - b[orderBy];
            });
            // check if ORDER exists in query orderBy is a string
        } else if (orderBy && !PerformQueryHelpers.isNumericKey(orderBy)) {
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

    // AND function
    private andFunction(andQuery: any, negate: boolean, id: string): any[] {
        // Log.trace("AND FUNCTION");
        // is it empty?
        // const sizeOfAnd = "\t\tsize of AND: " + andQuery["AND"].length;
        // Log.trace(sizeOfAnd);
        if (andQuery["AND"].length === 0) {
            // Log.trace("\t\tAND empty\n");
            throw new Error("AND empty");
        }
        // get the full dataset
        const fs = require("fs");
        const datasetString = fs.readFileSync("./datasets/" + id);
        const data = JSON.parse(datasetString);
        let andResult: any[] = data.sections;
        // handle queries within AND
        for (const logicClause of andQuery["AND"]) {
            switch (Object.keys(logicClause)[0]) {
                case "AND":
                    // Log.trace("\t\tinside AND");
                    andResult = this.andHelper(andResult, this.andFunction(logicClause, negate, id));
                    break;
                case "OR":
                    // Log.trace("\t\tinside OR");
                    andResult = this.andHelper(andResult, this.orFunction(logicClause, negate, id));
                    break;
                case "LT":
                    // Log.trace("\t\tinside LT");
                    andResult = this.andHelper(andResult, this.performMComp(logicClause, negate, id));
                    break;
                case "GT":
                    // Log.trace("\t\tinside GT");
                    andResult = this.andHelper(andResult, this.performMComp(logicClause, negate, id));
                    break;
                case "EQ":
                    // Log.trace("\t\tinside EQ");
                    andResult = this.andHelper(andResult, this.performMComp(logicClause, negate, id));
                    break;
                case "IS":
                    // Log.trace("\t\tinside IS");
                    andResult = this.andHelper(andResult, this.performSComp(logicClause, negate, id));
                    break;
                case "NOT":
                    // Log.trace("\t\tinside NOT");
                    andResult = this.andHelper(andResult, this.performNeg(logicClause, id));
                    break;
                default:
                    // Log.trace("\t\tunknown filter encountered");
                    throw new Error("damn man there ain't no filter like that in here");
            }
        }
        return andResult;
    }

    // AND helper
    private andHelper(array1: any[], array2: any[]): any[] {
        // Log.trace("AND HELPER");
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
        // Log.trace("\t\tfirst array: " + stringifyArray1);
        // Log.trace("\t\tsecond array: " + stringifyArray2);
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

    // OR function
    private orFunction(orQuery: any, negate: boolean, id: string): any[] {
        // Log.trace("OR FUNCTION");
        // is it empty?
        // const sizeOfOr = "\t\tsize of OR: " + orQuery["OR"].length;
        // Log.trace(sizeOfOr);
        if (orQuery["OR"].length === 0) {
            // Log.trace("\t\tOR empty\n");
            throw new Error("OR empty");
        }
        let orResult: any[] = [];
        // handle queries within OR
        for (const logicClause of orQuery["OR"]) {
            switch (Object.keys(logicClause)[0]) {
                case "AND":
                    orResult = orResult.concat(this.orHelper(orResult, this.andFunction(logicClause, negate, id)));
                    break;
                case "OR":
                    orResult = orResult.concat(this.orHelper(orResult, this.orFunction(logicClause, negate, id)));
                    break;
                case "LT":
                    orResult = orResult.concat(this.orHelper(orResult, this.performMComp(logicClause, negate, id)));
                    break;
                case "GT":
                    orResult = orResult.concat(this.orHelper(orResult, this.performMComp(logicClause, negate, id)));
                    break;
                case "EQ":
                    orResult = orResult.concat(this.orHelper(orResult, this.performMComp(logicClause, negate, id)));
                    break;
                case "IS":
                    orResult = orResult.concat(this.orHelper(orResult, this.performSComp(logicClause, negate, id)));
                    break;
                case "NOT":
                    orResult = orResult.concat(this.orHelper(orResult, this.performNeg(logicClause, id)));
                    break;
                default:
                    throw new Error("damn man there ain't no filter like that in here");
            }
        }
        return orResult;
    }

    // OR helper
    private orHelper(array1: any[], array2: any[]): any[] {
        // Log.trace("OR HELPER");
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
        // Log.trace("first array: " + stringifyArray1);
        // Log.trace("second array: " + stringifyArray2);
        let filteredStringArray: any[];
        const filteredArray: any[] = [];
        filteredStringArray = stringifyArray2.filter(function (x: any) {
            return !(stringifyArray1.includes(x));
        });
        for (const x of filteredStringArray) {
            const parsed = JSON.parse(x);
            filteredArray.push(parsed);
        }
        return filteredArray;
    }

    // MATH COMPARISON (GT || LT || EQ) HELPER
    private performMComp(filter: any, negate: boolean, id: string): any[] {
        // Log.trace("PERFORM M COMP");
        // get the comparator
        const logic = filter[Object.keys(filter)[0]];
        const comparator = Object.keys(filter)[0];
        // const compInfo = "\t\tCOMPARATOR: " + comparator;
        // Log.trace(compInfo);
        // is it empty? also can check if it's > 1
        // const sizeOfLogic = "\t\tsize of logic: " + Object.keys(logic).length;
        // Log.trace(sizeOfLogic);
        if (Object.keys(logic).length === 0) {
            // Log.trace("\t\tcomparator empty\n");
            throw new Error("comparator empty");
        }
        // the thing to compare
        const keyToCompare = Object.keys(logic)[0];
        // Log.trace("\t\tkey to compare: " + keyToCompare);
        // is it valid?
        // const valid = "\t\tis it valid? " + this.isValidKey(keyToCompare);
        // Log.trace(valid);
        if (!PerformQueryHelpers.isValidKey(keyToCompare)) {
            // Log.trace("\t\tinvalid key");
            throw new Error("invalid key");
        }
        // is the key to compare on numeric?
        // const numeric = "\t\tis numeric? " + this.isNumericKey(keyToCompare);
        // Log.trace(numeric);
        if (!PerformQueryHelpers.isNumericKey(keyToCompare)) {
            // Log.trace("\t\tcan't compare string keys mathematically");
            throw new Error("can't compare string keys mathematically");
        }
        // is the actual value numeric?
        // const value = "\t\ttype of value? " + typeof logic[keyToCompare];
        // Log.trace(value);
        if (typeof logic[keyToCompare] === "string") {
            // Log.trace("\t\tcan't math compare string values");
            throw new Error("can't math compare string values");
        }
        const fs = require("fs");
        const datasetString = fs.readFileSync("./datasets/" + id);
        const data = JSON.parse(datasetString);
        const answer: any[] = [];
        const invert: any[] = [];
        // const dataID = data.iid;
        const allSections = data.sections;
        for (const section of allSections) {
            // begin logging
            // const set = "set[" + i + "] " + keyToCompare + ": " + allSections[i][keyToCompare];
            // const qry = "query[" + i + "] " + keyToCompare + ": " + logic[keyToCompare];
            // const msg = "\t\t" + set + "\t\t vs \t\t" + qry;
            // Log.trace(msg);
            // end logging
            switch (comparator) {
                case "GT":
                    if (section[keyToCompare] > logic[keyToCompare]) {
                        answer.push(section);
                    } else {
                        invert.push(section);
                    }
                    break;
                case "LT":
                    if (section[keyToCompare] < logic[keyToCompare]) {
                        answer.push(section);
                    } else {
                        invert.push(section);
                    }
                    break;
                case "EQ":
                    if (section[keyToCompare] === logic[keyToCompare]) {
                        answer.push(section);
                    } else {
                        invert.push(section);
                    }
                    break;
            }
        }
        // Log.trace("M COMP DONE");
        if (negate) {
            return invert;
        } else {
            return answer;
        }
    }

    // STRING COMPARISON (IS) HELPER
    private performSComp(filter: any, negate: boolean, id: string): any[] {
        // Log.trace("PERFORM S COMP");
        // get the comparator
        const logic = filter[Object.keys(filter)[0]];
        // const comparatorInfo = "\t\tCOMPARATOR: " + Object.keys(filter)[0];
        // Log.trace(comparatorInfo);
        // is it empty? also can check if it's > 1
        // const sizeOfLogic = "\t\tsize of logic: " + Object.keys(logic).length;
        // Log.trace(sizeOfLogic);
        if (Object.keys(logic).length === 0) {
            // Log.trace("\t\tIS is empty\n");
            throw new Error("IS is empty");
        }
        // the thing to compare
        const keyToCompare = Object.keys(logic)[0];
        // Log.trace("\t\tkey to compare: " + keyToCompare);
        // is it valid?
        // const valid = "\t\tis valid? " + this.isValidKey(keyToCompare);
        // Log.trace(valid);
        if (!PerformQueryHelpers.isValidKey(keyToCompare)) {
            // Log.trace("\t\tinvalid key");
            throw new Error("invalid key");
        }
        // is the key to compare on a string?
        // const numeric = "\t\tis string? " + !this.isNumericKey(keyToCompare);
        // Log.trace(numeric);
        if (PerformQueryHelpers.isNumericKey(keyToCompare)) {
            // Log.trace("\t\tcan't compare numerical keys as strings");
            throw new Error("can't compare numerical keys as strings");
        }
        // is the actual value a string?
        // const value = "\t\ttype of value? " + typeof logic[keyToCompare];
        // Log.trace(value);
        if (typeof logic[keyToCompare] === "number") {
            // Log.trace("\t\tcan't string compare numerical values");
            throw new Error("can't string compare numerical values");
        }
        // what else
        // const comp = "\t\tCOMPARISON: " + keyToCompare + " " + Object.keys(filter)[0] + " " + logic[keyToCompare];
        // parse shit for real this time
        const fs = require("fs");
        const datasetString = fs.readFileSync("./datasets/" + id);
        const data = JSON.parse(datasetString);
        // create answer arrays
        const answer: any[] = [];
        const invert: any[] = [];
        // const dataID = data.iid; // the id of the dataset
        const allSections = data.sections;
        // handle wildcards
        let compare = logic[keyToCompare];
        const sub = compare.substring(1, compare.length - 1);
        // check if the string is "*" or "**" (valid like wtf man)
        if (compare === "*" || compare === "**") {
            for (const section of allSections) {
                answer.push(section);
            }
        } else {
            // if the string has a * somewhere not at the beginning or end it's no good
            if (sub.includes("*")) {
                throw new Error("invalid key: * not at beginning or end");
            }
            // case where compare is 'string'
            if (!compare.includes("*")) {
                for (const section of allSections) {
                    if (section[keyToCompare] === compare) {
                        answer.push(section);
                    } else {
                        invert.push(section);
                    }
                }
            } else if (compare.startsWith("*") && compare.endsWith("*")) {
                for (const section of allSections) {
                    if (section[keyToCompare].includes(sub)) {
                        answer.push(section);
                    } else {
                        invert.push(section);
                    }
                }
            } else if (compare.startsWith("*")) {
                compare = compare.substring(1, compare.length);
                for (const section of allSections) {
                    const secLength = section[keyToCompare].length;
                    if (section[keyToCompare].substring(secLength - compare.length, secLength) === compare) {
                        answer.push(section);
                    } else {
                        invert.push(section);
                    }
                }
            } else if (compare.endsWith("*")) {
                compare = compare.substring(0, compare.length - 1);
                for (const section of allSections) {
                    if (section[keyToCompare].substring(0, compare.length) === compare) {
                        answer.push(section);
                    } else {
                        invert.push(section);
                    }
                }
            }
        }
        // if there was a wildcard
        if (negate) {
            return invert;
        } else {
            return answer;
        }
    }

    // NEGATION HELPER
    private performNeg(logic: any, id: string): any[] {
        // Log.trace("PERFORM NEGATION");
        let negate: boolean = true;
        let current = logic[Object.keys(logic)[0]];
        // is it empty? also can check if it's > 1
        // const sizeOfNot = "\t\tsize of NOT: " + Object.keys(current).length;
        // Log.trace(sizeOfNot);
        if (Object.keys(current).length === 0) {
            // Log.trace("\t\tNOT is empty\n");
            throw new Error("NOT is empty");
        }
        // count the # of NOTs
        // Log.trace("\t\tcount NOTs");
        let notCounter = 1;
        while (Object.keys(current)[0] === "NOT") {
            notCounter++;
            // const negationText = "\t\tNumber of NOTs: " + notCounter;
            // Log.trace(negationText);
            current = current[Object.keys(logic)[0]];
        }
        if (!(notCounter % 2)) {
            negate = false;
        }
        return this.performWhere(current, negate, id);
    }
}
