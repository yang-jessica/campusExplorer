import Log from "../Util";
import {CourseKeys, NumericKeys} from "./IDatasetFacade";
import {InsightResponse} from "./IInsightFacade";
import {Aggregation} from "./Aggregation";

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

    constructor() {/* construct */}

    // WHERE helper
    public performWhere(where: any, negate: boolean, id: string): any[] {
        // Log.trace("PERFORM WHERE");
        let result: any[] = [];
        const filter = Object.keys(where)[0];
        switch (filter) {
            case "AND":
                try {
                    result = this.andFunction(where, negate, id);
                    break;
                } catch {
                    throw new Error("AND messed up");
                }
            case "OR":
                try {
                    result = this.orFunction(where, negate, id);
                    break;
                } catch {
                    throw new Error("OR messed up");
                }
            case "LT":
                try {
                    result = this.performMComp(where, negate, id);
                    break;
                } catch {
                    throw new Error("LT messed up");
                }
            case "GT":
                try {
                    result = this.performMComp(where, negate, id);
                    break;
                } catch {
                    throw new Error("GT messed up");
                }
            case "EQ":
                try {
                    result = this.performMComp(where, negate, id);
                    break;
                } catch {
                    throw new Error("EQ messed up");
                }
            case "IS":
                try {
                    result = this.performSComp(where, negate, id);
                    break;
                } catch {
                    throw new Error("IS messed up");
                }
            case "NOT":
                try {
                    result = this.performNeg(where, id);
                    break;
                } catch {
                    throw new Error("NOT messed up");
                }
            case undefined:
                const fs = require("fs");
                const datasetString = fs.readFileSync("./datasets/" + id);
                const data = JSON.parse(datasetString);
                result = data.sections;
                break;
            default:
                throw new Error("damn man there ain't no filter like that in here");
        }
        return result;
    }

    // OPTIONS helper
    public performOptions(options: any, results: any[], id: string): InsightResponse {
        const columns = options[Object.keys(options)[0]];
        if (Object.keys(columns).length === 0) {
            return {code: 400, body: {error: "COLUMNS cannot be empty"}};
        }
        // are all the keys in COLUMNS valid?
        for (const column of columns) {
            if (!PerformQueryHelpers.isValidKey(column)) {
                return {code: 400, body: {error: column + " is not a valid key"}};
            }
        }
        // filter out the unnecessary keys
        const keysToRemove: string[] = [];
        for (const key of Object.values(CourseKeys)) {
            if (!columns.includes(id + "_" + key)) {
                keysToRemove.push(id + "_" + key);
            }
        }
        for (const result of results) {
            for (const key of keysToRemove) {
                delete result[key];
            }
        }
        // HANDLING ORDER
        const sort = options["ORDER"];
        // if sort exists, call helper, else return results
        if (sort && typeof sort === "string") {
            return this.performSimpleSort(sort, columns, results);
        } else if (sort) {
            return this.performComplexSort(sort, columns, results);
        } else {
            return {code: 200, body: {result: results}};
        }
    }

    // OPTIONS helper for when TRANSFORMATION exists
    public performOptionsTransformed(options: any, results: any[], transform: any, id: string): InsightResponse {
        const columns = options[Object.keys(options)[0]];
        if (Object.keys(columns).length === 0) {
            return {code: 400, body: {error: "COLUMNS cannot be empty"}};
        }
        // get all the applyStrings
        const apply = transform["APPLY"];
        const applyStrings = [];
        for (const applyElement of apply) {
            const applyKey = Object.keys(applyElement);
            const applyString = applyKey[0];
            applyStrings.push(applyString);
        }
        const transformKeys = transform["GROUP"].concat(applyStrings);
        // are all the keys in COLUMNS valid?
        for (const column of columns) {
            // if it has an underscore, check validity
            if (column.includes("_") && !PerformQueryHelpers.isValidKey(column)) {
                return {code: 400, body: {error: column + " is not a valid key"}};
            }
            // if it doesn't have an underscore, check if in applyStrings array
            if (!column.includes("_") && !applyStrings.includes(column)) {
                return {code: 400, body: {error: column + " is not a valid key"}};
            }
            // lastly, check if it is in either GROUP or in APPLY
            if (!transformKeys.includes(column)) {
                return {code: 400, body: {error: "All column keys need to be in either GROUP or in APPLY"}};
            }
        }
        // filter out the unnecessary keys
        const keysToRemove: string[] = [];
        for (const key of Object.values(CourseKeys)) {
            if (!columns.includes(id + "_" + key)) {
                keysToRemove.push(id + "_" + key);
            }
        }
        for (const result of results) {
            for (const key of keysToRemove) {
                delete result[key];
            }
        }
        // HANDLING ORDER
        const sort = options["ORDER"];
        // if sort exists, call helper, else return results
        if (sort && typeof sort === "string") {
            return this.performSimpleSort(sort, columns, results);
        } else if (sort) {
            return this.performComplexSort(sort, columns, results);
        } else {
            return {code: 200, body: {result: results}};
        }
    }

    // TRANSFORMATIONS helper
    public performTransform(transform: any, results: any[]): any[] {
        const group = transform["GROUP"];
        const apply = transform["APPLY"];
        // check if both group and apply exist
        if (!group || !apply) {
            Log.trace("400: group or apply missing");
            throw new Error("400: group or apply missing");
        }
        // check if group is empty
        if (group.length === 0) {
            Log.trace("400: group cannot be empty");
            throw new Error("400: group cannot be empty");
        }
        // check if apply is empty
        if (apply.length === 0) {
            Log.trace("400: apply cannot be empty");
            throw new Error("400: apply cannot be empty");
        }
        // get all the applyStrings
        const applyStrings = [];
        for (const applyElement of apply) {
            const applyKey = Object.keys(applyElement);
            const applyString = applyKey[0];
            applyStrings.push(applyString);
        }
        const soFar: any[] = [];
        for (const a of applyStrings) {
            if (a.includes("_")) {
                Log.trace("400: apply keys cannot contain underscores");
                throw new Error("400: apply keys cannot contain underscores");
            }
            if (soFar.includes(a)) {
                Log.trace("400: duplicate apply key");
                throw new Error("400: duplicate apply key");
            } else {
                soFar.push(a);
            }
        }
        // group
        return this.performGroup(group, apply, results);
    }

    // GROUP helper
    private performGroup(group: any[], apply: any, results: any[]): any[] {
        const groups = new Map();
        for (const result of results) {
            let key: string = "";
            for (const property of group) {
                key = key + result[property].toString() + "#";
            }
            if (groups.has(key)) {
                groups.set(key, groups.get(key).concat(result));
            } else {
                groups.set(key, [result]);
            }
        }
        const keys = groups.keys();
        const applied: any[] = [];
        for (const k of keys) {
            applied.push(this.performApply(apply, groups.get(k)));
        }
        return applied;
    }

    // APPLY helper
    private performApply(apply: any[], results: any[]): any {
        const result = results[0];
        for (const applyKey of apply) {
            const applyString = Object.keys(applyKey)[0];
            const aggregation = Object.values(applyKey)[0];
            const token = Object.keys(aggregation)[0];
            const field = Object.values(aggregation)[0];
            let answer: number;
            switch (token) {
                case "MAX":
                    if (PerformQueryHelpers.isNumericKey(field)) {
                        answer = Aggregation.applyMax(results, field);
                        break;
                    } else {
                        Log.trace("400: MAX key must be numeric");
                        throw new Error("MAX key must be numeric");
                    }
                case "MIN":
                    if (PerformQueryHelpers.isNumericKey(field)) {
                        answer = Aggregation.applyMin(results, field);
                        break;
                    } else {
                        Log.trace("400: MIN key must be numeric");
                        throw new Error("MIN key must be numeric");
                    }
                case "AVG":
                    if (PerformQueryHelpers.isNumericKey(field)) {
                        answer = Aggregation.applyAvg(results, field);
                        break;
                    } else {
                        Log.trace("400: AVG key must be numeric");
                        throw new Error("AVG key must be numeric");
                    }
                case "SUM":
                    if (PerformQueryHelpers.isNumericKey(field)) {
                        answer = Aggregation.applySum(results, field);
                        break;
                    } else {
                        Log.trace("400: SUM key must be numeric");
                        throw new Error("SUM key must be numeric");
                    }
                case "COUNT":
                    if (PerformQueryHelpers.isValidKey(field)) {
                        answer = Aggregation.applyCount(results, field);
                        break;
                    } else {
                        Log.trace("400: COUNT key invalid");
                        throw new Error("COUNT key invalid");
                    }
                default:
                    throw new Error("Apply token invalid");
            }
            result[applyString] = answer;
        }
        return result;
    }

    // AND function
    private andFunction(andQuery: any, negate: boolean, id: string): any[] {
        // is it empty?
        if (andQuery["AND"].length === 0) {
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
                    andResult = this.andHelper(andResult, this.andFunction(logicClause, negate, id));
                    break;
                case "OR":
                    andResult = this.andHelper(andResult, this.orFunction(logicClause, negate, id));
                    break;
                case "LT":
                    andResult = this.andHelper(andResult, this.performMComp(logicClause, negate, id));
                    break;
                case "GT":
                    andResult = this.andHelper(andResult, this.performMComp(logicClause, negate, id));
                    break;
                case "EQ":
                    andResult = this.andHelper(andResult, this.performMComp(logicClause, negate, id));
                    break;
                case "IS":
                    andResult = this.andHelper(andResult, this.performSComp(logicClause, negate, id));
                    break;
                case "NOT":
                    andResult = this.andHelper(andResult, this.performNeg(logicClause, id));
                    break;
                default:
                    throw new Error("damn man there ain't no filter like that in here");
            }
        }
        return andResult;
    }

    // AND helper
    private andHelper(array1: any[], array2: any[]): any[] {
        const stringifyArray1: any[] = [];
        for (const x of array1) {
            const y = JSON.stringify(x);
            stringifyArray1.push(y);
        }
        const stringifyArray2: any[] = [];
        for (const x2 of array2) {
            const y2 = JSON.stringify(x2);
            stringifyArray2.push(y2);
        }
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
        // is it empty?
        if (orQuery["OR"].length === 0) {
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
        const stringifyArray1: any[] = [];
        for (const x of array1) {
            const y = JSON.stringify(x);
            stringifyArray1.push(y);
        }
        const stringifyArray2: any[] = [];
        for (const x2 of array2) {
            const y2 = JSON.stringify(x2);
            stringifyArray2.push(y2);
        }
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

    // MATH COMPARISON (GT || LT || EQ) helper
    private performMComp(filter: any, negate: boolean, id: string): any[] {
        // get the comparator
        const logic = filter[Object.keys(filter)[0]];
        const comparator = Object.keys(filter)[0];
        // is it empty? also can check if it's > 1
        if (Object.keys(logic).length === 0) {
            throw new Error("comparator empty");
        }
        // the thing to compare
        const keyToCompare = Object.keys(logic)[0];
        // is it valid?
        if (!PerformQueryHelpers.isValidKey(keyToCompare)) {
            throw new Error("invalid key");
        }
        // is the key to compare on numeric?
        if (!PerformQueryHelpers.isNumericKey(keyToCompare)) {
            throw new Error("can't compare string keys mathematically");
        }
        // is the actual value numeric?
        if (typeof logic[keyToCompare] === "string") {
            throw new Error("can't math compare string values");
        }
        const fs = require("fs");
        const datasetString = fs.readFileSync("./datasets/" + id);
        const data = JSON.parse(datasetString);
        const answer: any[] = [];
        const invert: any[] = [];
        const allSections = data.sections;
        for (const section of allSections) {
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
        if (negate) {
            return invert;
        } else {
            return answer;
        }
    }

    // STRING COMPARISON (IS) helper
    private performSComp(filter: any, negate: boolean, id: string): any[] {
        // get the comparator
        const logic = filter[Object.keys(filter)[0]];
        // is it empty? also can check if it's > 1
        if (Object.keys(logic).length === 0) {
            throw new Error("IS is empty");
        }
        // the thing to compare
        const keyToCompare = Object.keys(logic)[0];
        // is it valid?
        if (!PerformQueryHelpers.isValidKey(keyToCompare)) {
            throw new Error("invalid key");
        }
        // is the key to compare on a string?
        if (PerformQueryHelpers.isNumericKey(keyToCompare)) {
            throw new Error("can't compare numerical keys as strings");
        }
        // is the actual value a string?
        if (typeof logic[keyToCompare] === "number") {
            throw new Error("can't string compare numerical values");
        }
        // parse shit for real this time
        const fs = require("fs");
        const datasetString = fs.readFileSync("./datasets/" + id);
        const data = JSON.parse(datasetString);
        // create answer arrays
        const answer: any[] = [];
        const invert: any[] = [];
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
        if (negate) {
            return invert;
        } else {
            return answer;
        }
    }

    // NEGATION helper
    private performNeg(logic: any, id: string): any[] {
        let negate: boolean = true;
        let current = logic[Object.keys(logic)[0]];
        // is it empty?
        if (Object.keys(current).length === 0) {
            throw new Error("NOT is empty");
        }
        // count the # of NOTs
        let notCounter = 1;
        while (Object.keys(current)[0] === "NOT") {
            notCounter++;
            current = current[Object.keys(logic)[0]];
        }
        if (!(notCounter % 2)) {
            negate = false;
        }
        return this.performWhere(current, negate, id);
    }

    // SORTING helper
    private performSimpleSort(sort: any, columns: any[], results: any[]): InsightResponse {
        // make sure key is included in columns
        if (!columns.includes(sort)) {
            return {code: 400, body: {error: "ORDER key not included in COLUMNS"}};
        }
        // check if ORDER exists in query and orderBy is a number
        results.sort(function (a, b) {
            if (a[sort] < b[sort]) {
                return -1;
            }
            if (a[sort] > b[sort]) {
                return 1;
            }
            return 0;
        });
        return {code: 200, body: {result: results}};
    }

    // complex sort helper
    private performComplexSort(sort: any, columns: any[], results: any[]): InsightResponse {
        const dir = sort["dir"];
        const keys = sort["keys"];
        // check if we have dir and keys
        if (!dir || !keys) {
            return {code: 400, body: {error: "Options order invalid"}};
        }
        // check if direction is valid
        if (!(dir === "UP" || dir === "DOWN")) {
            return {code: 400, body: {error: "Order direction invalid"}};
        }
        // check if we have keys to sort on
        if (keys.length === 0) {
            return {code: 400, body: {error: "No keys to sort on"}};
        }
        // make sure all keys are in columns
        for (const key of keys) {
            if (!columns.includes(key)) {
                return {code: 400, body: {error: "Order key needs to be included in columns"}};
            }
        }
        // sort that
        if (dir === "UP") {
            results.sort(function (a, b) {
                let keyIndex = 0;
                while (a[keys[keyIndex]] === b[keys[keyIndex]]) {
                    if (keyIndex + 1 < keys.length) {
                        keyIndex++;
                    } else {
                        return 0;
                    }
                }
                if (a[keys[keyIndex]] < b[keys[keyIndex]]) {
                    return -1;
                }
                if (a[keys[keyIndex]] > b[keys[keyIndex]]) {
                    return 1;
                }
            });
        } else if (dir === "DOWN") {
            results.sort(function (a, b) {
                let keyIndex = 0;
                while (a[keys[keyIndex]] === b[keys[keyIndex]]) {
                    if (keyIndex + 1 < keys.length) {
                        keyIndex++;
                    } else {
                        return 1;
                    }
                }
                if (a[keys[keyIndex]] > b[keys[keyIndex]]) {
                    return -1;
                }
                if (a[keys[keyIndex]] < b[keys[keyIndex]]) {
                    return 1;
                }
            });
        }
        return {code: 200, body: {result: results}};
    }
}
