function sample1(userid, htmlId) {
  "use strict";
  var templates = {};

  var model = {
    views: [],
    course: {},

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
    },

    loadCourseData: function (subject, catalog) {
      var that = this;
      // getJSON can fail silently.  It may be better (and only slightly more work)
      // to use $.ajax -- or write your own version of getJSON that does not fail silently.
      $.getJSON("https://api.uwaterloo.ca/v2/courses/" + subject + "/" + catalog + ".json?key=d47fe3afb19f506f5a95e89e99527595",
        function (d) {
          if (d.meta.status === 200) {
            that.course = d.data;
            that.updateViews("course");
          } else {
            that.course = {};
            that.updateViews("error");
            console.log("Failed to read course data." + JSON.stringify(d.meta));
          }
        });
    }

  };

  var courseView = {
    updateView: function (msg) {
      var t = "";
      if (msg === "error") {
        t = templates.error;
      } else if (msg === "course") {
        t = Mustache.render(templates.courseD, model);
      }
      $("#sample1_cDescr").html(t);
    },

    initView: function () {
      console.log("Initializing courseView");

      /*
       * Set the controller for the "Go" button.
       * Get the subject and catalog from the input fields and
       * then tell the model to get the corresponding course.
       */
      $("#sample1_search").click(function () {
        var subject = $("#sample1_subject").val();
        var catalog = $("#sample1_catalog").val();
        console.log("Go clicked: " + subject + " " + catalog);
        model.loadCourseData(subject.toLowerCase(), catalog);
        $("#sample1_subject").val("");
        $("#sample1_catalog").val("");
      });
      model.addView(courseView.updateView);
    }
  };


  /*
   * Initialize the widget.
   */
  console.log("Initializing sample1(" + userid + ", " + htmlId + ")");
  portal.loadTemplates("widgets/sample1/templates.json",
    function (t) {
      templates = t;
      $(htmlId).html(templates.baseHtml);
      courseView.initView();
    });
}