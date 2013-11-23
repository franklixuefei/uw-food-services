

function g023(userid, htmlId) {
    var myDiv = $("div" + htmlId); // IMPORTANT: only use in initView function
    var wsServer = "https://api.uwaterloo.ca/v2/";
    var templates = {};
    var curPage = null; // points to current page (model type)

    var utils = {
        getWeekdayString: function() {
            var d=new Date();
            var weekday=new Array(7);
            weekday[0]="sunday";
            weekday[1]="monday";
            weekday[2]="tuesday";
            weekday[3]="wednesday";
            weekday[4]="thursday";
            weekday[5]="friday";
            weekday[6]="saturday";
            return weekday[d.getDay()]; 
        }
    }

    var restaListModel = {
        _viewUpdaters: [], // a list of updateView functions. Only for updating views.
//        _timer: null, // TODO: do a timely reloading data
        //storage variable in the future (each one of this corresponds to one view in this page)
//        _outlets: {},// This object contains a list of all outlets and their unique IDs, 
                     //names and breakfast/lunch/dinner meal service indicators
        _restaInfoWithMenu:[], // This object contains a list of all outlets and their operating hour data and basic info
        _restaInfoWithoutMenu:[],
        _restaMenus:[],
        _restaMenusDateInfo:{},
        /**
		 * Add a new view to be notified when the model changes.
		 */
        
        addViewUpdater: function(view) {
            this._viewUpdaters.push(view);
//            view(""); // also refresh view
        },
		
        /**
		 * Update all of the views that are observing us.
		 */
        updateViews: function(msg) {
            for(i=0; i<this._viewUpdaters.length; i++) {
                this._viewUpdaters[i](msg);
            }
        },
        
        _parseData: function(outletsObj, locationObj, menuObj, callback, that) {
            
            for (var objLocIndex in locationObj) {
                var found = false;
                for (var objMenuIndex in menuObj.outlets) {
                    if (locationObj[objLocIndex].outlet_id === menuObj.outlets[objMenuIndex].outlet_id) { // has menu (no dup)
                        found = true;
                        break;
                    }
                }
                if (found) {
                    if ($.inArray(locationObj[objLocIndex], that._restaInfoWithMenu) === -1) {
                        if (locationObj[objLocIndex].outlet_name !== "UW Food Services Administrative Office") {
                            that._restaInfoWithMenu.push(locationObj[objLocIndex]);
                            console.log("pushed resta: " + locationObj[objLocIndex].outlet_name + " with id " + locationObj[objLocIndex].outlet_id);
                        }
                    }
                } else {
                    if ($.inArray(locationObj[objLocIndex], that._restaInfoWithoutMenu) === -1) {
                        if (locationObj[objLocIndex].outlet_name !== "UW Food Services Administrative Office") {
                            that._restaInfoWithoutMenu.push(locationObj[objLocIndex]);
                            console.log("pushed resta: " + locationObj[objLocIndex].outlet_name + " with id " + locationObj[objLocIndex].outlet_id);
                        }
                    }
                }
            }
            
            for (var withMenuIndex in that._restaInfoWithMenu) {
                for (var objMenuIndex in outletsObj) {
                    if (that._restaInfoWithMenu[withMenuIndex].outlet_id === outletsObj[objMenuIndex].outlet_id) {
                        that._restaInfoWithMenu[withMenuIndex].has_breakfast = outletsObj[objMenuIndex].has_breakfast;
                        that._restaInfoWithMenu[withMenuIndex].has_dinner = outletsObj[objMenuIndex].has_dinner;
                        that._restaInfoWithMenu[withMenuIndex].has_lunch = outletsObj[objMenuIndex].has_lunch;
                        break;
                    }
                }
            }
            
            that._restaInfoWithMenu.sort(function(a, b) {
                return a.outlet_name > b.outlet_name;
            });
            that._restaInfoWithoutMenu.sort(function(a, b) {
                return a.outlet_name > b.outlet_name;
            });

            that.updateViews("");//success
            if (callback) callback();
        },

        loadOutletData: function(callback) { // call only once!!!!
            var that = this;
            // getJSON can fail silently.  It may be better (and only slightly more work)
            // to use $.ajax -- or write your own version of getJSON that does not fail silently.
            var key = {
                "key": "d47fe3afb19f506f5a95e89e99527595"
            };
            var counter = 0;
            var MAX_COUNTER = 3;
            var locationAjaxSuccessObj = [];
            var menuAjaxSuccessObj = [];
            var outletsAjaxSuccessObj = [];
            $.ajax({
                type :'GET',
                url : wsServer + 'foodservices/locations.json',
                data : key,
                dataType : 'json', 
                timeout : 30000,
                success : function(d) {
                    console.log("data retrieved from location&hours API:");
                    console.log(d);
                    if (d.meta.status === 200) {
                        // start retrieving menus
                        locationAjaxSuccessObj = d.data;
                        counter++;
                        if (counter === MAX_COUNTER) {
                            counter = 0;
                            that._parseData(outletsAjaxSuccessObj, locationAjaxSuccessObj, menuAjaxSuccessObj, callback, that);
                        }
                    } else {
                        that._restaInfoWithMenu = [];
                        that._restaInfoWithoutMenu = [];
                        that.updateViews("error");
                    }
                }, 
                error : function(xhr, type){
                    
                }
            });
            
            $.ajax({
                type :'GET',
                url : wsServer + 'foodservices/'+ (new Date()).getFullYear() +'/'+ (new Date()).getWeek() +'/menu.json',
                data : key,
                dataType : 'json', 
                timeout : 30000,
                success : function(j) {
                    console.log("data retrieved from menu API:");
                    console.log(j);
                    if (j.meta.status === 200) {
                        counter++;
                        menuAjaxSuccessObj = j.data;
                        that._restaMenus = j.data.outlets;
                        that._restaMenusDateInfo = j.data.date;
                        if (counter === MAX_COUNTER) {
                            counter = 0;
                            that._parseData(outletsAjaxSuccessObj, locationAjaxSuccessObj, menuAjaxSuccessObj, callback, that);
                        }
                    } else {
//                      _restaInfoWithMenu:[], // This object contains a list of all outlets and their operating hour data and basic info
                        that._restaInfoWithoutMenu = [];
                        that._restaMenus = [];
                        that._restaMenusDateInfo = {};
                        that.updateViews("error");
                    }
                    
                }, 
                error : function(xhr, type){

                }
            });
            
            $.ajax({
                type :'GET',
                url : wsServer + 'foodservices/outlets.json',
                data : key,
                dataType : 'json', 
                timeout : 30000,
                success : function(j) {
                    console.log("data retrieved from outlets API:");
                    console.log(j);
                    if (j.meta.status === 200) {
                        counter++;
                        outletsAjaxSuccessObj = j.data;
                        if (counter === MAX_COUNTER) {
                            counter = 0;
                            that._parseData(outletsAjaxSuccessObj, locationAjaxSuccessObj, menuAjaxSuccessObj, callback, that);
                        }
                    } else {
//                        that._restaInfoWithMenu = [];
//                        that._restaInfoWithoutMenu = [];
                        that.updateViews("error");
                    }
                    
                }, 
                error : function(xhr, type){

                }
            });
            
//            this._timer = setTimeout(function() { // recursion
//                restaListModel.loadOutletData();
//            }, 30*60*1000);
        },
        
        getData: function() {
            var dataObj = new Object();
            
            dataObj.restaInfoWithMenu = this._restaInfoWithMenu;
            dataObj.restaInfoWithoutMenu = this._restaInfoWithoutMenu;
            dataObj.restaMenus = this._restaMenus;
            dataObj.restaMenusDateInfo = this._restaMenusDateInfo;
            return dataObj;
        }
        
//        stopRefresh: function() {
//            clearTimeout(this._timer);
//        }
    }
    
    var restaOfferingsModel = {
        _viewUpdaters: [], // a list of updateView functions. Only for updating views.
        _thisRestaMenu: [],


        initWithRestaInfo: function(restaInfo) {
            this._thisRestaMenu = restaInfo;
        },

        /**
		 * Add a new view to be notified when the model changes.
		 */        
        addViewUpdater: function(view) {
            this._viewUpdaters.push(view);
//            view(""); // also refresh view
        },
		
        /**
		 * Update all of the views that are observing us.
		 */
        updateViews: function(msg) {
            for(i=0; i<this._viewUpdaters.length; i++) {
                this._viewUpdaters[i](msg);
            }
        },
        
        _parseData: function(outlets, callback, that) {
            
            // TODO: combine _thisRestaMenu with outlets
            
            console.log("currentRestaMenu:");
            console.log(this._thisRestaMenu);
            that.updateViews("");//success
            if(callback) callback();
        },

        loadOfferingDetailData: function(callback) { // call only once!!!!
            var that = this;
            // getJSON can fail silently.  It may be better (and only slightly more work)
            // to use $.ajax -- or write your own version of getJSON that does not fail silently.
            var data = {
                "key": "d47fe3afb19f506f5a95e89e99527595" // TODO: also add outlet_id to data.
            }
            
            var counter = 0;
            var MAX_COUNTER = 0;
//            var outletsdAjaxSuccessObj = [];
//                   
            // ajax here if any [remember to change MAX_COUNTER accordingly]
                    
            if (counter === MAX_COUNTER) {
                counter = 0;
                that._parseData([], callback, that);
            }
        },
        
        getData: function() {
            var dataObj = new Object();
            dataObj.currentRestaMenu = this._thisRestaMenu;
            return dataObj;
        }


    }
    
    var offeringDetailModel = {
        
    }
    
    var mapModel = {
        
    }
    
    var navigationController = {
        _pageStack: [], // a list of viewControllers
        /*
         *  create and append a 
         *
         **/
        pushPage: function(page) { // fadein at top
            if (curPage) curPage.fadeOutPage();
            page.fadeInPage(function() {
                curPage = page;
            }); 
            this._pageStack.push(page);
        },
        popPage: function() { // fadeout and remove top
            if (this._pageStack.length === 0) return false; // pop failed
            var poppedPage = this._pageStack.pop();
            curPage = this._pageStack[this._pageStack.length-1];
            curPage.fadeInPage();
            poppedPage.fadeOutPage(function() {
                poppedPage.destroy();
            });
            return true; // pop succeeded
        }
    }
    
    /************************/
    
    var restaListViewController = {
        _views: [], // its view objects
        _model: null, // for the use of navigationController
        _pageWrapper: null, // jQuery Object for page wrapper
//        _timer: null,
        addView: function(view) {
            this._views.push(view);
        },
        
        initViews: function(model, barrierCallback) { // constructor + initializer
            var counter = 0;
            this._model = model;
            this._pageWrapper = $(templates.restaListWrapperHtml);
//            console.log("pageWrapper:");
//            console.log(this._pageWrapper);
            myDiv.append(this._pageWrapper); // init superview
            console.log('here');
            var that = this;
            for (var i = 0; i < this._views.length; ++i) {
                this._views[i].initView(this._pageWrapper, function() {
                    counter++;
                    if (counter === that._views.length) { // all async requests done
                        barrierCallback();
                    }
                }); // init subviews
            }
        },
        
        getModel: function() {
            return this._model;
        },
        
        fadeInPage: function(callback) {
            if (callback) {
                this._pageWrapper.fadeIn(400, callback);
            } else {
                this._pageWrapper.fadeIn(400);
            }
        },
        
        fadeOutPage: function(callback) {
            if (callback) {
                this._pageWrapper.fadeOut(400, callback);
            } else {
                this._pageWrapper.fadeOut(400);
            }
        },
        
        destroy: function() {
            this._pageWrapper.remove();
//            this._model.stopRefresh();
            // clean up work, e.g., this._model.stopRefresh() in which there is a clearTimeout(...), etc
        }
        
        
    }

    var restaListView = { // each view belongs to one model, a model can have many views
        _pageObj: null,
        _generateRestaItem: function(item, type, i) { // return jQuery Obj
            if (type === "menu") {
                var rand = (Math.random()*15-7.5);
                var restaItem = $('<div>').attr('class', 'g023_restaItemWrapper note sticky' + (i%6))
                                    .css('transform', 'rotate('+rand+'deg)')
                                    .css('-moz-transform', 'rotate('+rand+'deg)')
                                    .css('-webkit-transform', 'rotate('+rand+'deg)')
                                    .append($('<div>').attr('class', 'pin'))
                                    .append($('<div>').attr('class', 'g023_restaIconHolder')
                                        .append($('<img>').attr('src', item.logo)
                                    )
                                    .append($("<div>").attr('class', 'g023_restaDetail')
                                        .append($('<span>').html("Today @ "+ item.building +": <br><span style='font-size: 20px;'>" + item.opening_hours[utils.getWeekdayString()].opening_hour 
                                            + ' - ' + item.opening_hours[utils.getWeekdayString()].closing_hour + "</span>"))
                                    )
                                );
                restaItem.bind('click', function() {
                    var restaMenus = restaListModel.getData().restaMenus;
                    var thisRestaOfferings = {};
                    for (var i = 0; i < restaMenus.length; ++i) {
                        if (restaMenus[i].outlet_id === item.outlet_id) {
                            thisRestaOfferings = restaMenus[i];
                            break;
                        }
                    }
                    restaOfferingsModel.initWithRestaInfo(thisRestaOfferings);
                    restaOfferingsViewController.addView(restaOfferingsView);
                    restaOfferingsViewController.initViews(restaListModel, function() {
                        navigationController.pushPage(restaOfferingsViewController);
                    }); // construct viewController and init its views
                    
                });
                return restaItem;
            } else { // TODO: redo this 
                var rand = (Math.random()*15-7.5);
                var restaItem = $('<div>').attr('class', 'g023_restaItemWrapper note sticky' + (i%6))
                                    .css('transform', 'rotate('+rand+'deg)')
                                    .css('-moz-transform', 'rotate('+rand+'deg)')
                                    .css('-webkit-transform', 'rotate('+rand+'deg)')
                                    .append($('<div>').attr('class', 'pin'))
                                    .append($('<div>').attr('class', 'g023_restaIconHolder')
                                        .append($('<img>').attr('src', item.logo)
                                    )
                                    .append($("<div>").attr('class', 'g023_restaDetail')
                                        .append($('<span>').html("Today @ "+ item.building +": <br><span style='font-size: 20px;'>" + item.opening_hours[utils.getWeekdayString()].opening_hour 
                                            + ' - ' + item.opening_hours[utils.getWeekdayString()].closing_hour + "</span>"))
                                    )
                                );
                restaItem.bind('click', function() {
                    var restaMenus = restaListModel.getData().restaMenus;
                    var thisRestaOfferings = {};
                    for (var i = 0; i < restaMenus.length; ++i) {
                        if (restaMenus[i].outlet_id === item.outlet_id) {
                            thisRestaOfferings = restaMenus[i];
                            break;
                        }
                    }
                    restaOfferingsModel.initWithRestaInfo(thisRestaOfferings);
                    restaOfferingsViewController.addView(restaOfferingsView);
                    restaOfferingsViewController.initViews(restaListModel, function() {
                        navigationController.pushPage(restaOfferingsViewController);
                    }); // construct viewController and init its views
                    
                });
                return restaItem;
            }
        },
        
        _generateRestaList: function() {
            var restaInfoWithMenu = restaListModel.getData().restaInfoWithMenu;
            for (var i = 0; i < restaInfoWithMenu.length; ++i) {
                var resta = this._generateRestaItem(restaInfoWithMenu[i], "menu", i);
//                console.log("myDiv");
//                console.log($('#g023').find('#g023_restaListContent'));
                $(this._pageObj).find('.g023_sectionContent#with_menu').append(resta);
            }
            var restaInfoWithoutMenu = restaListModel.getData().restaInfoWithoutMenu;
            for (var i = 0; i < restaInfoWithoutMenu.length; ++i) {
                var resta = this._generateRestaItem(restaInfoWithoutMenu[i], "no_menu", i);
//                console.log("myDiv");
//                console.log($('#g023').find('#g023_restaListContent'));
                $(this._pageObj).find('.g023_sectionContent#without_menu').append(resta);
            }
            
            
        },
        
        
        updateView: function(msg) { // TODO: first remove all restaurants, then add all resta and bind events.
//            var t = ""
//            if (msg === "error") {
//                t = templates.error;
//            } else if (msg === "course") {
//                t = Mustache.render(templates.courseD, model);
//            }
//            $(htmlId + " #cDescr").html(t);
            if (msg === "error") {
                t = templates.restaListError;
            } else {
                // create resta list using restaModel._outlets
                restaListView._generateRestaList();
                console.log("restaListModel Data");
                console.log(restaListModel.getData());
            }
            
        },


        initView: function(pageObj, ajaxDoneCallback) {
            
            this._pageObj = pageObj;
            
            console.log("Initializing restaListView");
            console.log($(templates.restaListBaseHtml));
            
            $(this._pageObj).append(templates.restaListBaseHtml); // loading the base html into DOM
            
            // TODO: FIXME: fix scollLeft displacement
            
            $(this._pageObj).find('.g023_left_arrow.g023_upper_row').bind('click', function() {
                
                $(this._pageObj).find('.g023_overflow_wrapper.g023_overflow_upper').stop().animate({
                    scrollLeft: "-=208px"
                }, 400); 
            });
            
            $(this._pageObj).find('.g023_right_arrow.g023_upper_row').bind('click', function() {
                $(this._pageObj).find('.g023_overflow_wrapper.g023_overflow_upper').stop().animate({
                    scrollLeft: "+=208px"
                }, 400);
            });

            $(this._pageObj).find('.g023_left_arrow.g023_lower_row').bind('click', function() {
                $(this._pageObj).find('.g023_overflow_wrapper.g023_overflow_lower').stop().animate({
                    scrollLeft: "-=208px"
                }, 400);
            });
            
            $(this._pageObj).find('.g023_right_arrow.g023_lower_row').bind('click', function() {
                $(this._pageObj).find('.g023_overflow_wrapper.g023_overflow_lower').stop().animate({
                    scrollLeft: "+=208px"
                }, 400);
            });
            /*
  		 * Set the controller for the "Go" button.
  		 * Get the subject and catalog from the input fields and
  		 * then tell the model to get the corresponding course.
  		 */
            $(this._pageObj).find("#someButton").click(function() { // static button press maybe
//                var subject = $("#subject").val();
//                var catalog = $("#catalog").val();
//                console.log("Go clicked: " + subject + " " + catalog);
////                restaListModel.loadCourseData(subject.toLowerCase(), catalog);
//                $(pageObj).find("#subject").val("");
//                $(pageObj).find("#catalog").val("");
            });
            // TODO: dynamically append all restaurants
            restaListModel.addViewUpdater(restaListView.updateView); // register view updater
            restaListModel.loadOutletData(ajaxDoneCallback); // trigger retrieving data and update views
        }
    }
    
    /************************/
    
    var restaOfferingsViewController = {
        _views: [], // its view objects
        _model: null, // for the use of navigationController
        _pageWrapper: null, // jQuery Object for page wrapper
//        _timer: null,
        addView: function(view) {
            this._views.push(view);
        },
        
        initViews: function(model, barrierCallback) { // constructor + initializer
            var counter = 0;
            this._model = model;
            this._pageWrapper = $(templates.restaOfferingsWrapperHtml);
//            console.log("pageWrapper:");
//            console.log(this._pageWrapper);
            myDiv.append(this._pageWrapper); // init superview
            var that = this;
            for (var i = 0; i < this._views.length; ++i) {
                this._views[i].initView(this._pageWrapper, function() {
                    counter++;
                    if (counter === that._views.length) {
                        counter = 0;
                        barrierCallback();
                    }
                }); // init subviews
            }
        },
        
        getModel: function() {
            return this._model;
        },
        
        fadeInPage: function(callback) {
            if (callback) {
                this._pageWrapper.fadeIn(400, callback);
            } else {
                this._pageWrapper.fadeIn(400);
            }
        },
        
        fadeOutPage: function(callback) {
            if (callback) {
                this._pageWrapper.fadeOut(400, callback);
            } else {
                this._pageWrapper.fadeOut(400);
            }
        },
        
        destroy: function() {
            this._pageWrapper.remove();
            // clean up work, e.g., this._model.stopRefresh() in which there is a clearTimeout(...), etc
        }
        
    }
    
    var restaOfferingsView = {
        _pageObj: null,
        _menuOfDay: {},
        _selectedDay: utils.getWeekdayString(),
        _generateOfferingItem: function(item, type) { // return jQuery Obj
            var rand = (Math.random()*12-6);
            var offeringItem = $('<div>').attr('class', 'g023_offeringItemWrapper note sticky' + (i%6))
                                .css('transform', 'rotate('+rand+'deg)')
                                .css('-moz-transform', 'rotate('+rand+'deg)')
                                .css('-webkit-transform', 'rotate('+rand+'deg)')
                                .append($('<div>').attr('class', 'pin'))
                                .append($('<div>').attr('class', 'g023_offering')
                                    .append($('<span>').text(item.product_name))
                                );
//            restaItem.bind('click', function() {
//                var restaMenus = restaListModel.getData().restaMenus;
//                var thisRestaOfferings = {};
//                for (var i = 0; i < restaMenus.length; ++i) {
//                    if (restaMenus[i].outlet_id === item.outlet_id) {
//                        thisRestaOfferings = restaMenus[i];
//                        break;
//                    }
//                }
//                restaOfferingsModel.initWithRestaInfo(thisRestaOfferings);
//                restaOfferingsViewController.addView(restaOfferingsView);
//                restaOfferingsViewController.initViews(restaListModel, function() {
//                    navigationController.pushPage(restaOfferingsViewController);
//                }); // construct viewController and init its views
//
//            });
            return offeringItem;
        },
        
        _generateOfferingList: function() {
//            if (menuOfDay.day.toLowerCase() !== this._selectedDay) {
//                menuOfDay = {};
//                console.log("restaurant closed today");
//                return;
//            }
            console.log("selectedDay: " + this._selectedDay);
            console.log("menuOfDay: ");
            console.log(this._menuOfDay);
            for (var i = 0; i < this._menuOfDay.meals.lunch.length; ++i) {
                var lunchOffering = this._generateOfferingItem(this._menuOfDay.meals.lunch[i], "lunch");
//                console.log("myDiv");
//                console.log($('#g023').find('#g023_restaListContent'));
                $('#g023_restaOfferingsContent').find('.g023_sectionContent#lunch').append(lunchOffering);
            }
            for (var i = 0; i < this._menuOfDay.meals.dinner.length; ++i) {
                var dinnerOffering = this._generateOfferingItem(this._menuOfDay.meals.dinner[i], "dinner");
//                console.log("myDiv");
//                console.log($('#g023').find('#g023_restaListContent'));
                $(this._pageObj).find('.g023_sectionContent#without_menu').append(dinnerOffering);
            }
              
        },
        
        _handleDayChange: function() { // called when > or < is pressed, and change this._selectedDay
            
        },
        
        _autoSelectDayMenu: function() {
            console.log("menus date info:");
            console.log(restaListModel.getData().restaMenusDateInfo);
            var currentRestaMenu = restaOfferingsModel.getData().currentRestaMenu;
            if (/*dateOfToday is within restaListModel.getData().restaMenusDateInfo.start and end*/1) {
                console.log("today is still within current week"); // TODO: show "This week"
                for (var i = 0; i < currentRestaMenu.menu.length; ++i) { // auto select menu of today
                    this._menuOfDay = currentRestaMenu.menu[i];
                    if (this._menuOfDay.day.toLowerCase() === this._selectedDay) {
                        break;
                    }
                }
            } else { // this week has passed, the menu shows next week or later dates
                console.log("this week has passed, showing menu of later dates"); // TODO: show "Upcoming week" or ("MM/DD - MM/DD" if more than 1 week later)
                this._selectedDay = currentRestaMenu.menu[0].day.toLowerCase();
                this._menuOfDay = currentRestaMenu.menu[0]; // auto select menu of first day of provided range
            }
        },
        
        updateView: function(msg) { // TODO: first remove all restaurants, then add all resta and bind events.
            if (msg === "error") {
                t = templates.restaOfferingsError;
            } else {
                // create resta list using restaModel._outlets
                console.log("restaOfferingsModel Data");
                console.log(restaOfferingsModel.getData());
                restaOfferingsView._autoSelectDayMenu();
                $(restaOfferingsView._pageObj).find('.g023_resta_day').text(restaOfferingsView._selectedDay);
                restaOfferingsView._generateOfferingList();
            }
            
        },


        initView: function(pageObj, ajaxDoneCallback) {
            
            this._pageObj = pageObj;

            console.log("Initializing restaOfferingsView");
            console.log($(templates.restaOfferingsBaseHtml));
            
            $(this._pageObj).append(templates.restaOfferingsBaseHtml); // loading the base html into DOM
            
            $(this._pageObj).find('.g023_resta_name').text(restaOfferingsModel.getData().currentRestaMenu.outlet_name);
            
            // FIXME: fix scrollLeft displacement
            
            $(this._pageObj).find('#g023_restaListWrapper .g023_left_arrow.g023_upper_row').bind('click', function() {
                
                $(this._pageObj).find('.g023_overflow_wrapper.g023_overflow_upper').stop().animate({
                    scrollLeft: "-=208px"
                }, 400); 
            });
            
            $(this._pageObj).find('#g023_restaListWrapper .g023_right_arrow.g023_upper_row').bind('click', function() {
                $(this._pageObj).find('.g023_overflow_wrapper.g023_overflow_upper').stop().animate({
                    scrollLeft: "+=208px"
                }, 400);
            });

            $(this._pageObj).find('#g023_restaListWrapper .g023_left_arrow.g023_lower_row').bind('click', function() {
                $(this._pageObj).find('.g023_overflow_wrapper.g023_overflow_lower').stop().animate({
                    scrollLeft: "-=208px"
                }, 400);
            });
            
            $(this._pageObj).find('#g023_restaListWrapper .g023_right_arrow.g023_lower_row').bind('click', function() {
                $(this._pageObj).find('.g023_overflow_wrapper.g023_overflow_lower').stop().animate({
                    scrollLeft: "+=208px"
                }, 400);
            });
            /*
  		 * Set the controller for the "Go" button.
  		 * Get the subject and catalog from the input fields and
  		 * then tell the model to get the corresponding course.
  		 */
            $(this._pageObj).find("#someButton").click(function() { // static button press maybe
//                var subject = $("#subject").val();
//                var catalog = $("#catalog").val();
//                console.log("Go clicked: " + subject + " " + catalog);
////                restaListModel.loadCourseData(subject.toLowerCase(), catalog);
//                $(pageObj).find("#subject").val("");
//                $(pageObj).find("#catalog").val("");
            });
            // TODO: dynamically append all restaurants
            restaOfferingsModel.addViewUpdater(restaOfferingsView.updateView); // register view updater
            restaOfferingsModel.loadOfferingDetailData(ajaxDoneCallback); // trigger retrieving data and update views
        }
    }
    
    /************************/
    
    var offeringDetailViewController = {
        
    }
    
    var offeringDetailView = {
        
    }
    
    /************************/
    
    var mapViewController = {
        
    }
    
    var mapView = {
        
    }



    /************************
     ************************
     ************************/
    /*
   * Initialize the widget.
   */
    console.log("Initializing sample(" + userid + ", " + htmlId + ")");
    portal.loadTemplates("widgets/g023/templates.json", 
        function(t) {
            templates = t;
            myDiv.append(templates.foodServicesHeaderHtml);
            
            restaListViewController.addView(restaListView);
            restaListViewController.initViews(restaListModel, function() {
                navigationController.pushPage(restaListViewController);
            }); // construct viewController and init its views
            
//            restaOfferingsView.initView();
//            offeringDetailView.initView();
//            mapView.initView();
        });
    if (!Date.prototype.getWeek) {
        Date.prototype.getWeek = function() {
            var onejan = new Date(this.getFullYear(),0,1);
            return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
        }
    }
}