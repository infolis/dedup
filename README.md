# dedup
## Algorithm

### Find step

* indexName = {}
* Find list of unique `name` in entities
* for nameList in name
  * find entities with same name, n > 0
    * for entity in possible duplicates
      * compare authors
      * if mongeElkan > Threshold
        * indeName[name].push entities

### Dedup

* for name in indexName
  * bestVersion = indexName[name][0]
  * bestVersion.identifier = bestIdentifier(map{$_.identifier})
  * bestVersion.authors = bestIdentifier(map{$_.identifier})
  * bestVersion.subjects = bestIdentifier(map{$_.identifier})
  * bestVersion.abstractText = bestIdentifier(map{$_.identifier})
  * bestVersion.blaspatialdingens = bestIdentifier(map{$_.identifier})
  DB.replace …
