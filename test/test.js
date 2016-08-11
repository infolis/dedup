var test = require('tape');
var heuristics = require('../lib/heuristics');

function testAuthors() {
    var data = [
         ['John Doe'],
         ['John Dorn'],
         ['John Doe', 'John Dorn'],
         ['Wu Wei'],
         ['Wu Wei-ji'],
         ['Wu Wei-ji', 'Doe, John'],
         ['John Dorn'],
         ['Jhon Doe'],
         ['J. Doe'],
         ['J.T. Doe'],
         ['John Doe', 'Jane Doe'],
         ['Doe, John'],
         ['Doe, J'],
    ];

    for (var i=0;i < data.length; i++) {
        for(var j=i+1; j < data.length; j++) {
            console.log("[%s]\t[%s]\t%d", data[i], data[j], heuristics.compareAuthorLists(data[i], data[j]))
        }
    }
}

function testBestIdentifier(t) {
    t.equals(heuristics.bestIdentifier(["foo", "bar", null, "doi: 10.2"]), "10.2", "prefer a doi");
    t.equals(heuristics.bestIdentifier(["doi: 10.2.v1", "http://doi.org/10.2", "doi: 10.2.v2"]), "10.2", "prefer a short doi");
    t.end();
}

function testBestOf(t) {
    t.deepEquals(heuristics.bestOf([{identifier: '10.1.v1'}, {identifier: '10.1'}]), {identifier: '10.1'});
    t.end();
}

testAuthors();
test("bestOf", testBestOf);
test("bestIdentifier", testBestIdentifier);
