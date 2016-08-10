//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');
var async = require('async');
var heuristics = require('./lib/heuristics');

var config = {
    threshold: 0.8,
    url: 'mongodb://localhost:27018/infolis-web',
};

// Return a map of the value of a field mapped to a list of documents that have that value for the field.
function indexBy(collection, field, done) {
    var cursor = collection.find();
    var index = {}
    cursor.each(function(err, doc) {
        if (err) return done(err);
        if (!doc) return done(null, index);
        index[doc[field]] || (index[doc[field]] = []);
        index[doc[field]].push(doc);
    });
}

var client = mongodb.MongoClient;
client.connect(config.url, function (err, db) {
    if (err) throw(new Error("Unable to connect to the MongoDB server", err));
    indexBy(db.collection('entities'), 'name', function (err, index) {
        if (err) throw new Error("Failed to build index");
        console.log("Index size before removing uniqe names", Object.keys(index).length);
        Object.keys(index).map(function(k) { if (index[k].length < 2) delete index[k]; });
        console.log("Index size after removing uniqe names", Object.keys(index).length);
        xxx = 0;
        async.eachOf(index, function(possibleDuplicates, sharedName, callback) {
            // map index-within-possibleDuplicates -> boolean
            var actualDuplicates = {};
            for (var i=0; i < possibleDuplicates.length; i++) {
                for (var j=i+1; j < possibleDuplicates.length; j++) {
                    if (heuristics.compareAuthorLists(possibleDuplicates[i], possibleDuplicates[j]) > config.threshold) {
                        actualDuplicates[i] = true;
                        actualDuplicates[j] = true;
                    }
                }
            }
            console.log(xxx++);
            if(Object.keys(actualDuplicates).length == 0) {
                return async.nextTick(callback);
            }
            console.log("%d duplicates before author check", possibleDuplicates.length);
            console.log("%d duplicates after author check", Object.keys(actualDuplicates).length);
            // TODO
            // var bestOf = heuristics.bestOf(actualDuplicates);
            // for (var k in bestOf) {
            //     possibleDuplicates.map(function(duplicate) { duplicate[k] = bestOf[k]; });
            // }
            // TODO save to db
            return async.nextTick(callback);
        }, function(err) {
            console.log("Finished!");
            db.close(function(err) {
                console.log("DB connection closed!");
            });
        });
    });
});
