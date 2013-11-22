

var portal = {

	/*
	 * loadTemplates:  load templates from an external JSON file.
	 * Put them into the templates object.
	 */
	loadTemplates: function(location, storeTemplates) {
		var templates = [];

		$.getJSON(location,
			function (d) {
				for (var key in d) {
					//console.log(key);
					if (d.hasOwnProperty(key)) {
						if (typeof(d[key]) === 'object') {
							templates[key] = d[key].join("\n");
						} else {
							templates[key] = d[key];
						}
					}
				};
				console.log("templates.load success!" + JSON.stringify(templates));
				storeTemplates(templates);
			}).fail(function() { console.log("error loading templates from " + location)});
	}
}


/*******************
 * Initialization
 *******************/

/**
 * A helper function to create an object with a prototype.
 * Usage:  
 *		var myPrototype = { ... }  // create a prototype, somehow
 *      var myObj = Object.create(myPrototype);
 */
if (typeof Object.create !== 'function') {
	Object.create = function (proto) {
		var f = function () {};
		f.prototype = proto;
		return new f();
	}
}


