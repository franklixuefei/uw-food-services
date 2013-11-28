function g023(userid, htmlId) {
    var myDiv = $("div" + htmlId); // IMPORTANT: only use in initView function
    var wsServer = "https://api.uwaterloo.ca/v2/";
    var templates = {};
    var curPage = null; // points to current page (model type)
    var gMapLoaded = false;
    
    window.g023_gMapInitialize = function() {
        gMapLoaded = true;
    }
    
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
        },
        
        showAlert: function(parentView, title, content, buttonText) {
            var alertHtml = $(templates.alertHtml);
            var mask = $('<div>').attr('class','g023_mask g023_restaList');
            $(parentView).append(mask);
            $(parentView).append(alertHtml);
            alertHtml.find('.g023_alert_header').text(title);
            alertHtml.find('.g023_alert_content').text(content);
            alertHtml.find('button').text(buttonText)
                .bind('click', function() {
                    alertHtml.fadeOut(300, function() {
                        $(this).remove();
                    });
                    mask.fadeOut(300, function() {
                        $(this).remove();
                    });
                });
            
        }
        
    }

    var restaListModel = {
        _viewUpdaters: [], // a list of updateView functions. Only for updating views.
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
                        
            this._restaMenus = menuObj.outlets;
            this._restaMenusDateInfo = menuObj.date;
                        
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
            if (menuObj.outlets.length === 0) { // vacations
                that.updateViews("vacation");//success
            } else {
                that.updateViews("");//success
            }
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
        _viewUpdaters: [], // a list of updateView functions. Only for updating views.
        _thisProdInfo: {},

        initWithProdInfo: function(prodInfo) {
            this._thisProdInfo = prodInfo;
        },
        
        /**
		 * Add a new view to be notified when the model changes.
		 */        
        addViewUpdater: function(view) {
            this._viewUpdaters.push(view);
        },
		
        /**
		 * Update all of the views that are observing us.
		 */
        updateViews: function(msg) {
            for(var i=0; i<this._viewUpdaters.length; i++) {
                this._viewUpdaters[i](msg);
            }
        },
        
        _parseData: function(productObj, callback, that) {
            for (var property in productObj) {
                if (!productObj[property]) {
                    this._thisProdInfo[property] = 0;
                } else {
                    this._thisProdInfo[property] = productObj[property];
                }
            }
//            this._thisProdInfo = productObj;
            console.log("currentProdInfo:");
            console.log(this._thisProdInfo);
            that.updateViews("");//success
            if (callback) callback();
        },

        loadProdData: function(callback) { // call only once!!!!
            var that = this;
            // getJSON can fail silently.  It may be better (and only slightly more work)
            // to use $.ajax -- or write your own version of getJSON that does not fail silently.
            var data = {
                "key": "d47fe3afb19f506f5a95e89e99527595" // TODO: also add outlet_id to data.
            }
            
            var productAjaxSuccessObj = {};
            
            var counter = 0;
            var MAX_COUNTER = 1;
//            var outletsdAjaxSuccessObj = [];
//                   
            // ajax here if any [remember to change MAX_COUNTER accordingly]
            $.ajax({
                type :'GET',
                url : wsServer + 'foodservices/products/'+ this._thisProdInfo.product_id +'.json',
                data : data,
                dataType : 'json', 
                timeout : 30000,
                success : function(j) {
                    console.log("data retrieved from product API:");
                    console.log(j);
                    if (j.meta.status === 200) {
                        counter++;
                        productAjaxSuccessObj = j.data;
                        if (counter === MAX_COUNTER) {
                            counter = 0;
                            that._parseData(productAjaxSuccessObj, callback, that);
                        }
                    } else {
                        that.updateViews("error");
                    }
                    
                }, 
                error : function(xhr, type){
                    
                }
            });
            
        },
        
        getData: function() {
            var dataObj = new Object();
            dataObj.currentProdInfo = this._thisProdInfo;
            return dataObj;
        }
        
        
        
    }
    
    var restaMapModel = {
        _viewUpdaters: [], // a list of updateView functions. Only for updating views.
        _thisRestaInfo: {},
//        _dest: null,

        initWithRestaInfo: function(restaInfo) {
            this._thisRestaInfo = restaInfo;
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
        
        _parseData: function(callback, that) {
            
            // TODO: combine _thisRestaMenu with outlets
            
            console.log("currentRestaInfo:");
            console.log(this._thisRestaInfo);
//            this._dest = new google.maps.LatLng(this._thisRestaInfo.latitude, this._thisRestaInfo.longitude);
            that.updateViews("");//success
            if (callback) callback();
        },

        loadMapData: function(callback) { // call only once!!!!
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
                that._parseData(callback, that);
            }
        },
        
        getData: function() {
            var dataObj = new Object();
            dataObj.currentRestaInfo = this._thisRestaInfo;
//            dataObj.dest = this._dest;
            return dataObj;
        }
        
        
        
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
            if (this._pageStack.length > 1) {
                $('#g023').find('.back').fadeIn(400);
            } else {
                $('#g023').find('.back').fadeOut(400);
            }
        },
        popPage: function() { // fadeout and remove top
            if (this._pageStack.length === 1) return false; // pop failed
            var poppedPage = this._pageStack.pop();
            curPage = this._pageStack[this._pageStack.length-1];
            curPage.fadeInPage();
            poppedPage.fadeOutPage(function() {
                poppedPage.destroy();
            });
            if (this._pageStack.length > 1) {
                $('#g023').find('.back').fadeIn(400);
            } else {
                $('#g023').find('.back').fadeOut(400);
            }
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

            if (msg === "error") {
                t = templates.restaListError;
            } else if (msg === "vacation") {
                console.log("VACATION TIME!!!!");
                var restaInfoWithoutMenu = restaListModel.getData().restaInfoWithoutMenu;
                var restasWrapper = $('<div>').attr('class', 'g023_vacation_restas_wrapper');
                $(restaListView._pageObj).find('#g023_restaListContent').children().remove();
                $(restaListView._pageObj).find('#g023_restaListContent').append(restasWrapper);
                for (var i = 0; i < restaInfoWithoutMenu.length; ++i) {
                    var resta = restaListView._generateRestaItem(restaInfoWithoutMenu[i], "no_menu", i);
                    restasWrapper.append(resta);
                }
                var contentString = "School is closed due to vacation or holidays. But feel free to explore all restaurants!";
                utils.showAlert(restaListView._pageObj, "Notice", contentString, "OK");
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
            restaListModel.addViewUpdater(this.updateView); // register view updater
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
        height: 0,
        toggle: false,
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
                console.log('product clicked:');
                console.log(item);
                if (item.product_id) {
                    offeringDetailModel.initWithProdInfo(item);
                    offeringDetailViewController.addView(offeringDetailView);
                    offeringDetailViewController.initViews(offeringDetailModel, function() {
                        navigationController.pushPage(offeringDetailViewController);
                    }); 
                } else {
                    // degrade
                }
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
                if (restaOfferingsView._menuOfDay.notes) {
                    $(restaOfferingsView._pageObj).find('.g023_info_content').find('.g023_notes').show();
                    $(restaOfferingsView._pageObj).find('.g023_info_content').find('.g023_notes').html(restaOfferingsView._menuOfDay.notes);
                } else {
                    $(restaOfferingsView._pageObj).find('.g023_info_content').find('.g023_notes').hide();
                }
                console.log("with current week?");
                console.log(restaOfferingsView._withinCurrentWeek);
                $(restaOfferingsView._pageObj).find('.g023_resta_day').text((restaOfferingsView._withinCurrentWeek?"":"next ") + utils.firstLetterCapitalizer(restaOfferingsView._selectedDay));
                restaOfferingsView._generateOfferingList();
                
                restaOfferingsView.toggle = false;
                restaOfferingsView.height = $(restaOfferingsView._pageObj).find('.g023_info.note').height();
                $(restaOfferingsView._pageObj).find('.g023_info_wrapper').css('top', 25 - (10+restaOfferingsView.height));
                
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
            
            $(this._pageObj).find(".g023_info_handle").click(function() {
                if (!that.toggle) {
                    $(that._pageObj).find('.g023_info_wrapper').css('top', 25);
                } else {
                    $(that._pageObj).find('.g023_info_wrapper').css('top', 25 - (10+that.height));
                }
                that.toggle = !that.toggle;
            });
            $(this._pageObj).click(function(e) {
                if (that.toggle) {
                    if (e.target.className.indexOf("g023_desc") === -1 && e.target.className.indexOf("g023_notes") === -1 && e.target.className.indexOf("g023_notice") === -1 && e.target.className.indexOf("g023_special_hours") === -1 && e.target.className.indexOf("g023_dates_closed") === -1 && e.target.className.indexOf("g023_info_handle") === -1) {
                        $(that._pageObj).find('.g023_info_wrapper').css('top', 25 - (10+that.height));
                        that.toggle = false;
                    }
                }
            });
            
            // TODO: dynamically append all restaurants
            restaOfferingsModel.addViewUpdater(this.updateView); // register view updater
            restaOfferingsModel.loadOfferingDetailData(function() { // called before updateView is called and after data are ready
                console.log("callfront");
                that._setWeekdayArray(restaOfferingsModel.getData().currentRestaMenu.menu); // set current week weekdays
                that._withinCurrentWeek = that._autoSelectDayMenu();
                $(that._pageObj).find('.g023_info_content').find('.g023_desc').html(restaOfferingsModel.getData().currentRestaInfo.description);
                var notice = restaOfferingsModel.getData().currentRestaInfo.notice;
                if (notice) {
                    $(that._pageObj).find('.g023_info_content').find('.g023_notice').show();
                    $(that._pageObj).find('.g023_info_content').find('.g023_notice').html(notice);
                } else {
                    $(that._pageObj).find('.g023_info_content').find('.g023_notice').hide();
                }
                var special_hours = restaOfferingsModel.getData().currentRestaInfo.special_hours;
                if (special_hours.length) {
                    $(that._pageObj).find('.g023_info_content').find('.g023_special_hours').show();
                    $(that._pageObj).find('.g023_info_content').find('.g023_special_hours').append($('<div>').attr('class', 'g023_special_hours_title').text('Special Hours:'));
                    for (var i = 0; i < special_hours.length; ++i) {
                        var special_hour = $('<div>').attr('class', 'g023_special_hour').text(special_hours[i].opening_hour + ' - ' + special_hours[i].closing_hour + ' @ ' + special_hours[i].date);
                        $(that._pageObj).find('.g023_info_content').find('.g023_special_hours').append(special_hour);
                    }
                } else {
                    $(that._pageObj).find('.g023_info_content').find('.g023_special_hours').hide();
                }
                var dates_closed = restaOfferingsModel.getData().currentRestaInfo.dates_closed;
                if (dates_closed.length) {
                    $(that._pageObj).find('.g023_info_content').find('.g023_dates_closed').show();
                    $(that._pageObj).find('.g023_info_content').find('.g023_dates_closed').append($('<div>').attr('class', 'g023_dates_closed_title').text('Dates Closed:'));
                    for (var i = 0; i < dates_closed.length; ++i) {
                        if (!dates_closed[i]) continue;
                        var date_closed = $('<div>').attr('class', 'g023_date_closed').text(dates_closed[i]);
                        $(that._pageObj).find('.g023_info_content').find('.g023_dates_closed').append(date_closed);
                    }
                } else {
                    $(that._pageObj).find('.g023_info_content').find('.g023_dates_closed').hide();
                }
                setTimeout(function() {
                    that.height = $(that._pageObj).find('.g023_info.note').height();
                    $(that._pageObj).find('.g023_info_wrapper').css('top', 25 - (10+that.height));
                });
                
                $(that._pageObj).find("#mapit").click(function() {
                    console.log("Map It! clicked!");
                    if (!gMapLoaded) {
                        utils.showAlert(that._pageObj, "Error", "Google API has not been fully loaded. Please try again later.", "OK");
                        return false;
                    }
                    restaMapModel.initWithRestaInfo(restaOfferingsModel.getData().currentRestaInfo);
                    restaMapViewController.addView(restaMapView);
                    restaMapViewController.initViews(restaMapModel, function() {
                        navigationController.pushPage(restaMapViewController);
                    }); // construct viewController and init its views
                });
                
            }, ajaxDoneCallback); // trigger retrieving data and update views
        }
    }
    
    /************************/
    
    var offeringDetailViewController = {
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
            this._pageWrapper = $(templates.restaProdWrapperHtml);
            myDiv.append(this._pageWrapper); // init superview
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
        }
    }
    
    
    var offeringDetailView = {
        _pageObj: null,
        
        updateView: function(msg) { // TODO: first remove all restaurants, then add all resta and bind events.

            if (msg === "error") {
                
            } else {
                // create resta list using restaModel._outlets
                console.log("offeringDetailModel Data");
                console.log(offeringDetailModel.getData());
                
                // append value facts and ingredient and food kind here
                var renderedHtml = Mustache.render(templates.valueFact, offeringDetailModel.getData());
                $(offeringDetailView._pageObj).find('#g023_restaProdContent').append(renderedHtml);
            }
            
        },


        initView: function(pageObj, ajaxDoneCallback) {
            
            this._pageObj = pageObj;
            
            console.log("Initializing offeringDetailView");
            console.log($(templates.restaProdBaseHtml));
            
            $(this._pageObj).append(templates.restaProdBaseHtml); // loading the base html into DOM
            
            var that = this;
            
            $(this._pageObj).find("#someButton").click(function() { // static button press maybe
                
            });
            // TODO: dynamically append all restaurants
            offeringDetailModel.addViewUpdater(this.updateView); // register view updater
            offeringDetailModel.loadProdData(ajaxDoneCallback); // trigger retrieving data and update views
        }
    }
    
    /************************/
    
    var restaMapViewController = {
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
            this._pageWrapper = $(templates.restaMapWrapperHtml);
//            console.log("pageWrapper:");
            myDiv.append(this._pageWrapper); // init superview
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
    
    var restaMapView = {
        _pageObj: null,
        
        updateView: function(msg) { // TODO: first remove all restaurants, then add all resta and bind events.

            if (msg === "error") {
                
            } else {
                // create resta list using restaModel._outlets
                console.log("restaMapModel Data");
                console.log(restaMapModel.getData());
                
                var latitude = restaMapModel.getData().currentRestaInfo.latitude;
                var longitude = restaMapModel.getData().currentRestaInfo.longitude;
                var dest = new google.maps.LatLng(latitude, longitude);
                // init google map
                var mapOptions = {
                    zoom: 18,
                    center: dest
                };

                var map = new google.maps.Map(document.getElementById('g023_mapCanvas'), mapOptions);

                var marker = new google.maps.Marker({
                    map:map,
                    position: dest,
                    title: restaMapModel.getData().currentRestaInfo.outlet_name
                });
                var contentString = '<div id="content">'+
                    '<div id="siteNotice">'+
                    '</div>'+
                    '<h3 id="firstHeading" class="firstHeading">'+ restaMapModel.getData().currentRestaInfo.outlet_name +'</h1>'+
                    '<div id="bodyContent">'+
                    '<img src="'+restaMapModel.getData().currentRestaInfo.logo+'" style="display:inline-block;"/>'+
                    '<p style="display: inline-block; margin-left: 30px; max-width: 444px;">' + restaMapModel.getData().currentRestaInfo.description + '</p>'
                    '</div>'+
                    '</div>';

                var infowindow = new google.maps.InfoWindow({
                    content: contentString
                });

                google.maps.event.addListener(marker, 'click', function() {
                    infowindow.open(map,marker);
                });

            }
            
        },


        initView: function(pageObj, ajaxDoneCallback) {
            
            this._pageObj = pageObj;
            
            console.log("Initializing restaMapView");
            console.log($(templates.restaMapBaseHtml));
            
            $(this._pageObj).append(templates.restaMapBaseHtml); // loading the base html into DOM
            
            var that = this;
            
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
            restaMapModel.addViewUpdater(this.updateView); // register view updater
            restaMapModel.loadMapData(ajaxDoneCallback); // trigger retrieving data and update views
        }
    }

    console.log("Initializing sample(" + userid + ", " + htmlId + ")");
    portal.loadTemplates("widgets/g023/templates.json", 
        function(t) {
            templates = t;
            myDiv.append(templates.foodServicesHeaderHtml);
            $('#g023').find('.back').bind('click', function() {
                navigationController.popPage();
            });
            restaListViewController.addView(restaListView);
            restaListViewController.initViews(restaListModel, function() {
                navigationController.pushPage(restaListViewController);
            }); // construct viewController and init its views
            
            // appending font css
            var link = document.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.setAttribute('href', 'https://fonts.googleapis.com/css?family=Great+Vibes');
            document.getElementById('g023').appendChild(link);
            // appending google map API
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyDexCumNi0oj_HqehCixRwTfl-Ae2EIC8A&sensor=false&callback=g023_gMapInitialize";
            document.getElementById('g023').appendChild(script);
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