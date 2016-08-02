//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');
var MongeElkan = require('@kba/simmetrics').similaritymetrics.MongeElkan;
var TokeniserWhitespace = require('@kba/simmetrics').tokenisers.TokeniserWhitespace;
var Levenshtein = require('@kba/simmetrics').similaritymetrics.Levenshtein;
var Jaro = require('@kba/simmetrics').similaritymetrics.Jaro;

//var innerMetric = new Levenshtein();
var innerMetric = new Jaro();
var tokenizer = new TokeniserWhitespace();

//var res, test = new MongeElkan(tokenizer,innerMetric);

//quite good default inner similarity function
var res1, res2, test = new MongeElkan();

time = process.hrtime();
res1 = test.getUnNormalisedSimilarity('Zinn, Jens O.', 'Zinn, Jens');
//res2 = test.getUnNormalisedSimilarity('Geier, Wolfgang', 'Ulrich, Gisela');
//differenceRes = res1/2;
diff = process.hrtime(time);

//console.log(res1);
//console.log(res2);
//console.log(differenceRes);
console.log('benchmark took %d nanoseconds', diff[0] * 1e9 + diff[1]);

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;


// Connection URL. This is where your mongodb server is running.
var url = 'mongodb://localhost:27018/infolis-web';

// Use connect method to connect to the Server
MongoClient.connect(url, function (err, db) {
    if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
        //HURRAY!! We are connected. :)
        console.log('Connection established to', url);


        var collection = db.collection('entities');

//    collection.find({name: 'string'}).toArray(function (err, result) {
//      if (err) {
//        console.log(err);
//      } else if (result.length) {
//        console.log('Found:', result);
//      } else {
//        console.log('No document(s) found with defined "find" criteria!');
//      }

        collection.find({}).toArray(function (err, result) {
            if (result.length) {
                //	console.log('Found:', result);
            }

            var values = {};
            result.forEach(function (o) {
                //for now, check that the author field is not empty
                //TODO: delete this entity!
                if (o.authors == null || o.identifier == 'domi123') {
                    return;
                }
                var l = values[o.name];
                if (l == null) {
                    l = [o];
                }
                else {
                    l.push(o);
                }
                values[o.name] = l;
            });
            //           console.log('Found:', values);

            var duplicates = {};

            for (var key in values) {
                var possibleDedup = values[key];
                for (var i = 0; i < possibleDedup.length; i++) {
                    var firstPub = possibleDedup[i];
                    for (var j = 1; j < possibleDedup.length; j++) {
                        if (i >= j) {
                            continue;
                        }
                        var secondPub = possibleDedup[j];

                        console.log('first: ', firstPub.authors);
                        console.log('second: ', secondPub.authors);

                        //determine the shorter author list
                        var largerAuthorList;
                        if (firstPub.authors.length > secondPub.authors.length) {
                            largerAuthorList = firstPub.authors.length;
                        }
                        else {
                            largerAuthorList = secondPub.authors.length;
                        }
                        var sum = parseFloat('0.0');

                        for (var k = 0; k < firstPub.authors.length; k++) {
                            var max = parseFloat('0.0');
                            for (var l = 0; l < secondPub.authors.length; l++) {

                                //MongeElkan is not a symmetric similarity measure!
                                //always take the shorter string as first argument to ensure the same results
                                if (firstPub.authors[k].length < secondPub.authors[l]) {
                                    res1 = test.getUnNormalisedSimilarity(firstPub.authors[k], secondPub.authors[l]);
                                }
                                else {
                                    res1 = test.getUnNormalisedSimilarity(secondPub.authors[l], firstPub.authors[k]);
                                }
                                console.log('res:', res1);
                                if (parseFloat(res1) > max) {
                                    max = res1;
                                    console.log('max: ', max);
                                }
                            }
                            sum = parseFloat(sum) + parseFloat(max);
                            console.log('sum: ', sum);
                        }
                        var similarity = sum / parseFloat(largerAuthorList);
                        console.log('sim: ', similarity);
                        //TODO: threshold?
                        if (similarity > 0.8) {
                            //create a map name-entities indicating duplicates
                            var l = duplicates[key];
                            if (l == null) {
                                l = [firstPub, secondPub];
                            }
                            else {
                                l.push(firstPub);
                                l.push(secondPub)
                            }
                            duplicates[key] = l;
                        }
                    }
                }
            }

            for (var keyToDedup in duplicates) {
                console.log('key: ', keyToDedup);
                console.log('values: ', duplicates[keyToDedup]);
                collection.insert( {
                    //TODO: hwo to ensure that further entities can be added to the group? 
                    //if we modify the name, it will currently not been found
                    "name" : keyToDedup + "_" + duplicates[keyToDedup][0].authors + "_dedup" ,
                    "authors" : duplicates[keyToDedup][0].authors,
                    "identifier" : "domi1234"                    
                });
                //TODO: delete all single entities that are duplicates
                collection.remove( {             
                    _id: "5751635262a809e313539bf9"               
                });
            }

            //Close connection
      //      insertDocument(db, function () {
                db.close();
   //         });

        });
    }
});

var insertDocument = function (db, callback) {
    db.collection('entities').insertOne({
        "name": "test",
        "authors": ["autor 1"],
        "identifier": "domi123"
    }, function (err, result) {
        assert.equal(err, null);
        console.log("Inserted a document into the restaurants collection.");
        callback();
    });
};
