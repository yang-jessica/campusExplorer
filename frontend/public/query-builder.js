/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function() {
    let query = {};
    let active = document.getElementsByClassName("tab-panel active")[0]; // active tab (courses or rooms)

    // HANDLE CONDITIONS
    let condType = getConditionType(); // condition type

    // conditions in query
    let conditions = active.getElementsByClassName("control-group condition");
    if (conditions.length === 0) { // then WHERE is just {}
        query["WHERE"] = {};
    } else if (conditions.length === 1) { // then don't need a condType
        query["WHERE"] = getSingleCondition(conditions[0]);
    } else { // create conditionsArray with condType
        let conditionsArray = [];
        for (let condition of conditions) { // get each condition
            conditionsArray.push(getSingleCondition(condition));
        }
        query["WHERE"] = {[condType]: conditionsArray};
    }

    let options = {};
    // HANDLE COLUMNS
    let columns = active.getElementsByClassName("form-group columns")[0].getElementsByClassName("control-group")[0];
    options["COLUMNS"] = getColumns(columns);

    // HANDLE ORDER
    let order = active.getElementsByClassName("form-group order")[0].getElementsByClassName("control-group")[0];
    let orderKeys = getOrder(order);
    if (orderKeys.length !== 0) { // if there are no orderKeys, then don't include ORDER
        if (order.getElementsByClassName("control descending")[0].querySelector("div input").checked) {
            options["ORDER"] = {"dir": "DOWN", "keys": orderKeys};
        } else {
            options["ORDER"] = {"dir": "UP", "keys": orderKeys};
        }
    }
    query["OPTIONS"] = options;

    let transformations = {};
    // HANDLE GROUP
    let groups = active.getElementsByClassName("form-group groups")[0].getElementsByClassName("control-group")[0];
    transformations["GROUP"] = getGroups(groups);

    // HANDLE TRANSFORMATIONS
    let transformationsArray = active.getElementsByClassName("control-group transformation");
    let applyArray = [];
    for (let transformation of transformationsArray) { // get each condition
        applyArray.push(getSingleApply(transformation));
    }
    transformations["APPLY"] = applyArray;
    if (applyArray.length !== 0) {
        query["TRANSFORMATIONS"] = transformations;
    }
    console.log(JSON.stringify(query));
    return query;
};

// get the condition type
getConditionType = function() {
    let conds = document.getElementsByClassName("tab-panel active")[0].getElementsByClassName("control-group condition-type")[0];
    let conditions = conds.querySelectorAll("div");
    for (const condition of conditions) {
        if (condition.querySelector("div input").checked) {
            switch (condition.querySelector("div input").value) {
                case "all":
                    return "AND";
                case "any":
                    return "OR";
                case "none":
                    return "NOT";
            }
        }
    }
};

// get individual condition
getSingleCondition = function(condition) {
    let id = document.getElementsByClassName("tab-panel active")[0].getAttribute("data-type");

    // TERM
    let term = condition.getElementsByClassName("control term")[0].querySelector("div input").value;

    // FIELD
    let possibleFields = condition.getElementsByClassName("control fields")[0].querySelector("div select");
    let field = id + "_" + possibleFields.options[possibleFields.selectedIndex].value;

    // create object where {key: term}
    let keyObject = {[field]: term};

    // COMPARATOR
    let possibleOperators = condition.getElementsByClassName("control operators")[0].querySelector("div select");
    let operator = possibleOperators.options[possibleOperators.selectedIndex].value;

    // if operator is not IS, parse into number
    if (operator !== "IS") {
        keyObject[field] = Number(term);
    }

    // create object where {comparator: {key: term}}
    let compareObject = {[operator]: keyObject};

    // NOT
    let notFlag = condition.getElementsByClassName("control not")[0].querySelector("div input").checked;
    let conditionObject = {};
    // is "not" checked?
    if (notFlag) { // then set object with NOT
        conditionObject["NOT"] = compareObject;
    } else { // else just return object
        conditionObject = compareObject;
    }
    return conditionObject;
};

// get the columns to select
getColumns = function(columns) {
    let id = document.getElementsByClassName("tab-panel active")[0].getAttribute("data-type");
    let answer = [];
    // get fields
    let cols = columns.getElementsByClassName("control field");
    for (let col of cols) {
        if (col.querySelector("div input").checked) {
            answer.push(id + "_" + col.querySelector("div input").value);
        }
    }
    // get applyStrings
    let transformations = columns.getElementsByClassName("control transformation");
    for (let transformation of transformations) {
        if (transformation.querySelector("div input").checked) {
            answer.push(transformation.querySelector("div input").value);
        }
    }
    return answer;
};

// get the keys to order by
getOrder = function(order) {
    let id = document.getElementsByClassName("tab-panel active")[0].getAttribute("data-type");
    let answer = [];
    let fields = order.getElementsByClassName("control order fields")[0].querySelectorAll("div select option");
    for (let field of fields) {
        if (field.selected && field.className !== "transformation") {
            answer.push(id + "_" + field.value);
        } else if (field.selected && field.className === "transformation") {
            answer.push(field.value);
        }
    }
    return answer;
};

// get the keys to group by
getGroups = function(groups) {
    let id = document.getElementsByClassName("tab-panel active")[0].getAttribute("data-type");
    let answer = [];
    // get fields
    let keys = groups.getElementsByClassName("control field");
    for (let key of keys) {
        if (key.querySelector("div input").checked) {
            answer.push(id + "_" + key.querySelector("div input").value);
        }
    }
    return answer;
};

// get individual apply object
getSingleApply = function(transformation) {
    let id = document.getElementsByClassName("tab-panel active")[0].getAttribute("data-type");

    // FIELD
    let possibleFields = transformation.getElementsByClassName("control fields")[0].querySelector("div select");
    let field = id + "_" + possibleFields.options[possibleFields.selectedIndex].value;

    // COMPARATOR
    let possibleOperators = transformation.getElementsByClassName("control operators")[0].querySelector("div select");
    let operator = possibleOperators.options[possibleOperators.selectedIndex].value;

    // TERM
    let applyString = transformation.getElementsByClassName("control term")[0].querySelector("div input").value;
    return {[applyString]: {[operator]: field}};
};
