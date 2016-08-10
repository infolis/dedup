var test = require('tape');
var dedup = require('../dedup');

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
        console.log("[%s]\t[%s]\t%d", data[i], data[j], dedup.compareAuthors(data[i], data[j]))
    }
}
