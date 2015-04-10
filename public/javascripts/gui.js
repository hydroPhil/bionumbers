// var external_endpoint = "http://localhost:5820/bionumbers2/query";
var external_endpoint = 'http://hydrophil.ngrok.com/bionumbers2/query'
var uniprot_endpoint = "http://togostanza.org/sparql"
jQuery.fn.d3Click = function () {
  this.each(function (i, e) {
    var evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);

    e.dispatchEvent(evt);
  });
};

// sparql query from uniprot taxonomy for different species
function exec_spec() {
    // get all present queries from bionumbers
    var sparql = "\
        PREFIX owl: <http://www.w3.org/2002/07/owl#> \
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
        prefix dwc: <http://rs.tdwg.org/dwc/terms/> \
        SELECT DISTINCT ?name \
        WHERE { ?property a dwc:MeasurementOrFact; \
                          dwc:organismName ?name . \
        } \
    ";
    var url = external_endpoint + "?query=" + encodeURIComponent(sparql)
    var mime = "application/sparql-results+json"
    // specialized query
    d3.xhr(url, mime, function(request) {
        var json = JSON.parse(request.responseText)
        var species_list =[];
        $.each(json.results.bindings, function() {
            // get latin name from last two strings
            var species = this.name.value.split(" ").slice(-2).join(" ");
            species_list[species_list.length] = species;
        });
        // user shorter list, otherwise the query doesn't work
        var limit =100;
        for (var i = 0; i < limit; i++) {
            species_list[i] = "?scientific_name = '" + species_list[i] + "' ";
        };
        // query with species filter, right now limited too 100 species
        var filter_string = species_list.slice(1,limit).join(' || ');
        var sparql = "\
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
            PREFIX up: <http://purl.uniprot.org/core/> \
            SELECT DISTINCT ?root_name ?parent_name ?child_name \
            FROM <http://togogenome.org/graph/uniprot/> \
            WHERE \
            { \
              VALUES ?root_name { 'cellular organisms' } \
              ?root up:scientificName ?root_name .  \
              ?child rdfs:subClassOf+ ?root . \
              ?child rdfs:subClassOf ?parent . \
              ?child up:scientificName ?child_name . \
              ?parent up:scientificName ?parent_name . \
              { \
                ?child (^rdfs:subClassOf*)/up:scientificName ?scientific_name \
                FILTER (" + filter_string + ") \
              } \
            }";
        d3sparql.query(uniprot_endpoint, sparql, render_spec);
    })
}
// sparql query from bionumbers for different properties
function exec_prop() {
    var sparql = "\
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
        SELECT DISTINCT ?root_name ?parent_name ?child_name \
        WHERE \
        { \
          VALUES ?root_name { 'property' } \
          ?root rdfs:label ?root_name . \
          ?child rdfs:subPropertyOf+ ?root . \
          ?child rdfs:subPropertyOf ?parent . \
          ?child rdfs:label ?child_name . \
          ?parent rdfs:label ?parent_name . \
        }";
    d3sparql.query(external_endpoint, sparql, render_prop);
}

// render json and build tree
function render_spec(json) {
  var config = {
    // for d3sparql.tree()
    "root": "root_name",
    "parent": "parent_name",
    "child": "child_name",
    "selector": "#spec_treeview"
  };
  $('#json-dump').html(JSON.stringify(json.results.bindings));
    // add stuff to search input
    var datalist = " ";
    $.each(json.results.bindings, function() {
       datalist += "<option value ='" + this.child_name.value + "'>";
    });
    $('#spec_datalist').html(datalist);
    // empty div
    $('#spec_treeview').empty();
    // build tree
  intertree.tree(json, config);
}

// render json and build tree
function render_prop(json) {
    var config = {
    // for d3sparql.tree()
    "root": "root_name",
    "parent": "parent_name",
    "child": "child_name",
    "selector": "#prop_treeview"
    };
    // dump json
    $('#json-dump').html(JSON.stringify(json.results.bindings));
    // add stuff to search input
    var datalist = " ";
    $.each(json.results.bindings, function() {
       datalist += "<option value ='" + this.child_name.value + "'>";
    });
    $('#prop_datalist').html(datalist);
    // empty div
    $('#prop_treeview').empty();
    // build tree
    intertree.tree(json, config);
}

