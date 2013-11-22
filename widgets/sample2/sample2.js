function sample2(userid, htmlId) {
  "use strict";

  var templates = {};

  var model = {
    bio: {},
    courses: {},
    views: [],

    // Initialize this object
    init: function () {
      console.log("initializing model");
      var that = this;

      // Initialize bio
      $.getJSON("https://cs349.student.cs.uwaterloo.ca:9410/api/v1/student/stdBio/" + userid,
        function (d) {
          console.log(JSON.stringify(d));
          if (d.meta.status === "200 OK") {
            that.bio = d.result;
            that.updateViews("bio");
          } else {
            that.updateViews("error");
          }
        }).fail(function( jqxhr, textStatus, error ) {
        	var err = textStatus + ", " + error;
        	console.log( "Request Failed: " + err );
        });


      // Initialize courses
      $.getJSON("https://cs349.student.cs.uwaterloo.ca:9410/api/v1/student/stdCourseDetails/" + userid,
        function (d) {
          that.courses = d.result;
          that.updateViews("courses");
        }).fail(function( jqxhr, textStatus, error ) {
        	var err = textStatus + ", " + error;
        	console.log( "Request Failed: " + err );
        });
    },

    /**
     * Add a new view to be notified when the model changes.
     */
    addView: function (view) {
      this.views.push(view);
      view("");
    },

    /**
     * Update all of the views that are observing us.
     */
    updateViews: function (msg) {
      var i = 0;
      for (i = 0; i < this.views.length; i++) {
        this.views[i](msg);
      }
    }
  };

  var bioView = {

    updateView: function (msg) {
      console.log("bioView.updateView with msg = " + msg + " bio = " + JSON.stringify(model.bio));
      if (msg === "bio") {
        var name = Mustache.render(templates.bio, model.bio);
        $("#sample2_bio").html(name);
      } else if (msg === "error") {
        $("#sample2_bio").html("Error loading web service data");
      }
    },

    // Initialize this object
    init: function () {
      console.log("initializing bio view");
    }
  };

  var coursesView = {
    updateView: function (msg) {
      //console.log("coursesView.updateView with c = " + JSON.stringify(model.courses));
      if (msg === "courses") {
        var t = Mustache.render(templates.courses, model.courses);
        $("#sample2_courseList").html(t);
      }
    },

    // Initialize this object
    init: function () {
      console.log("initializing coursesView");
    }
  };


  // Initialization
  console.log("Initializing sample2(" + userid + ", " + htmlId + ")");
  portal.loadTemplates("widgets/sample2/templates.json",
    function (t) {
      templates = t;
      $(htmlId).html('<H1 id="sample2_bio"></H1><DIV id="sample2_courseList"></DIV>');
      model.init();
      bioView.init();
      coursesView.init();

      model.addView(bioView.updateView);
      model.addView(coursesView.updateView);
    });

}