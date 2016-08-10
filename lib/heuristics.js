//quite good default inner similarity function
var MongeElkan = new(require('@kba/simmetrics').similaritymetrics.MongeElkan)

module.exports = {
    "compareAuthorLists": function compareAuthorLists(authors1, authors2) {
        // console.log('first: ', authors1);
        // console.log('second: ', authors2);

        //determine the shorter author list
        var largerAuthorList;
        if (authors1.length > authors2.length) {
            largerAuthorList = authors1.length;
        }
        else {
            largerAuthorList = authors2.length;
        }
        var sum = parseFloat('0.0');

        for (var k = 0; k < authors1.length; k++) {
            var max = parseFloat('0.0');
            for (var l = 0; l < authors2.length; l++) {

                //MongeElkan is not a symmetric similarity measure!
                //always take the shorter string as first argument to ensure the same results
                var res1;
                if (authors1[k].length < authors2[l]) {
                    res1 = MongeElkan.getUnNormalisedSimilarity(authors1[k], authors2[l]);
                }
                else {
                    res1 = MongeElkan.getUnNormalisedSimilarity(authors2[l], authors1[k]);
                }
                // console.log('res:', res1);
                if (parseFloat(res1) > max) {
                    max = res1;
                    // console.log('max: ', max);
                }
            }
            sum = parseFloat(sum) + parseFloat(max);
            // console.log('sum: ', sum);
        }
        var similarity = sum / parseFloat(largerAuthorList);
        // console.log('sim: ', similarity);
        return similarity;

    }
};
