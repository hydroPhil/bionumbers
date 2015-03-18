//
// d3sparql.js - utilities for visualizing SPARQL results with the D3 library
//
//   Web site: http://github.com/ktym/d3sparql/
//   Copyright: 2013, 2014 (C) Toshiaki Katayama (ktym@dbcls.jp)
//   Initial version: 2013-01-28
//

var d3sparql = {
  version: "d3sparql.js version 2015-02-04"
}

/*
  Execute a SPARQL query and pass the result to a given callback function

  Synopsis:
    <!DOCTYPE html>
    <meta charset="utf-8">
    <html>
     <head>
      <script src="http://d3js.org/d3.v3.min.js"></script>
      <script src="d3sparql.js"></script>
      <script>
       function exec() {
         var endpoint = d3.select("#endpoint").property("value")
         var sparql = d3.select("#sparql").property("value")
         d3sparql.query(endpoint, sparql, render)
       }
       function render(json) {
         // set options and call the d3xxxxx function in this library ...
         var config = { ... }
         d3sparql.xxxxx(json, config)
       }
      </script>
      <style>
      <!-- customize CSS -->
      </style>
     </head>
     <body onload="exec()">
      <form style="display:none">
       <input id="endpoint" value="http://dbpedia.org/sparql" type="text">
       <textarea id="sparql">
        PREFIX ...
        SELECT ...
        WHERE { ... }
       </textarea>
      </form>
     </body>
    </html>
*/
d3sparql.query = function(endpoint, sparql, callback) {
  var url = endpoint + "?query=" + encodeURIComponent(sparql)
  console.log(endpoint)
  console.log(url)
  var mime = "application/sparql-results+json"
  d3.xhr(url, mime, function(request) {
    var json = request.responseText
    console.log(json)
    callback(JSON.parse(json))
  })
/*
  d3.json(url, function(error, json) {
    console.log(error)
    console.log(json)
    callback(json)
  })
*/
}

/*
  Convert sparql-results+json object into a JSON graph in the {"nodes": [], "links": []} form.
  Suitable for d3.layout.force(), d3.layout.sankey() etc.

  Options:
    config = {
      "key1":   "SPARQL variable name for node1",
      "key2":   "SPARQL variable name for node2",
      "label1": "SPARQL variable name for the label of node1",  // optional
      "label2": "SPARQL variable name for the label of node2",  // optional
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.forcegraph(json, config)
      d3sparql.sankey(json, config)
    }

  TODO:
    Should nodes hold value (in what key name)?
*/
d3sparql.graph = function(json, config) {
  var head = json.head.vars
  var data = json.results.bindings

  var opts = {
    "key1":   config.key1   || head[0] || "key1",
    "key2":   config.key2   || head[1] || "key2",
    "label1": config.label1 || head[2] || false,  // optional
    "label2": config.label2 || head[3] || false,  // optional
  }
  var graph = {
    "nodes": [],
    "links": []
  }
  var check = d3.map()
  var index = 0
  for (var i = 0; i < data.length; i++) {
    var key1 = data[i][opts.key1].value
    var key2 = data[i][opts.key2].value
    var label1 = opts.label1 ? data[i][opts.label1].value : key1
    var label2 = opts.label2 ? data[i][opts.label2].value : key2
    if (!check.has(key1)) {
      graph.nodes.push({"key": key1, "label": label1})
      check.set(key1, index)
      index++
    }
    if (!check.has(key2)) {
      graph.nodes.push({"key": key2, "label": label2})
      check.set(key2, index)
      index++
    }
    graph.links.push({"source": check.get(key1), "target": check.get(key2)})
  }
  return graph
}

/*
  Convert sparql-results+json object into a JSON graph in the {"name": name, "size": size, "children": []} form.
  Suitable for d3.layout.hierarchy() family cluster (dendrogram), pack (circlepack), partition (sunburst), tree (roundtree), treemap (treemap)

  Options:
    config = {
      "root": "value for root node",
      "parent": "SPARQL variable name for parent node",
      "child": "SPARQL variable name for child node",
    }

  Synopsis:
    d3sparql.sparql(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.roundtree(json, config)
      d3sparql.dendrogram(json, config)
      d3sparql.sunburst(json, config)
      d3sparql.treemap(json, config)
    }
*/
d3sparql.tree = function(json, config) {
  var head = json.head.vars
  var data = json.results.bindings

  var opts = {
    "root":   config.root   || head[0],
    "parent": config.parent || head[1],
    "child":  config.child  || head[2],
  }

  var tree = d3.map()
  var parent = child = children = true
  var root = data[0][opts.root].value
  for (var i = 0; i < data.length; i++) {
    parent = data[i][opts.parent].value
    child = data[i][opts.child].value
    if (parent != child) {
      if (tree.has(parent)) {
        children = tree.get(parent)
        children.push(child)
        tree.set(parent, children)
      } else {
        children = [child]
        tree.set(parent, children)
      }
    }
  }
  function traverse(node) {
    var list = tree.get(node)
    if (list) {
      var children = list.map(function(d) {return traverse(d)})
      var subtotal = d3.sum(children, function(d) {return d.size})
      return {"name": node, "children": children, "size": subtotal}
    } else {
      return {"name": node, "size": 1}
    }
  }
  return traverse(root)
}


