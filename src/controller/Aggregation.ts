export class Aggregation {

    // MAX helper
    public static applyMax(results: any[], field: any): number {
        let current = results[0][field];
        for (const result of results) {
            if (result[field] > current) {
                current = result[field];
            }
        }
        return current;
    }

    // MIN helper
    public static applyMin(results: any[], field: any): any {
        let current = results[0][field];
        for (const result of results) {
            if (result[field] < current) {
                current = result[field];
            }
        }
        return current;
    }

    // AVG helper
    public static applyAvg(results: any[], field: any): any {
        const Decimal = require("decimal.js");
        let total = new Decimal(0);
        let count = 0;
        for (const result of results) {
            // convert number to decimal then back to number
            total = Decimal.add(total, new Decimal(result[field]));
            count++;
        }
        const avg = total.toNumber() / count;
        return Number(avg.toFixed(2));
    }

    // SUM helper
    public static applySum(results: any[], field: any): any {
        let sum = 0;
        for (const result of results) {
            sum += result[field];
        }
        // round to 2 digits
        return Math.round(sum * 100) / 100;
    }

    // COUNT helper
    public static applyCount(results: any[], field: any): any {
        // array for items already encountered
        const counted: any[] = [];
        let count = 0;
        for (const result of results) {
            if (!counted.includes(result[field])) {
                counted.push(result[field]);
                count++;
            }
        }
        return count;
    }
}
