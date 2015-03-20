function exec_spec() {
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
    d3sparql.query(endpoint, sparql, render_spec)
}
function exec_prop() {
    var sparql = "\
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
        SELECT ?root_name ?parent_name ?child_name \
        WHERE \
        { \
          VALUES ?root_name { 'property' } \
          ?root rdfs:label ?root_name . \
          ?child rdfs:subPropertyOf+ ?root . \
          ?child rdfs:subPropertyOf ?parent . \
          ?child rdfs:label ?child_name . \
          ?parent rdfs:label ?parent_name . \
        }";
    var endpoint = "http://localhost:5820/bioprops/query/";
    d3sparql.query(endpoint, sparql, render_prop)
}
function render_spec(json) {
  var config = {
    // for d3sparql.tree()
    "root": "root_name",
    "parent": "parent_name",
    "child": "child_name",
    "selector": "#spec_treeview"
  }
  intertree.tree(json, config)
}

function render_prop(json) {
  var config = {
    // for d3sparql.tree()
    "root": "root_name",
    "parent": "parent_name",
    "child": "child_name",
    "selector": "#prop_treeview"
  }
  intertree.tree(json, config)
}

$(document).ready(function() {
    // RUN!
    if ($('#spec_treeview').length) {
        exec_spec();
    } else if ($('#prop_treeview').length) {
        exec_prop();
    }
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