/*
  Rendering sparql-results+json object into a round tree

  References:
    http://bl.ocks.org/4063550  Reingold-Tilford Tree

  Options:
    config = {
      "diameter": 800,  // diameter of canvas
      "angle": 360,     // angle of arc (less than 360 for wedge)
      "depth": 200,     // depth of arc (less than diameter/2 - label length to fit)
      "radius": 5,      // radius of node circles
      "selector": "#result"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.roundtree(json, config)
    }

  CSS/SVG:
    <style>
    .link {
      fill: none;
      stroke: #ccc;
      stroke-width: 1.5px;
    }
    .node circle {
      fill: #fff;
      stroke: darkgreen;
      stroke-width: 1.5px;
      opacity: 1;
    }
    .node text {
      font-size: 10px;
      font-family: sans-serif;
    }
    </style>
*/
d3sparql.roundtree = function(json, config) {
  var tree = d3sparql.tree(json, config)
  //console.log(JSON.stringify(tree))

  var opts = {
    "diameter":  config.diameter || 800,
    "angle":     config.angle    || 360,
    "depth":     config.depth    || 200,
    "radius":    config.radius   || 5,
    "selector":  config.selector || "#result"
  }

  var tree_layout = d3.layout.tree()
    .size([opts.angle, opts.depth])
    .separation(function(a, b) {return (a.parent === b.parent ? 1 : 2) / a.depth})
  var nodes = tree_layout.nodes(tree)
  var links = tree_layout.links(nodes)
  var diagonal = d3.svg.diagonal.radial()
    .projection(function(d) {return [d.y, d.x / 180 * Math.PI]})
  var svg = d3.select(opts.selector).html("").append("svg")
    .attr("width", opts.diameter)
    .attr("height", opts.diameter)
    .append("g")
    .attr("transform", "translate(" + opts.diameter / 2 + "," + opts.diameter / 2 + ")")
  var link = svg.selectAll(".link")
    .data(links)
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("d", diagonal)
  var node = svg.selectAll(".node")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", function(d) {return "rotate(" + (d.x - 90) + ") translate(" + d.y + ")"})
  var circle = node.append("circle")
    .attr("r", opts.radius)
  var text = node.append("text")
    .attr("dy", ".35em")
    .attr("text-anchor", function(d) {return d.x < 180 ? "start" : "end"})
    .attr("transform", function(d) {return d.x < 180 ? "translate(8)" : "rotate(180) translate(-8)"})
    .text(function(d) {return d.name})

  // default CSS/SVG
  link.attr({
    "fill": "none",
    "stroke": "#cccccc",
    "stroke-width": "1.5px",
  })
  circle.attr({
    "fill": "#ffffff",
    "stroke": "steelblue",
    "stroke-width": "1.5px",
    "opacity": 1,
  })
  text.attr({
    "font-size": "10px",
    "font-family": "sans-serif",
  })

  // for IFRAME embed
  //d3.select(self.frameElement).style("height", opts.diameter * 2 + "px")
}


/*
  Rendering sparql-results+json object into a treemap

  References:
    http://bl.ocks.org/4063582  Treemap

  Options:
    config = {
      "width": 900,    // canvas width
      "height": 4500,  // canvas height
      "margin": 10,    // margin around the treemap
      "radius": 5,     // radius of node circles
      "selector": "#result"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.treemap(json, config)
    }

  CSS/SVG:
    <style>
    .node {
      border: solid 1px white;
      font: 10px sans-serif;
      line-height: 12px;
      overflow: hidden;
      position: absolute;
      text-indent: 2px;
    }
    </style>
*/
d3sparql.treemap = function(json, config) {
  var tree = d3sparql.tree(json, config)

  var opts = {
    "width":    config.width    || 800,
    "height":   config.height   || 500,
    "margin":   config.margin   || 10,
    "selector": config.selector || "#result"
  }

  var width  = opts.width - opts.margin * 2
  var height = opts.height - opts.margin * 2
  var color = d3.scale.category20c()
  var treemap = d3.layout.treemap()
    .size([width, height])
    .sticky(true)
    .value(function(d) {return d.size})
  var div = d3.select(opts.selector).html("").append("div")
    .style("position", "relative")
    .style("width", opts.width + "px")
    .style("height", opts.height + "px")
    .style("left", opts.margin + "px")
    .style("top", opts.margin + "px")
  var node = div.datum(tree).selectAll(".node")
    .data(treemap.nodes)
    .enter()
    .append("div")
    .attr("class", "node")
    .call(position)
    .style("background", function(d) {return d.children ? color(d.name) : null})
    .text(function(d) {return d.children ? null : d.name})

  // default CSS/SVG
  node.style({
    "border-style": "solid",
    "border-width": "1px",
    "border-color": "white",
    "font-size": "10px",
    "font-family": "sans-serif",
    "line-height": "12px",
    "overflow": "hidden",
    "position": "absolute",
    "text-indent": "2px",
  })

  function position() {
    this.style("left",   function(d) {return d.x + "px"})
        .style("top",    function(d) {return d.y + "px"})
        .style("width",  function(d) {return Math.max(0, d.dx - 1) + "px"})
        .style("height", function(d) {return Math.max(0, d.dy - 1) + "px"})
  }
}