function render_prop_table(json) {
    // console.log(JSON.stringify(json.results));
    var tableContent = '';
    $.each(json.results.bindings, function(){
        // rest call to get year of publication
        // var link = this.link.value;
        // var link_list = link.replace("<","").replace(">","").split("/");
        // var id = link_list[link_list.length -1];
        // var rest_link = "http://www.ebi.ac.uk/europepmc/webservices/rest/search/query=ext_id:"+id+"%20src:med&format=json"
        // $.getJSON(rest_link, function(data){
        //     var year = data.resultList.result[0].pubYear;
        //     console.log(year);
        // });
        tableContent += '<tr>';
        tableContent += '<td>' + this.name.value + '</td>';
        tableContent += '<td>' + this.value.value + '</td>';
        tableContent += '<td>' + this.unit.value + '</td>';
        tableContent += '<td>' + this.organism.value + '</td>';
        tableContent += '</tr>';
    });
    $('#proptable tbody').html(tableContent);
}

function render_spec_table(json) {
    // console.log(JSON.stringify(json.results));
    var tableContent = '';
    $.each(json.results.bindings, function(){
        tableContent += '<tr>';
        tableContent += '<td>' + this.name.value + '</td>';
        tableContent += '<td>' + this.value.value + '</td>';
        tableContent += '<td>' + this.unit.value + '</td>';
        tableContent += '<td>' + this.organism.value + '</td>';
        tableContent += '</tr>';
    });
    $('#proptable tbody').html(tableContent);
}

// assigned in intertree.js afer updating the tree
function nodeclick(thisnode){
    // get children from each clicked node to create query
    var findchildren = function(name,json,list) {
        for (var i = 0; i < json.length; i++) {
            var current = json[i].parent_name.value;
            var child = json[i].child_name.value;
            if (current == name) {
                // check if not in list
                if (list.indexOf(child) == -1) {
                    list[list.length] = child;
                    findchildren(child,json,list);
                }
            }
        }
        return list;
    }
    // build tree according to which div is present
    if ($('#spec_treeview').length) {
        species = $(thisnode).find('text').html();
        $('#specname').html(species);
        var json = JSON.parse($('#json-dump').html());
        // get children
        var children_list = findchildren(species,json,[]);
        // add species itself
        children_list[children_list.length]=species;
        for (var i = 0; i < children_list.length; i++) {
            children_list[i] = "regex(STR(?organism),'" + children_list[i] + "','i')"
        };
        // set limit to species, otherwise query takes too long
        var max_elements = 30;
        if (children_list.length>max_elements) {
            children_list = children_list.slice(1,max_elements);
        };
        var filter_string = children_list.join(" || ");
        // query with case insensitive filter
        var sparql = "\
        prefix dwc: <http://rs.tdwg.org/dwc/terms/> \
        SELECT ?name ?value ?unit ?organism\
        WHERE { ?property a dwc:MeasurementOrFact; \
                          dwc:measurementType ?name ; \
                          dwc:measurementValue ?value ; \
                          dwc:measurementUnit ?unit ; \
                          dwc:organismName ?organism . \
        FILTER (" + filter_string + ") \
        } LIMIT 50";
        d3sparql.query(external_endpoint, sparql, render_spec_table);

    } else if ($('#prop_treeview').length) {
        property = $(thisnode).find('text').html();
        $('#propname').html(property);
        var json = JSON.parse($('#json-dump').html());
        // get children
        var children_list = findchildren(property,json,[]);
        // add property itself
        children_list[children_list.length]=property;
        for (var i = 0; i < children_list.length; i++) {
            children_list[i] = "regex(STR(?name),'" + children_list[i] + "','i')"
        };
        // set limit to property, otherwise query takes too long
        var max_elements = 20;
        if (children_list.length>max_elements) {
            children_list = children_list.slice(1,max_elements);
        };
        var filter_string = children_list.join(" || ");
        // query with case insensitive filter
        var sparql = "\
        prefix dwc: <http://rs.tdwg.org/dwc/terms/> \
        SELECT ?name ?value ?unit ?organism \
        WHERE { ?property a dwc:MeasurementOrFact; \
                          dwc:measurementType ?name ; \
                          dwc:measurementValue ?value ; \
                          dwc:measurementUnit ?unit ; \
                          dwc:organismName ?organism . \
        FILTER (" + filter_string + ") \
        } LIMIT 50";
        d3sparql.query(external_endpoint, sparql, render_prop_table);
    }
}
$(document).ready(function() {
    // RUN!
    // check which div is present
    if ($('#spec_treeview').length) {
        exec_spec();
    } else if ($('#prop_treeview').length) {
        exec_prop();
    }
    // search function
    $("#search_input").bind('input', function () {
        var query = $(this).val();
        if (query.length > 4) {
            console.log(query);
            $('text:contains("' + query +'")').filter(function(){
                if ($(this).text() === query) {
                    console.log($(this).text());
                    $(this).d3Click();
                };
            });
        };
    });
});