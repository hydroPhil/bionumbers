function exec() {
    var sparql = "\
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
        PREFIX up: <http://purl.uniprot.org/core/> \
        SELECT ?root_name ?parent_name ?child_name \
        FROM <http://togogenome.org/graph/uniprot/> \
        WHERE \
        { \
          VALUES ?root_name { 'Mammalia' } \
          ?root up:scientificName ?root_name . \
          ?child rdfs:subClassOf+ ?root . \
          ?child rdfs:subClassOf ?parent . \
          ?child up:scientificName ?child_name . \
          ?parent up:scientificName ?parent_name . \
        }";
    var endpoint = "http://togostanza.org/sparql";
    d3sparql.query(endpoint, sparql, render)
}
function render(json) {
  var config = {
    // for d3sparql.tree()
    "root": "root_name",
    "parent": "parent_name",
    "child": "child_name",
    "selector": "#treeview"
  }
  intertree.tree(json, config)
}

function exec_offline() {
  d3.json("hypsibiidae.json", render)
}
function toggle() {
  d3sparql.toggle()
}
$(document).ready(function() {
    // RUN!
    exec();
    $('#treeview').mousedown( function(e){
        e.preventDefault();
//         prefix dwc: <http://rs.tdwg.org/dwc/terms/>
// SELECT ?measurement ?name
// WHERE { ?measurement a dwc:MeasurementOrFact;
//             dwc:organismName ?name .
// FILTER (STR(?name)='Bacteria Escherichia coli') 

// }
// ORDER BY ?predicate
// LIMIT 10
    });
});