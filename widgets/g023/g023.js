

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
        },
          
        firstLetterCapitalizer: function(str) {
            if (str.length === 0) return str;
            return str[0].toUpperCase() + str.substr(1);
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
            for(var i=0; i<this._viewUpdaters.length; i++) {
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
            for (var withMenuIndex in that._restaInfoWithoutMenu) { // FIXME: for some resta such as Tim Horton's, there is no outlet_id...'
                for (var objMenuIndex in outletsObj) {
                    if (that._restaInfoWithoutMenu[withMenuIndex].outlet_id === outletsObj[objMenuIndex].outlet_id) {
                        that._restaInfoWithoutMenu[withMenuIndex].has_breakfast = outletsObj[objMenuIndex].has_breakfast;
                        that._restaInfoWithoutMenu[withMenuIndex].has_dinner = outletsObj[objMenuIndex].has_dinner;
                        that._restaInfoWithoutMenu[withMenuIndex].has_lunch = outletsObj[objMenuIndex].has_lunch;
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
        _thisRestaInfo: {},

        initWithRestaInfo: function(restaInfo, restaMenu) {
            this._thisRestaInfo = restaInfo;
            this._thisRestaMenu = restaMenu;
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
            for(var i=0; i<this._viewUpdaters.length; i++) {
                this._viewUpdaters[i](msg);
            }
        },
        
        _parseData: function(outlets, callfront, callback, that) {
            
            // TODO: combine _thisRestaMenu with outlets
            
            console.log("currentRestaMenu:");
            console.log(this._thisRestaMenu);
            if (callfront) callfront();
            that.updateViews("");//success
            if (callback) callback();
        },

        loadOfferingDetailData: function(callfront, callback) { // call only once!!!!
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
                that._parseData([], callfront, callback, that);
            }
        },
        
        getData: function() {
            var dataObj = new Object();
            dataObj.currentRestaMenu = this._thisRestaMenu;
            dataObj.currentRestaInfo = this._thisRestaInfo;
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
                if (type === "menu") {
                    var restaMenus = restaListModel.getData().restaMenus;
                    var thisRestaOfferings = {};
                    for (var i = 0; i < restaMenus.length; ++i) {
                        if (restaMenus[i].outlet_id === item.outlet_id) {
                            thisRestaOfferings = restaMenus[i];
                            break;
                        }
                    }
                    restaOfferingsModel.initWithRestaInfo(item, thisRestaOfferings);
                    restaOfferingsViewController.addView(restaOfferingsView);
                    restaOfferingsViewController.initViews(restaListModel, function() {
                        navigationController.pushPage(restaOfferingsViewController);
                    }); // construct viewController and init its views
                } else {
                    // TODO: define behaviour here
                } 
            });
                
            return restaItem;
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
            console.log("1231212312312123");
            console.log($(this._pageObj).find('.g023_overflow_wrapper.g023_overflow_upper'));
            var that = this;
            $(this._pageObj).find('.g023_left_arrow.g023_upper_row').bind('click', function() {
//                alert("working");
                $(that._pageObj).find('.g023_overflow_wrapper.g023_overflow_upper').stop().animate({
                    scrollLeft: "-=208px"
                }, 400); 
            });
            
            $(this._pageObj).find('.g023_right_arrow.g023_upper_row').bind('click', function() {
//                alert("working");
                $(that._pageObj).find('.g023_overflow_wrapper.g023_overflow_upper').stop().animate({
                    scrollLeft: "+=208px"
                }, 400);
            });

            $(this._pageObj).find('.g023_left_arrow.g023_lower_row').bind('click', function() {
                $(that._pageObj).find('.g023_overflow_wrapper.g023_overflow_lower').stop().animate({
                    scrollLeft: "-=208px"
                }, 400);
            });
            
            $(this._pageObj).find('.g023_right_arrow.g023_lower_row').bind('click', function() {
                $(that._pageObj).find('.g023_overflow_wrapper.g023_overflow_lower').stop().animate({
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
        _selectedDayIndex: 0,
        _weekdayArray: [],
        _withinCurrentWeek: false,
        _generateOfferingItem: function(item, type, i) { // return jQuery Obj
            var rand = (Math.random()*12-6);
            var offeringItem = null;
            if (type === "no_lunch" || type === "no_dinner") {
                offeringItem = $('<div>').attr('class', 'g023_offeringItemWrapper note stickyGray')
                                .css('transform', 'rotate('+rand+'deg)')
                                .css('-moz-transform', 'rotate('+rand+'deg)')
                                .css('-webkit-transform', 'rotate('+rand+'deg)')
                                .append($('<div>').attr('class', 'pin'))
                                .append($('<div>').attr('class', 'g023_offering')
                                    .append($('<span class="no_meal">').text(restaOfferingsModel.getData().currentRestaMenu.outlet_name + " does not provide "+ (type==="no_lunch"?"lunch":"dinner") +" on " + this._menuOfDay.day))
                                );
            } else if (type === "lunch_no_detail" || type === "dinner_no_detail") {
                offeringItem = $('<div>').attr('class', 'g023_offeringItemWrapper note stickyBlue')
                                .css('transform', 'rotate('+rand+'deg)')
                                .css('-moz-transform', 'rotate('+rand+'deg)')
                                .css('-webkit-transform', 'rotate('+rand+'deg)')
                                .append($('<div>').attr('class', 'pin'))
                                .append($('<div>').attr('class', 'g023_offering')
                                    .append($('<span class="meal_no_detail">').text(restaOfferingsModel.getData().currentRestaMenu.outlet_name + " provides "+ (type==="lunch_no_detail"?"lunch":"dinner") +" on " + this._menuOfDay.day + ". Go check it out!"))
                                );
            } else {
                offeringItem = $('<div>').attr('class', 'g023_offeringItemWrapper note sticky' + (i%6))
                                .css('transform', 'rotate('+rand+'deg)')
                                .css('-moz-transform', 'rotate('+rand+'deg)')
                                .css('-webkit-transform', 'rotate('+rand+'deg)')
                                .append($('<div>').attr('class', 'pin'))
                                .append($('<div>').attr('class', 'g023_offering')
                                    .append($('<span class="normal">').text(item.product_name))
                                );
            }
            offeringItem.bind('click', function() {
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
            });
            return offeringItem;
        },
        
        _generateOfferingList: function() {
            
            console.log("selectedDay: " + this._selectedDay);
            console.log("menuOfDay: ");
            console.log(this._menuOfDay);
            if (!restaOfferingsModel.getData().currentRestaInfo.has_lunch) {
                var noLunch = this._generateOfferingItem(null, "no_lunch");
                $(this._pageObj).find('.g023_sectionContent#lunch').append(noLunch);
            } else {
                for (var i = 0; i < this._menuOfDay.meals.lunch.length; ++i) {
                    var lunchOffering = this._generateOfferingItem(this._menuOfDay.meals.lunch[i], "lunch", i);
    //                console.log("myDiv");
    //                console.log($('#g023').find('#g023_restaListContent'));
                    $(this._pageObj).find('.g023_sectionContent#lunch').append(lunchOffering);
                }
                if (this._menuOfDay.meals.lunch.length === 0) {
                    var noDetail = this._generateOfferingItem(null, "lunch_no_detail");
                    $(this._pageObj).find('.g023_sectionContent#lunch').append(noDetail);
                }
            }
            if (!restaOfferingsModel.getData().currentRestaInfo.has_dinner) {
                var noDinner = this._generateOfferingItem(null, "no_dinner");
                $(this._pageObj).find('.g023_sectionContent#dinner').append(noDinner);
            } else {
                for (var i = 0; i < this._menuOfDay.meals.dinner.length; ++i) {
                    var dinnerOffering = this._generateOfferingItem(this._menuOfDay.meals.dinner[i], "dinner", i);
    //                console.log("myDiv");
    //                console.log($('#g023').find('#g023_restaListContent'));
                    $(this._pageObj).find('.g023_sectionContent#dinner').append(dinnerOffering);
                }
                if (this._menuOfDay.meals.dinner.length === 0) {
                    var noDetail = this._generateOfferingItem(null, "dinner_no_detail");
                    $(this._pageObj).find('.g023_sectionContent#dinner').append(noDetail);
                }
            }
              
        },
        
        _clearMenu: function() {
            $(this._pageObj).find('.g023_sectionContent').children().remove();
        },
        
        _handleDayChange: function(direction) { // called when > or < is pressed, and change this._selectedDay and this._menuOfDay
            this._clearMenu();
            if (direction) { // right arrow clicked
                this._selectedDayIndex = (this._selectedDayIndex + 1) % this._weekdayArray.length;
            } else { // left arrow clicked
                this._selectedDayIndex = ((this._selectedDayIndex - 1) % this._weekdayArray.length + this._weekdayArray.length) % this._weekdayArray.length;
            }
            this._selectedDay = this._weekdayArray[this._selectedDayIndex];
            this._menuOfDay = restaOfferingsModel.getData().currentRestaMenu.menu[this._selectedDayIndex];
            this.updateView("");
        },
        
        _setWeekdayArray: function(menu) {
//            this._weekdayArray.clear();
            var len = this._weekdayArray.length;
            this._weekdayArray.splice(0,len);
            for (var i = 0; i < menu.length; ++i) {
                this._weekdayArray.push(menu[i].day);
            }
            console.log("weekday array:");
            console.log(this._weekdayArray);
        },
        
        _autoSelectDayMenu: function() {
            console.log("menus date info:");
            console.log(restaListModel.getData().restaMenusDateInfo);
            var currentRestaMenu = restaOfferingsModel.getData().currentRestaMenu;
            var t = (new Date()).getTime();
            var start = (new Date(restaListModel.getData().restaMenusDateInfo.start)).getTimeWithCurrentTimezone();
            var end = (new Date(restaListModel.getData().restaMenusDateInfo.end)).getTimeWithCurrentTimezone() + 24*60*60*1000;
            
            if (t >= start && t < end) {
                console.log("today is still within current week"); // TODO: show "This week"
                for (var i = 0; i < currentRestaMenu.menu.length; ++i) { // auto select menu of today
                    this._menuOfDay = currentRestaMenu.menu[i];
                    if (this._menuOfDay.day.toLowerCase() === this._selectedDay) {
                        this._selectedDayIndex = i;
                        break;
                    }
                }
//                this._selectedDay = this._menuOfDay.day.toLowerCase();
                return true;
            } else { // this week has passed, the menu shows next week or later dates
                console.log("this week has passed, showing menu of later dates"); // TODO: show "Upcoming week" or ("MM/DD - MM/DD" if more than 1 week later)
                this._selectedDay = currentRestaMenu.menu[0].day.toLowerCase();
                this._menuOfDay = currentRestaMenu.menu[0]; // auto select menu of first day of provided range
                this._selectedDayIndex = 0;
                return false;
            }
            console.log("impossible to reach here!!!");
            return false;
        },
        
        updateView: function(msg) { // TODO: first remove all restaurants, then add all resta and bind events.
            if (msg === "error") {
                t = templates.restaOfferingsError;
            } else {
                // create resta list using restaModel._outlets
                console.log("restaOfferingsModel Data");
                console.log(restaOfferingsModel.getData());
                $(restaOfferingsView._pageObj).find('.g023_resta_name').text(restaOfferingsModel.getData().currentRestaMenu.outlet_name);
                console.log("with current week?");
                console.log(restaOfferingsView._withinCurrentWeek);
                $(restaOfferingsView._pageObj).find('.g023_resta_day').text((restaOfferingsView._withinCurrentWeek?"":"next ") + utils.firstLetterCapitalizer(restaOfferingsView._selectedDay));
                restaOfferingsView._generateOfferingList();
            }
            
        },


        initView: function(pageObj, ajaxDoneCallback) {
            
            this._pageObj = pageObj;

            console.log("Initializing restaOfferingsView");
            console.log($(templates.restaOfferingsBaseHtml));
            
            $(this._pageObj).append(templates.restaOfferingsBaseHtml); // loading the base html into DOM
            
            
            // FIXME: fix scrollLeft displacement
            
            var that = this;
            
            $(this._pageObj).find('.g023_left_arrow.g023_upper_row').bind('click', function() {
                
                $(that._pageObj).find('.g023_overflow_wrapper.g023_overflow_upper').stop().animate({
                    scrollLeft: "-=208px"
                }, 400); 
            });
            
            $(this._pageObj).find('.g023_right_arrow.g023_upper_row').bind('click', function() {
                $(that._pageObj).find('.g023_overflow_wrapper.g023_overflow_upper').stop().animate({
                    scrollLeft: "+=208px"
                }, 400);
            });

            $(this._pageObj).find('.g023_left_arrow.g023_lower_row').bind('click', function() {
                $(that._pageObj).find('.g023_overflow_wrapper.g023_overflow_lower').stop().animate({
                    scrollLeft: "-=208px"
                }, 400);
            });
            
            $(this._pageObj).find('.g023_right_arrow.g023_lower_row').bind('click', function() {
                $(that._pageObj).find('.g023_overflow_wrapper.g023_overflow_lower').stop().animate({
                    scrollLeft: "+=208px"
                }, 400);
            });
                /*
  		 * Set the controller for the "Go" button.
  		 * Get the subject and catalog from the input fields and
  		 * then tell the model to get the corresponding course.
  		 */
            $(this._pageObj).find(".g023_selector_arrows#right").click(function() { // static button press maybe
                that._handleDayChange(true);
            });
            $(this._pageObj).find(".g023_selector_arrows#left").click(function() { // static button press maybe
                that._handleDayChange(false);
            });
            // TODO: dynamically append all restaurants
            restaOfferingsModel.addViewUpdater(restaOfferingsView.updateView); // register view updater
            restaOfferingsModel.loadOfferingDetailData(function() { // called before updateView is called
                console.log("callfront");
                that._setWeekdayArray(restaOfferingsModel.getData().currentRestaMenu.menu); // set current week weekdays
                that._withinCurrentWeek = that._autoSelectDayMenu();
            }, ajaxDoneCallback); // trigger retrieving data and update views
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

            var link = document.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.setAttribute('href', 'http://fonts.googleapis.com/css?family=Great+Vibes');
            document.getElementById('g023').appendChild(link);

        });
    if (!Date.prototype.getWeek) {
        Date.prototype.getWeek = function() {
            var onejan = new Date(this.getFullYear(),0,1);
            return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
        }
    }
    if (!Date.prototype.getTimeWithCurrentTimezone) {
        Date.prototype.getTimeWithCurrentTimezone = function() {
            return this.getTime() + this.getTimezoneOffset()*60*1000;
        }
    }

}