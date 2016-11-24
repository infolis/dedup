//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');
var heuristics = require('./lib/heuristics');
var async = require('async');
var config = {
    authorThreshold: 0.8,
    // url: 'mongodb://localhost:27018/infolis-web',
    url: 'mongodb://localhost:27018/dedup-test',
    // weniger als 2 spaces / 3 worte und name in
    // - leerer String
    // - Editorial*
    // - Introduction*
    // - (Zur )?Einführung*
    // - Vorwort
    // - Preface
    //  => Skip
    blacklist: [
        /^$/,
        /^Editorial.*$/,
        /^Introduction$/,
        /^Einleitung$/,
        /^(\w+\s)?Einführung$/,
        /^Vorwort$/,
        /^Preface$/
    ],
    replacements: [
        {collection:'entitylinks', fields: ['fromEntity', 'toEntity']},
        {collection:'infolisfiles', fields: ['manifestsEntity']}
    ]
}

function _replace_in_this_collection_in_these_fields_these_ids_with_this_id(db, collection, fields, ids, newid, callback) {
    db.collection(collection)
        .find({'$or': _build_regexquery(fields, ids)})
        .toArray(function(err, docs) {
            async.each(docs, function(doc, done) {
                console.log("Rewriting %s %s", collection, doc._id);
                fields.forEach(function(field) {
                    ids.forEach(function(oldid) {
                        doc[field] = doc[field].replace(oldid, newid);
                    });
                });
                // console.log("Replacing...");
                db.collection(collection).update({_id:doc._id}, doc, done);
            }, function() {
                // console.log("Done with collection", collection);
                callback();
            });
        });
}

function _build_regexquery(fields, ids) {
    return ids.map(function(id){
        var ret = {};
        fields.forEach(function(field) {
            ret[field] = {'$regex': id + '$'};
        });
        return ret;
    });
}

function closeDB(db) {
    console.log("Closing DB connection");
    db.close(function(err) {
        console.log("DB connection closed");
    });
}

var client = mongodb.MongoClient;
console.log("Establishing DB connection");
client.connect(config.url, function (err, db) {
    if (err) throw(new Error("Unable to connect to the MongoDB server", err));
    console.log("DB connection established");
    heuristics.findDuplicates(db, 'entities', 'name', config, function(err, duplicates) {
        console.log("Duplicates", Object.keys(duplicates).length);
        async.eachOf(duplicates, function(dupl, duplKey, doneDuplicate) {
            // delete old entities
            var ids = dupl.toReplace.map(function(doc){return doc._id;});
            db.collection('entities').deleteMany({$or: ids.map(function(id){return {_id:id};})}, function(err, result) {
                if (err) return doneDuplicate(err);
                // console.log("Deleted entities");
                db.collection('entities').insert(dupl.replaceWith, function(err, result) {
                    if (err) return doneDuplicate(err);
                    // console.log("Inserted merged entity");
                    async.each(config.replacements, function(repl, doneCollection) {
                        // console.log(repl);
                        _replace_in_this_collection_in_these_fields_these_ids_with_this_id(
                            db, repl.collection, repl.fields, ids, dupl.replaceWith, doneCollection);
                    }, function() {
                        doneDuplicate();
                    });
                });
            });
        }, function() { closeDB(db); });
    });
});
