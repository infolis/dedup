//quite good default inner similarity function
var MongeElkan = new(require('@kba/simmetrics').similaritymetrics.MongeElkan)

var RE_DOI_IDENTIFIER = /^(doi:\s*|DOI:\s*|https?:\/\/(dx\.)?doi.org\/)?10\.[^\s]+/;

module.exports = {
    "compareAuthorLists": compareAuthorLists,
    "bestOf": bestOf,
    "bestIdentifier": bestIdentifier,
};

// TODO @dommii just a start
function bestIdentifier(identifiers) {
    var best = null;
    for (identifier of identifiers) {
        // Prefer anything over nothing
        if (!best && identifier) {
            best = identifier
        }
        if (RE_DOI_IDENTIFIER.test(identifier)) {
            var doi = identifier.match(/10\.[^\s]+/)[0];
            // Prefer DOI over non doi
            if (! RE_DOI_IDENTIFIER.test(best)) {
                best = doi;
            } else {
                // TODO prefer the longest common prefix
                // TODO handle conflicting dois.
                if (doi.length < best.length) best = doi;
            }
        }
    }
    return best;
}

/**
 * Create a best-of from a set of entities
 *
 * @param {array} entities List of entity objects
 * @return {object} Map of best values for any keys of the input entities
 */
function bestOf(entities) {
    var best = {}
    best.identifier = bestIdentifier(entities.map(function(entity) { return entity.identifier }));
    // TODO @dommii other fields
    // ...

    // Only return usable replacements
    // Object.keys(best).map(function(k) { if (!best[k]) { delete best[k]; } });
    return best;
}

/**
 * Compare two lists of authors.
 *
 * @param {array} authors1 
 * @param {array} authors1 
 * @return {number} The normalised MongeElkan similarity.
 */
function compareAuthorLists(authors1, authors2) {

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
