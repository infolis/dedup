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

		//get the necessary collections containing entities and links
        var collection = db.collection('entities');
        var collectionLinks = db.collection('entitylinks');

		//generate a map with fromEntities as keys and the links as values
        var links = {};
        collectionLinks.find({}).toArray(function (err, result) {
        result.forEach(function (o) {
        //console.log(o);
        var k = links[o.fromEntity];
                if (k == null) {
                    k = [o];
                }
                else {
                    k.push(o);
                }
                links[o.fromEntity] = k;
            });
        
        console.log(Object.keys(links).length);

		//create a map with entity name as key and the according entities as values
		//only entities with exactly the same name are considered, all others 
		//will not be detected as duplicates
		var values = {};
        collection.find({}).toArray(function (err, result) {
            if (result.length) {
                //	console.log('Found:', result);
            }

            result.forEach(function (o) {
                //for now, check that the author field is not empty
                if (o.authors == null || o.authors.length==0) {
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

			//create a map containing duplicates with the name of the entities as key and the entities itself as values
			//it iterates thourgh all the entries of the values map and filters out those that are no duplicates
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
			
			//iterate through the entities that are determined as duplicates
            for (var keyToDedup in duplicates) {
                console.log('key: ', keyToDedup);
                console.log('values: ', duplicates[keyToDedup]);
				//generate an artificial entity which serves as the deduplicated entitiy
				var name = keyToDedup + "_" + duplicates[keyToDedup][0].authors + "_dedup";
				//TODO: add all the attributes we have for entities
			    var duplicatedEntity = {name:""+name+"",authors:""+duplicates[keyToDedup][0].authors+"",identifier:"domi987"}
			    console.log("duplciatedEnt: " + duplicatedEntity.name);
				
				//insert the artificial entitiy 
				//TODO: not working but inserting worked at some point of time... also tries with insert etc.
                collection.insertOne(duplicatedEntity, function(err, records) {
                     console.log("Record added as " + records[0]._id);
                });
				
				
				//iterate through all entities that are going to be deleted because they can be deduplicated
				for(var entitiesToDelete in duplicates[keyToDedup]) {
					console.log("entity to deduplicate: " + duplicates[keyToDedup][entitiesToDelete]._id);
					//iterate through all links that have a deduplication entity in their fromEntity attribute
					//update the link in the database by replace the fromEntity with the artificial entity
					for(var fromEntity in links) {
						//build the full ID to compare with the ID coming from the fromEntity of the link
						var fullID = "http://infolis.gesis.org/infolink/api/entity/"+duplicates[keyToDedup][entitiesToDelete]._id;
						//check whether the entity is a fromEntity of an entity link 
						//TODO: actually replace it, currently not done because the artifical entities are not in the database
						//and the existing links should not be overwritten (jsut testing the update functionality)
						if(fromEntity == fullID) {
								for(var singleLink in links[fromEntity]) {
									console.log("link to update " +links[fromEntity][singleLink]._id);
									collectionLinks.update(
										{ '_id' : "f2f48b30-5e0c-11e6-9a36-8b1194111ba4" }, 
										{ $set: { 'fromEntity':  "567"} },
										function (err, result) {
											console.log(result);
										});
								}
						}
					}
					//TODO: delete all single entities that are duplicates
					//collection.remove( {             
						//_id: "5751635262a809e313539bf9"               
					//});
				}
            }
		db.close();
        });
	});
	
    }
});