/* TODO */
d3sparql.treemapzoom = function(json, config) {
  var tree = d3sparql.tree(json, config)
  var margin = {top: 20, right: 0, bottom: 0, left: 0},
    width = 960,
    height = 500 - margin.top - margin.bottom,
    formatNumber = d3.format(",d"),
    transitioning;

  var x = d3.scale.linear().domain([0, width]).range([0, width])
  var y = d3.scale.linear().domain([0, height]).range([0, height])

  var treemap = d3.layout.treemap()
    .children(function(d, depth) { return depth ? null : d.children; })
    .sort(function(a, b) { return a.value - b.value; })
    .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
    .round(false);

  var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.bottom + margin.top)
    .style("margin-left", -margin.left + "px")
    .style("margin.right", -margin.right + "px")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .style("shape-rendering", "crispEdges");

  var grandparent = svg.append("g")
    .attr("class", "grandparent");

  grandparent.append("rect")
    .attr("y", -margin.top)
    .attr("width", width)
    .attr("height", margin.top);

  grandparent.append("text")
    .attr("x", 6)
    .attr("y", 6 - margin.top)
    .attr("dy", ".75em");

  initialize(tree);
  accumulate(tree);
  layout(tree);
  display(tree);

  function initialize(tree) {
    tree.x = root.y = 0;
    tree.dx = width;
    tree.dy = height;
    tree.depth = 0;
  }

  // Aggregate the values for internal nodes. This is normally done by the
  // treemap layout, but not here because of our custom implementation.
  function accumulate(d) {
    return d.children
        ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
  }

  // Compute the treemap layout recursively such that each group of siblings
  // uses the same size (1×1) rather than the dimensions of the parent cell.
  // This optimizes the layout for the current zoom state. Note that a wrapper
  // object is created for the parent node for each group of siblings so that
  // the parent’s dimensions are not discarded as we recurse. Since each group
  // of sibling was laid out in 1×1, we must rescale to fit using absolute
  // coordinates. This lets us use a viewport to zoom.
  function layout(d) {
    if (d.children) {
      treemap.nodes({children: d.children});
      d.children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        layout(c);
      });
    }
  }

  function display(d) {
    grandparent
      .datum(d.parent)
      .on("click", transition)
      .select("text")
      .text(name(d));

    var g1 = svg.insert("g", ".grandparent")
      .datum(d)
      .attr("class", "depth");

    var g = g1.selectAll("g")
      .data(d.children)
      .enter()
      .append("g");

    g.filter(function(d) { return d.children; })
      .classed("children", true)
      .on("click", transition);

    g.selectAll(".child")
      .data(function(d) { return d.children || [d]; })
      .enter()
      .append("rect")
      .attr("class", "child")
      .call(rect);

    g.append("rect")
      .attr("class", "parent")
      .call(rect)
      .append("title")
      .text(function(d) { return formatNumber(d.value); });

    g.append("text")
      .attr("dy", ".75em")
      .text(function(d) { return d.name; })
      .call(text);

    function transition(d) {
      if (transitioning || !d) return;
      transitioning = true;
      var g2 = display(d),
          t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750);

      // Update the domain only after entering new elements.
      x.domain([d.x, d.x + d.dx]);
      y.domain([d.y, d.y + d.dy]);

      // Enable anti-aliasing during the transition.
      svg.style("shape-rendering", null);

      // Draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

      // Fade-in entering text.
      g2.selectAll("text").style("fill-opacity", 0);

      // Transition to the new view.
      t1.selectAll("text").call(text).style("fill-opacity", 0);
      t2.selectAll("text").call(text).style("fill-opacity", 1);
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);

      // Remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        svg.style("shape-rendering", "crispEdges");
        transitioning = false;
      });
    }

    return g;
  }

  function text(text) {
    text.attr("x", function(d) { return x(d.x) + 6; })
        .attr("y", function(d) { return y(d.y) + 6; });
  }

  function rect(rect) {
    rect.attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y); })
        .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
  }

  function name(d) {
    return d.parent
        ? name(d.parent) + "." + d.name
        : d.name;
  }
}
