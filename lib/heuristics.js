//quite good default inner similarity function
var MongeElkan = new(require('@kba/simmetrics').similaritymetrics.MongeElkan)
var async = require('async');

x = module.exports = {};

// Return a map of the value of a field mapped to a list of documents that have that value for the field.
x.indexBy = function indexBy(collection, field, done) {
    var cursor = collection.find();
    var index = {}
    cursor.each(function(err, doc) {
        if (err) return done(err);
        if (!doc) return done(null, index);
        var val = doc[field];
        index[val] || (index[val] = []);
        index[val].push(doc);
    });
}

/**
 * Compare two lists of authors.
 *
 * @param {array} authors1 
 * @param {array} authors1 
 * @return {number} The normalised MongeElkan similarity.
 */
x.compareAuthorLists = function compareAuthorLists(authors1, authors2) {

    // TODO @dommii doubtful if different lengths of authors for the "same thing"
    // if (authors1.length !== authors2.length) {
    //     console.log("Different author lengths, cannot be the same thing")
    //     return 0;
    // }

    // If authors2 is longer than authors1: swap
    if (authors1.length < authors2.length) {
        var t = authors1, authors1 = authors2, authors2 = t;
    }

    // Caluclate similarities
    var sum = 0.0
    authors1.forEach(function(author1) {
        sum += Math.max(authors2.map(function(author2) {
            //MongeElkan is not a symmetric similarity measure!
            //always take the shorter string as first argument to ensure the same results
            // If author2 is shorter than author1, swap
            if (author2.length < author1.length) {
                var t = author1, author2 = author1, author2 = t;
            }
            return MongeElkan.getUnNormalisedSimilarity(author1, author2);
        }));
    });
    //both publications do not have an author!
    if(authors1.length==0) {
        return 0;
    }
    return sum / authors1.length;
}

x.findActualDuplicates = function findActualDuplicates(possibleDuplicates, authorThreshold) {
    // map index-within-possibleDuplicates -> boolean
    var actualDuplicates = {};
    for (var i=0; i < possibleDuplicates.length; i++) {
        for (var j=i+1; j < possibleDuplicates.length; j++) {
            var authorSimilarity = x.compareAuthorLists(possibleDuplicates[i].authors, possibleDuplicates[j].authors);
            if (authorSimilarity > authorThreshold) {
                actualDuplicates[i] = true;
                actualDuplicates[j] = true;
            }
        }
    }
    return Object.keys(actualDuplicates).map(function(idx) { return possibleDuplicates[idx]; });
}

x.removeUniqueKeys = function removeUniqueKeys(index) {
    Object.keys(index).map(function(k) {
        if (index[k].length < 2) {
            delete index[k];
        }
    });
}

x.removeBlacklistedKeys = function removeBlacklistedKeys(index, blacklist) {
    Object.keys(index).map(function(k) {
        // TODO word count
        if (blacklist.some(function(blRe){ return blRe.test(k) })) {
            console.log("Blacklisted, so not deduplicated: " + k);
            delete index[k];
        }
    });
}

x.filterPublications = function filterPublications(index) {
    Object.keys(index).map(function(k) {
        if (index[k][0].entityType !== 'publication') {
            delete index[k];
        }
    });
}

function shortest(vals) {
    var min = Number.MAX_VALUE, minIdx = 0;
    for (var i = 0; i < vals.length; i++) {
        if (vals[i].length < min) {
            min = vals[i].length;
            minIdx = i;
        }
    }
    return vals[minIdx]
}

function longest(vals) {
    var max = -1, maxIdx = 0;
    for (var i = 0; i < vals.length; i++) {
        if (vals[i].length > max) {
            max = vals[i].length;
            maxIdx = i;
        }
    }
    return vals[maxIdx]
}

function mergeLists(lists) {
    var merged = [];
    lists.forEach(function(list) {
        merged = merged.concat(list);
    });
    return merged;
}

// Abstract, Autoren: längstes/längste Liste
// Abstract: längster String
// URL: Kuerzester String
// Identifier, Subjects, Tags, Textual Reference: sind alles Listen, mergen
// Identifier der gemergeten Entity: unspezifiziert, eine der moeglichen aber konsistent
// Alle anderen (duplicate) Entities loeschen
// Ersetzen aller vorherigen Entity-IDs in allen Feldern von
// - EntityLink
// - InfolisFile
// - Keyword
x.mergeDocuments = function mergeDocuments(docs) {
    console.log("Merging duplicates", docs.map(function(doc) { return doc._id }));
    var merged = {};
    var pivot = docs[0];
    Object.keys(pivot).forEach(function(k) {
        var vals = docs.map(function(doc) { return doc[k] });
        if (k === 'url') {
            merged[k] = shortest(vals);
        } else if (k === 'abstractText' || k === 'authors') {
            merged[k] = longest(vals);
        } else if (Array.isArray(pivot[k])) {
            merged[k] = mergeLists(vals);
        } else {
            merged[k] = pivot[k];
        }
    });
    return merged;
}

x.findDuplicates = function findDuplicates(db, collection, field, config, callback) { 
    console.log("Indexing '%s' by '%s'", collection, field);
    var duplicates = {};
    x.indexBy(db.collection(collection), field, function (err, index) {
        if (err) throw new Error("Failed to build index");
        console.log("Initial index size ", Object.keys(index).length);

        x.filterPublications(index);
        console.log("Index size after removing non-publications", Object.keys(index).length);

        x.removeUniqueKeys(index);
        console.log("Index size after removing uniqe names", Object.keys(index).length);

        x.removeBlacklistedKeys(index, config.blacklist);
        console.log("Index size after removing blacklisted", Object.keys(index).length);

        curEntity = 0;
        async.eachOf(index, function(possibleDuplicates, sharedName, done) {
            // console.debug("Processing entity %d ('%s')", curEntity++, sharedName);
            // console.debug("%d duplicates before author check", possibleDuplicates.length);
            var actualDuplicates = x.findActualDuplicates(possibleDuplicates, config.authorThreshold);
            if(actualDuplicates.length == 0) return async.nextTick(done);
            console.log("%d duplicates for '%s'", Object.keys(actualDuplicates).length, sharedName);
            duplicates[sharedName] = {
                replaceWith: x.mergeDocuments(actualDuplicates),
                toReplace: actualDuplicates,
            };
            return async.nextTick(done);
        }, function(err) {
            console.log("Determined entities to merge");
            return callback(err, duplicates)
        });
    });
}
