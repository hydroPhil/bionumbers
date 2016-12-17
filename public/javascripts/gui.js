// var external_endpoint = "http://localhost:5820/bionumbers2/query";
var external_endpoint = 'http://af6480fd.ngrok.io/bionumbers2/query'

var uniprot_endpoint = "http://togostanza.org/sparql"

// specific click handler for d3 elements
jQuery.fn.d3Click = function () {
  this.each(function (i, e) {
    var evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);

    e.dispatchEvent(evt);
  });
};

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
        //  get bionumber from uri
        var bionumber = this.property.value.split('/')[4];
        // create link to bionumbers database
        var linkstring = '<a target="_blank" href="http://bionumbers.hms.harvard.edu/bionumber.aspx?&id=' + bionumber + '">'
        // check if value exists, otherwise use range
        if (typeof this.value != "undefined") {
            var valuestring = this.value.value;
        } else {
            var valuestring = this.range.value;
        }
        tableContent += '<tr>';
        tableContent += '<td>' + linkstring + this.name.value + '</a></td>';
        tableContent += '<td>' + valuestring + '</td>';
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
    // remove selected classes
    d3.selectAll(".node ").classed("selected", false);
    // show csv button
    
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
        SELECT ?property ?name ?value ?unit ?organism ?range \
        WHERE { ?property a dwc:MeasurementOrFact; \
                        dwc:measurementType ?name ; \
                        dwc:measurementUnit ?unit ; \
                        dwc:organismName ?organism . \
                        OPTIONAL { ?property bion2:measurementRange ?range } . \
                        OPTIONAL { ?property dwc:measurementValue ?value } \
        FILTER (" + filter_string + ") \
        } LIMIT 50";
        d3sparql.query(external_endpoint, sparql, render_prop_table);
    }
}

// function that tries to click a node and waits until it is there
function try_node(query) {
    if (!$('text:contains("' + query +'")').size()) {
        window.requestAnimationFrame(try_node);
    } else {
        $('text:contains("' + query +'")').filter(function(){
            if ($(this).text() === query) {
                console.log($(this).text());
                $(this).d3Click();
                d3.select(this.parentNode).classed('selected',true)
            };
        });
    }
}
// from https://bl.ocks.org/kalebdf/ee7a5e7f44416b2116c0
function exportTableToCSV($table, filename) {
    var $headers = $table.find('tr:has(th)')
        ,$rows = $table.find('tr:has(td)')

        // Temporary delimiter characters unlikely to be typed by keyboard
        // This is to avoid accidentally splitting the actual contents
        ,tmpColDelim = String.fromCharCode(11) // vertical tab character
        ,tmpRowDelim = String.fromCharCode(0) // null character

        // actual delimiter characters for CSV format
        ,colDelim = '","'
        ,rowDelim = '"\r\n"';

        // Grab text from table into CSV formatted string
        var csv = '"';
        csv += formatRows($headers.map(grabRow));
        csv += rowDelim;
        csv += formatRows($rows.map(grabRow)) + '"';

        // Data URI
        var csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);

    // For IE (tested 10+)
    if (window.navigator.msSaveOrOpenBlob) {
        var blob = new Blob([decodeURIComponent(encodeURI(csv))], {
            type: "text/csv;charset=utf-8;"
        });
        navigator.msSaveBlob(blob, filename);
    } else {
        $(this)
            .attr({
                'download': filename
                ,'href': csvData
                //,'target' : '_blank' //if you want it to open in a new window
        });
    }

    //------------------------------------------------------------
    // Helper Functions 
    //------------------------------------------------------------
    // Format the output so it has the appropriate delimiters
    function formatRows(rows){
        return rows.get().join(tmpRowDelim)
            .split(tmpRowDelim).join(rowDelim)
            .split(tmpColDelim).join(colDelim);
    }
    // Grab and format a row from the table
    function grabRow(i,row){
         
        var $row = $(row);
        //for some reason $cols = $row.find('td') || $row.find('th') won't work...
        var $cols = $row.find('td'); 
        if(!$cols.length) $cols = $row.find('th');  

        return $cols.map(grabCol)
                    .get().join(tmpColDelim);
    }
    // Grab and format a column from the table 
    function grabCol(j,col){
        var $col = $(col),
            $text = $col.text();

        return $text.replace('"', '""'); // escape double quotes

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
    $("#search_input").on('input', function () {
        var findparents = function(name,json,list) {
            for (var i = 0; i < json.length; i++) {
                var parent = json[i].parent_name.value;
                var current = json[i].child_name.value;
                if (current == name) {
                    // check if not in list
                    if (list.indexOf(parent) == -1) {
                        list[list.length] = parent;
                        findparents(parent,json,list);
                        return list
                    }
                } 
            }
        }
        var query = $(this).val();
        if($('#prop_datalist option').filter(function(){
            return this.value === query;        
        }).length) {
            
            //send ajax request
            // alert(this.value);
            var json = JSON.parse($('#json-dump').html());
            // create list of parents from json dump
            var parent_list = findparents(query, json, []) || [];
            parent_list = parent_list.reverse();
            // replace last element with query
            parent_list[parent_list.length] = query;
            parent_list = parent_list.slice(1, parent_list.length)
            console.log(parent_list)
            d3.selectAll(".node ").classed("selected", false);
            for (var i = 0; i < parent_list.length; i++) {
                parent = parent_list[i];
                try_node(parent);
            }
        }
    });
    $('#csvexport').click(function(event) {
        /* Act on the event */
    });
});