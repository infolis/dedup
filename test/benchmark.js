var MongeElkan = new(require('@kba/simmetrics').similaritymetrics.MongeElkan)

time = process.hrtime();
res1 = MongeElkan.getUnNormalisedSimilarity('Zinn, Jens O.', 'Zinn, Jens');
//res2 = MongeElkan.getUnNormalisedSimilarity('Geier, Wolfgang', 'Ulrich, Gisela');
//differenceRes = res1/2;
diff = process.hrtime(time);

//console.log(res1);
//console.log(res2);
//console.log(differenceRes);
console.log('benchmark took %d nanoseconds', diff[0] * 1e9 + diff[1]);

